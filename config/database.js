const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("postgres", "postgres", "superuser", {
  host: "localhost",
  port: "5432",
  dialect: "postgres",
});

module.exports = sequelize;
