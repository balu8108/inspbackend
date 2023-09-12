"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LiveClassRoom extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LiveClassRoom.hasOne(models.LiveClassRoomDetail, {
        foreignKey: "classRoomId",
      });
      LiveClassRoom.hasMany(models.LiveClassRoomRecording, {
        foreignKey: "classRoomId",
      });
      LiveClassRoom.hasMany(models.LiveClassRoomFile, {
        foreignKey: "classRoomId",
      });
      LiveClassRoom.hasMany(models.LeaderBoard, { foreignKey: "classRoomId" });
      LiveClassRoom.hasMany(models.LiveClassRoomQNANotes, {
        foreignKey: "classRoomId",
      });
      LiveClassRoom.hasOne(models.LiveClassNotificationStatus, {
        foreignKey: "classRoomId",
      });
      LiveClassRoom.hasMany(models.LiveClassLog, {
        foreignKey: "classRoomId",
      });
    }
  }
  LiveClassRoom.init(
    {
      roomId: DataTypes.STRING,
      scheduledDate: DataTypes.DATE,
      scheduledStartTime: DataTypes.TIME,
      scheduledEndTime: DataTypes.TIME,
      mentorId: DataTypes.STRING,
      mentorName: DataTypes.STRING,
      muteAllStudents: DataTypes.BOOLEAN,
      blockStudentsCamera: DataTypes.BOOLEAN,
      subjectId: DataTypes.STRING,
      subjectName: DataTypes.STRING,
      classStatus: DataTypes.ENUM(
        "SCHEDULED",
        "ONGOING",
        "NOT_STARTED",
        "FINISHED",
        "NOT_CONDUCTED"
      ),
    },
    {
      sequelize,
      modelName: "LiveClassRoom",
    }
  );
  return LiveClassRoom;
};
