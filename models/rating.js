"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Rating extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Rating.init(
    {
      topicId: DataTypes.STRING,
      raterId: DataTypes.STRING,
      raterName: DataTypes.TEXT,
      rating: DataTypes.INTEGER,
      feedback: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "Rating",
    }
  );
  return Rating;
};
