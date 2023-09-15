"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LiveClassRoomFile extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LiveClassRoomFile.belongsTo(models.LiveClassRoom, {
        foreignKey: "classRoomId",
      });
    }
  }
  LiveClassRoomFile.init(
    {
      key: DataTypes.STRING,
      url: DataTypes.STRING,
      isDownloadable: DataTypes.BOOLEAN,
      isShareable: DataTypes.BOOLEAN,
      classRoomId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "LiveClassRoomFile",
    }
  );
  return LiveClassRoomFile;
};
