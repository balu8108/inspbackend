// models/student.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/databaseConnection').sequelize;

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement:true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password:{
    type :DataTypes.STRING,
    allowNull:false,
  },
  mobileNo:{
    type:DataTypes.STRING,
    allowNull:true,
    unique:true,
  
  },

});

module.exports = Student;

