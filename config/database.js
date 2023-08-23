const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config({ path: "config/.env" });
const env = process.env.NODE_ENV || "development";
const config = require("./config.json")[env];

const DB_NAME = config["database"];
const DB_PASSWORD = config["password"];
const DB_HOST = config["host"];
const DB_PORT = config["port"];
const DB_USER_NAME = config["username"];

const sequelize = new Sequelize(DB_NAME, DB_USER_NAME, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "mysql",
});

module.exports = sequelize;
