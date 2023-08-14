const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config({ path: "config/.env" });
const DB_NAME = process.env.DB_NAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_USER_NAME = process.env.DB_USER_NAME;

const sequelize = new Sequelize(DB_NAME, DB_USER_NAME, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "postgres",
});

module.exports = sequelize;
