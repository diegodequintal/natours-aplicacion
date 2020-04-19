const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

const tourSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      minLength: [10, 'A tour must have more or equal than 10 characters'],
      maxLength: [40, 'A tour must have less or equal then 40 characters']
      //validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a max group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      max: [5, 'Rating must be below 5.0'],
      min: [1, 'Rating must be above 1'],
      set: val => Math.round(val * 10) / 7 // Para redondear el resultado
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        // Ojo: en este caso "this" solo accede al actual doc si se esta creando uno nuevo, si se actualiza no.
        validator: function(val) {
          return val < this.price; // Retorna true si el descuento es menor al precio, sino manda el error
        },
        message: 'Discount price ({VALUE}) should be below regular price'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(), // da el tiempo en el momento.
      select: false
    },
    startDates: [Date],
    slug: String,
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number], //primero latitud y luego longitud
      address: String,
      description: String
    },
    locations: [
      // Este es un doc embebido
      {
        type: {
          // Y esto su atributo
          type: String, // Y esto sus opciones
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    toJSON: { virtuals: true }, // esto es para que las virtuales se puedan ver en las res de los request.
    toObject: { virtuals: true }
  }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); //Para la localizacion

tourSchema.virtual('durationWeeks').get(function() {
  // se le llama getter function
  return this.duration / 7; // this hace referencia al documento de la bd
});

//DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.post('save',function(doc, next) {
//   console.log(doc);
// })

//QUERY MIDDLEWARE:

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// tourSchema.post(/^find/, function(docs, next) {
//   console.log(`Query took ${Date.now() - this.start} milliseconds!`);
//   next();
// });

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   // unshift lo que hace es agregar un elemento en la primera posicion del array
//   console.log(this.pipeline());
//   next();
// });

//Virtual Populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
