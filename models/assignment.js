"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Assignment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Assignment.hasMany(models.AssignmentFiles, {
        foreignKey: "assignmentId",
      });
    }
  }
  Assignment.init(
    {
      topicId: DataTypes.STRING,
      topicName: DataTypes.STRING,
      instructorName: DataTypes.STRING,
      description: DataTypes.TEXT,
      subjectId: DataTypes.STRING,
      subjectName: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Assignment",
    }
  );
  return Assignment;
};
