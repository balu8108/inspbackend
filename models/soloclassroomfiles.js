"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SoloClassRoomFiles extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SoloClassRoomFiles.belongsTo(models.SoloClassRoom, {
        foreignKey: "soloClassRoomId",
      });
    }
  }
  SoloClassRoomFiles.init(
    {
      key: DataTypes.STRING,
      soloClassRoomId: DataTypes.STRING,
      isDownloadable: DataTypes.BOOLEAN,
      isShareable: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "SoloClassRoomFiles",
    }
  );
  return SoloClassRoomFiles;
};
