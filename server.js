const httpServer = require("./app");
const { PORT } = require("./envvar");
const sequelize = require("./config/database");

(async () => {
  try {
    await sequelize.authenticate();

    await sequelize.sync();
    console.log("Models synchronized with the database.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
})();

const SERVER_PORT = PORT || 5000;
httpServer.listen(SERVER_PORT, () =>
  console.log(`Server is running on http://localhost:${SERVER_PORT}`)
);
