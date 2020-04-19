const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerfactory');
const AppError = require('./../utils/appError');

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  // Verificando si lo que envian es una imagen
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload onl images', 404), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});
// upload.single('') req.file
// upload.array('images', 5) req.files

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  //1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // 3/2 ratio, comun en images
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  //2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpg`;
      await sharp(file.buffer)
        .resize(2000, 1333) // 3/2 ratio, comun en images
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );

  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } } // muestro solos los que tengan el ratingsAverage mayor o igual a 4.5
    },
    {
      $group: {
        //_id: null,
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 } // PONGO AVGPRICE porque esa es la caracteristica que pusimos en el group.
      // El uno significa ordenar avg de forma ascendente
    }
    //  {
    //    $match:{_id: {$ne: 'EASY'}} // Ya tenemos que el id es la dificultad, ahora queremos que se
    // muestren todos menos los que tengan dificultad easy.
    //  }
  ]);
  res.status(200).json({
    status: 'success',
    data: stats
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 } // descendiente
    },
    {
      $limit: 60 // solo por ponerlo, no tiene mucho sentido aqui
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: plan
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // Calculamos las distancia dada por el user pero en radios.
  // Si es metros o si es km
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitud and longitude in the format lat,lng',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // acepta miles or km
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitud and longitude in the format lat,lng',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          // punto desde el cual se quiere tomar las distancias
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: {
      data: distances
    }
  });
});
/*Esto lo usamos cuando estabamos aprendiendo los metodos de moongose

exports.getAllTours = async (req, res) => {
  try {
    // BUILD QUERY
    // 1A) Filtering
    // const queryObj = { ...req.query };
    // const excludedFields = ['page', 'sort', 'limit', 'fields'];
    // excludedFields.forEach(el => delete queryObj[el]);

    // // 1B) Advanced filtering
    // let queryStr = JSON.stringify(queryObj);
    // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    // let query = Tour.find(JSON.parse(queryStr));

    //2) Sorting
    // if (req.query.sort) {
    //   const sortby = req.query.sort.split(',').join(' ');
    //   query = query.sort(sortby);
    // }

    //3) Fields limiting
    // if (req.query.fields) {
    //   const fields = req.query.fields.split(',').join(' ');
    //   query.select(fields);
    // } else {
    //   query.select('-__v');
    // }

    //4) Pagination
    // const page = req.query.page * 1 || 1; // Es como una forma de poner que si el cliente no indica la pagina, se ponga la numero 1
    // const limit = req.query.limit * 1 || 100; // Si no tiene limit, se coloca 100
    // const skip = (page - 1) * limit;

    // query = query.skip(skip).limit(limit);

    // // En el caso de que lleguemos a una pagina vacia:
    // if (req.query.page) {
    //   const numTours = await Tour.countDocuments();
    //   if (skip >= numTours) throw new Error('This page does not exist.');
    // }

    //EXECUTE QUERY
    const tours = await query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed',
      message: err
    });
  }
};*/
/* Esto lo necesitabamos cuando leiamos del archivo para buscar la info
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
);*/

/*
Este middleware los usabamos para verificar el id colocado por el cliente 
pero como ahora usamos mongodb, el mismo se encarga de eso.
// Param middleware
exports.checkId = (req, res, next, val) => {
  console.log(`El id es: ${val}`);
  if (req.params.id * 1 > tours.length) {
    //Verificamos si hay error
    return res.status(404).json({
      status: 'failed',
      message: 'Invalid ID'
    });
  }
  next();
};*/

// Todo lo que sigue fue usado con la info que venia del archivo.
/*


exports.ckeckBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'failed',
      message: 'Missing name or price'
    });
  }
  next();
};

exports.getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    requestedAt: req.requestTime,
    //  results: tours.length,
    data: tours
  });
};

exports.getTour = (req, res) => {
  const id = req.params.id * 1; // si tenemos un string que es un numero, al multiplicarlo por
  // 1 se convertira el string  automaticamente en un numero.

  const tour = tours.find(el => el.id === id);
  res.status(200).json({
    status: 'success',
    data: tour
  });
};

exports.createTour = (req, res) => {
  const newId = tours[tours.length - 1].id + 1;
  const newTour = Object.assign({ id: newId }, req.body); // Le agregamos el id al objeto que devuelve el request

  tours.push(newTour); // Agregamos el nuevo elemento al array de los tours

  // JSON.stringify nos permite cambiar a json el objeto tours
  fs.writeFile(
    // este metodo tiene que ser ajuro a
    `${__dirname}/../dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    err => {
      res.status(201).json({
        status: 'success',
        data: {
          tours: newTour
        }
      });
    }
  );
};

exports.updateTour = (req, res) => {
  const id = req.params.id * 1;

  const tour = tours.find(el => el.id === id);
  res.status(200).json({
    // no lo actualizamos de verdad por flojera
    status: 'success',
    data: {
      tour: '<Updated tour here..>'
    }
  });
};

exports.deleteTour = (req, res) => {
  const id = req.params.id * 1;

  const tours2 = tours.splice(id, 1);

  fs.writeFile(
    // este metodo tiene que ser ajuro a
    `${__dirname}/../dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    err => {
      res.status(204).json({
        status: 'success',
        data: {
          tours: null
        }
      });
    }
  );
};
*/
