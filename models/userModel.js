const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us tour name']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email address'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minlength: [8, 'the password must be longer than 8 characters'],
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // El "this" solo funciona si se aplica el SAVE()
      validator: function(value) {
        //No puede ser un arrow function xq si no no podemos usar el "this"
        return value === this.password; // Retorna true si las contra son iguales
      },
      message: 'The passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

// documents middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;

  next();
});

// Query MIDDLEWARE

userSchema.pre(/^find/, function(next) {
  //"This" apunta al document de ahorita
  this.find({ active: { $ne: false } });
  next();
});

// Instance methods --------------------------------

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  // Como nosotros colocamos a password como select:false, no podemos usar aqui this.password
  return await bcrypt.compare(candidatePassword, userPassword); // retornara true si ambas contras son iguales
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp; // Retorna true si la fecha que la cambio es mayor a la que ingreso
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min a partir de este momento
  return resetToken;
};

const User = mongoose.model('User', userSchema);
// La convencion dice que los modelos se escriben con la primera letra en mayuscula
module.exports = User;
