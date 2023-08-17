// const app = require("./app");

// const mysql2 = require("mysql2");

// const dotenv = require("dotenv");

// dotenv.config({ path: "config/variable.env" });

// const {sequelize}= require("./config/databaseConnection");

// const PORT = process.env.PORT || 4000;

// // const connection = mysql2.createConnection({
// //   host: "localhost",
// //   user: "Rhythm",
// //   password: "Rhythm@123",
// //   database: "INSP",
// // });
// // connection.connect((err) => {
// //   if (err) {
// //     console.error("Error connecting to the database: " + err.stack);
// //     return;
// //   }

// //   console.log("Connected to the database sucessfully !!");
// // });

// sequelize
//   .sync()
//   .then(() => {
//     console.log('Database synchronized.');
//   })
//   .catch((error) => {
//     console.error('Error synchronizing the database:', error);
//   });

// app.listen(PORT, () => {
//   console.log(`Server is running at port ${process.env.PORT}.`);
// });


const app = require("./app");
const dotenv = require("dotenv");

const { sequelize} = require("./config/databaseConnection");

dotenv.config({ path: "config/variable.env" });

const PORT = process.env.PORT || 4000;

sequelize
  .sync()
  .then(() => {
    console.log('Database synchronized.');
  })
  .catch((error) => {
    console.error('Error synchronizing the database:', error);
  });

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}.`);
});
