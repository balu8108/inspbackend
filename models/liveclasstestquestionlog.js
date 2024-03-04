"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LiveClassTestQuestionLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LiveClassTestQuestionLog.belongsTo(models.LiveClassRoom, {
        foreignKey: "classRoomId",
      });
    }
  }
  LiveClassTestQuestionLog.init(
    {
      logInfo: DataTypes.ENUM("NEW_QUESTION_ADDED"),
      questionNo: DataTypes.INTEGER,
      questionId: DataTypes.STRING,
      questionType: DataTypes.STRING,
      classRoomId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "LiveClassTestQuestionLog",
    }
  );
  return LiveClassTestQuestionLog;
};
