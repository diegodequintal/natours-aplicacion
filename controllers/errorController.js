const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400); // Creo mi propio error
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value:${value}. Please use another value `;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJsonWebToken = () => {
  return new AppError('Invalid token. Please log in again', 401);
};

const handleExpiredToken = () => {
  return new AppError('Token has expired. Please log in again', 401);
};

const sendErrorDev = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
    // Rendering  webside
  }

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith('/api')) {
    // Si es un error Operacional, el cliente ve el mensaje
    if (err.isOperational) {
      // console.log('este es el mensaje', err.message);
      return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message
      });
      // Si es un error del programador, el cliente debe ver un mensaje generico y solo mostramos el error por consola
    }

    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
  // Rendering side
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      msg: err.message
    });
  }

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: 'Please try again later'
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Si hay un error de la BD de CastError (campo invalido)
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJsonWebToken();
    if (error.name === 'TokenExpiredError') error = handleExpiredToken();

    sendErrorProd(error, req, res);
  }
};
