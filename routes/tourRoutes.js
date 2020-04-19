const express = require('express');
const authController = require('./../controllers/authController');
const tourController = require('./../controllers/tourController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

// Eto era para usar el middleware
// router.param('id', tourController.checkId); // ese parametro id se puede leer en el middleware gracias al parametro val

router.use('/:tourId/reviews', reviewRouter); // Cuando llegue un peticion a este route, lo atiende es la clase reviewRouter

router
  .route('/top-5-rating')
  .get(tourController.aliasTopTours, tourController.getAllTours); //  el primero es el middleware, el segundo es el metodo que lo busca en la bd

router.route('/stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// tours-distance?distance=233&center=-40,45&unit=mi
// tours-within/233/center/40,45/unit/mi mas bonito

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  //           middleware               funcion
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect, // Se verifica que el JWT sea el correcto
    authController.restrictTo('admin', 'lead-guide'), //Se verifica el rol del usuario
    tourController.deleteTour
  );

module.exports = router;
