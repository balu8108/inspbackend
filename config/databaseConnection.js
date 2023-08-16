const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: 'localhost',
  username: 'Rhythm',
  password: 'Rhythm@123',
  database: 'INSP',
});

const Student = require("../models/studentModel")

module.exports = { sequelize, Student };
