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
      LiveClassRoom.hasOne(models.LiveClassRoomQNANotes, {
        foreignKey: "classRoomId",
      });
      LiveClassRoom.hasOne(models.LiveClassRoomNote, {
        foreignKey: "classRoomId",
      });
      LiveClassRoom.hasOne(models.LiveClassNotificationStatus, {
        foreignKey: "classRoomId",
      });
      LiveClassRoom.hasMany(models.LiveClassLog, {
        foreignKey: "classRoomId",
      });
      LiveClassRoom.hasMany(models.LiveClassTestQuestionLog, {
        foreignKey: "classRoomId",
      });
      LiveClassRoom.hasMany(models.LiveClassBlockedPeer, {
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
      mentorEmail: DataTypes.STRING,
      mentorMobile: DataTypes.STRING,
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
      classType: DataTypes.ENUM("REGULARCLASS", "CRASHCOURSE"),
      classLevel: DataTypes.ENUM("Class_11", "Class_12", "Foundation_Olympiad"),
      // class Type eg regular  and crash course
    },

    {
      sequelize,
      modelName: "LiveClassRoom",
    }
  );
  return LiveClassRoom;
};
