"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class AssignmentFiles extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      AssignmentFiles.belongsTo(models.Assignment, {
        foreignKey: "assignmentId",
      });
    }
  }
  AssignmentFiles.init(
    {
      key: DataTypes.STRING,
      isDownloadable: DataTypes.BOOLEAN,
      isShareable: DataTypes.BOOLEAN,
      assignmentId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "AssignmentFiles",
    }
  );
  return AssignmentFiles;
};
