const crypto = require('crypto');
const { promisify } = require('util'); // esto es lo mismo que util.promisify
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('../utils/Email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    // {id} es igual a {id: id}
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id); // Recuerda que en mongoDB el id es _id

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000 // de dias a milisegundos
    ),
    httpOnly: true // La cookie no puede ser accedida ni modificada por el browser de ninguna forma
  };

  user.password = undefined; // esto solo hace que no salga en el output, pero no modifica la bd
  //secure: true, la cookie solo sera enviada en un conexion encriptada = https

  // if (process.env.NODE_ENV === 'production')  NO FUNCIONA AHORITA
  //   cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token: token,
    data: {
      user
    }
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  // console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; // esto es igual a decir email = req.body.email y password = req.body.password

  // Verificar que el user haya colocado el email y la contra
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  // Verificar que el usuario exista y la clave le pertenezca
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // Si todo esta bien, se envia el token al cliente
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggeout', {
    expires: new Date(Date.now() + 10 * 1000), // 10 s
    httpOnly: true
  });

  res.status(200).json({
    status: 'success'
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Obtener el token y checkear si esta si esta alli
  let token;
  if (  //Para la API
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) { //Para la Web
    token = req.cookies.jwt;
  }

  if (!token)
    return next(
      new AppError('You are not logged in. Please log in to get access', 401)
    );

  //2) Verificar si el token no ha sido modificado por un tercero
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // los errores que sales aqui llegan a la clase app, en donde se llama al globarErrors que llama a la clase ErrorController

  // 3) Verificar si el usaurio aun existen
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError(
        'The user belonging to this token does not longer exist',
        401
      )
    );
  //4) Verificar si el usuario ha cambiado despues de que el token haya sido recibido
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed the password. Please log in again',
        401
      )
    );
  }
  // Guardar el usuario para proximos usos
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1) Verificar si el token no ha sido modificado por un tercero

      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 3) Verificar si el usaurio aun existen
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();

      if (currentUser.changedPasswordAfter(decoded.iat)) return next();

      // Guardar el usuario para proximos usos
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
exports.restrictTo = (...roles) => {
  // ...roles: lo que hace es agarrar todos los parametros que le pasan y ponerlos en un array
  return (req, res, next) => {
    //Este seria el middleware
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)Buscar el usuario con el email dado
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    next(new AppError('There is no user with this email', 404));
  }

  //2) Crear token ramdon
  const resetToken = user.createPasswordResetToken();
  user.save({ validateBeforeSave: false });

  //3) Enviar al correo del usuario

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Your password reset token has been sent'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later.',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Encontrar el usuario con el token enviado al email
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2)Verificar que el token no ha expirado
  if (!user) {
    return next(new AppError('Token invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Modificar el campo de passwordChangedAt del schema --> en el middleware save
  // 4) Log in al usuario

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Consiguir el usuario desde la bd
  const user = await await User.findById(req.user.id).select('+password'); // tenemos que ponerlo asi porque esta que no salga en el output

  //2) Verificar que la contra es correcta
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Invalid password. Try again.', 401));
  }

  //3) Actualizar la contra
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); // Si usamos findOneAndUpdate no funciona, por eso hay que usar save

  //4) Log user in, send JWT
  createSendToken(user, 200, res);
});
