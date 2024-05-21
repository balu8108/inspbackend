"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SoloClassRoomRecording extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SoloClassRoomRecording.belongsTo(models.SoloClassRoom, {
        foreignKey: "soloClassRoomId",
      });
    }
  }
  SoloClassRoomRecording.init(
    {
      key: DataTypes.STRING,
      soloClassRoomId: DataTypes.INTEGER,
      drmKeyId: DataTypes.STRING,
      hlsDrmKey: DataTypes.STRING,
      hlsDrmUrl: DataTypes.STRING,
      tpStreamId: DataTypes.STRING,
      DRMType: DataTypes.ENUM("Axinom", "TPStream"),
      status: DataTypes.ENUM("Uploaded", "Progress", "Completed"),
    },
    {
      sequelize,
      modelName: "SoloClassRoomRecording",
    }
  );
  return SoloClassRoomRecording;
};
