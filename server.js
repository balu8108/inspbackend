const httpServer = require("./app");
const dotenv = require("dotenv");
const sequelize = require("./config/database");

dotenv.config({ path: "config/.env" });

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection to database has been established successfully.");
    await sequelize.sync();
    console.log("Models synchronized with the database.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
})();

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () =>
  console.log(`Server is running on http://localhost:${PORT}`)
);
