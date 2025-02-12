"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SoloClassRoom extends Model {
    static associate(models) {
      SoloClassRoom.hasMany(models.SoloClassRoomFiles, {
        foreignKey: "soloClassRoomId",
      });
      SoloClassRoom.hasMany(models.SoloClassRoomRecording, {
        foreignKey: "soloClassRoomId",
      });
    }
  }
  SoloClassRoom.init(
    {
      subjectId: DataTypes.STRING,
      mentorName: DataTypes.STRING,
      topicId: DataTypes.STRING,
      topic: DataTypes.STRING,
      agenda: DataTypes.TEXT,
      description: DataTypes.TEXT,
      lectureNo: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "SoloClassRoom",
    }
  );
  return SoloClassRoom;
};
