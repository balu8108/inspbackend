"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class MauTracker extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {}
  }
  MauTracker.init(
    {
      studentId: DataTypes.STRING,
      studentName: DataTypes.STRING,
      deviceId: DataTypes.STRING, // store in user localstorage
      deviceName: DataTypes.STRING,
      browserName: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "MauTracker",
    }
  );
  return MauTracker;
};
