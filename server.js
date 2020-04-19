const mongoose = require('mongoose');
const dotenv = require('dotenv');
/*
process.on('uncaughtException', err => {
  // debe ir al principio
  console.log(err.name, err.message);
  console.log('Uncaught Exception. Shutting down');
  process.exit(1); //No es opcional
});*/

dotenv.config({ path: './config.env' });
const app = require('./app');
//console.log(process.env); //Para ver las variables de ambiente
//console.log(app.get('env'));
// Init server

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

//Conectar local la BD
/*
mongoose
  .connect(process.env.DATABASE_LOCAL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(con => {
    // console.log(con.connections);
    console.log('DB connected !');
  });
*/
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

process.on('unhandledRejection', err => {
  console.log(err.name, err.message);
  console.log('Unhandled Rejection. Shutting down');
  server.close(() => {
    process.exit(1); // Aunq en app reales, deberiamos usar algo para reiniciarla de nuevo; Es opcional crashearla
  });
});
