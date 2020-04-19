//Estas funcione devolveran funciones.
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('No document with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //Esto hace que se devuelva el doc pero ya actualizado.
      runValidators: true
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        doc // no necesito poner doc: doc porque gracias a ES6 entiende solo con poner el atributo si el objeto tiene el mismo nombre
      }
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    //Hay dos formas de crear documentos con mongoose y mongodb
    //1) const newTour= new Tour(req.body);
    //   newTour.save();
    //2)
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc
      }
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: doc
    });
  });

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    // Esto solo es para get All Reviews
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    //EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query) //Tour.find() devuelve el query desde mongoose.
      .filter() // cada uno devuelve el obj APIFeatures con el cual se pueden volver a usar los metodos
      .sort()
      .limitFields()
      .paginate();

    // const docs = await features.query.explain();
    const docs = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        docs
      }
    });
  });
