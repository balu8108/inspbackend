const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config({ path: "config/.env" });
const env = process.env.NODE_ENV || "development";
const config = require("./config.json")[env];

console.log("env in database.js", env);

const DB_NAME = config["database"];
const DB_PASSWORD = config["password"];
const DB_HOST = config["host"];
const DB_PORT = config["port"];
const DB_USER_NAME = config["username"];

console.log("database conneted", DB_NAME);
console.log("database pass", DB_PASSWORD);
console.log("data base host", DB_HOST);

const sequelize = new Sequelize(DB_NAME, DB_USER_NAME, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "mysql",
  define: {
    freezeTableName: true,
  },
});

module.exports = sequelize;
