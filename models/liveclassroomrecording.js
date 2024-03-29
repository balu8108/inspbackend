"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LiveClassRoomRecording extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LiveClassRoomRecording.belongsTo(models.LiveClassRoom, {
        foreignKey: "classRoomId",
      });
    }
  }
  LiveClassRoomRecording.init(
    {
      key: DataTypes.STRING,
      url: DataTypes.STRING,
      classRoomId: DataTypes.INTEGER,
      drmKeyId: DataTypes.STRING,
      hlsDrmKey: DataTypes.STRING,
      hlsDrmUrl: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "LiveClassRoomRecording",
    }
  );
  return LiveClassRoomRecording;
};
