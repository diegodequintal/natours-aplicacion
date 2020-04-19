const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const GlobalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
// GLOBAL MIDDLEWWARE

//--Serving static files
app.use(express.static(path.join(__dirname, 'public')));

//--Set security http headers --//
app.use(helmet());

//--Development logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

//-- Limit requests for same IP address
const limiter = rateLimit({
  max: 100, // cantidad de request, depende de nuestra app
  windowMs: 60 * 60 * 1000, // tiempo en el que no se puede pasar del max
  message: 'Too many requests from this Ip. Try again in an hour.'
});

app.use('/api', limiter);

//--Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

//-- Data sanitization against NoSQL query injections
app.use(mongoSanitize()); // remueve los signos $

//-- Data sanitization against XSS
app.use(xss()); // Elimina malicious http code inyected in our javascript

//-- Prevent Parameter pollution:
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

app.use(compression());

//Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //console.log(req.headers); asi mostramos los headers
  next(); // Es muy importante usar el next porque si no el req res cycle no termina nunca
});

// 2) Routes handler

//app.get('/api/v1/tours', getAllTours);
//app.get('/api/v1/tours/:id', getTour);
//app.post('/api/v1/tours', createTour);
//app.patch('/api/v1/tours/:id', updateTour);
//app.delete('/api/v1/tours/:id', deleteTour);

// 3) Routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter); // Este es el middleware
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Si llega una solicitud con un route diferente a los de arriba, chocaria al siguiente:
app.all('*', (req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.statusCode = 404;
  // err.status = 'fail';

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404)); // asi llamamos al error handling middleware
});

app.use(GlobalErrorHandler);

module.exports = app;
