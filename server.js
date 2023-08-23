const app = require("./app");
const dotenv = require("dotenv");

const { sequelize} = require("./config/databaseConnection");

dotenv.config({ path: "config/.env" });

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
