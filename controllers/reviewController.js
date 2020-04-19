const Review = require('./../models/reviewModel');
const factory = require('./handlerfactory');

exports.setTourUserIds = (req, res, next) => {
  //midleware que correra antes de que se llame a create Review
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id; // Viene del middleware protect
  next();
};

exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);

exports.getAllReviews = factory.getAll(Review);
