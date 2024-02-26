"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LiveClassLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LiveClassLog.belongsTo(models.LiveClassRoom, {
        foreignKey: "classRoomId",
      });
    }
  }
  LiveClassLog.init(
    {
      logInfo: DataTypes.ENUM(
        "TEACHER_JOINED",
        "TEACHER_DISCONNECTED",
        "TEACHER_END_MEET"
      ),
      classRoomId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "LiveClassLog",
    }
  );
  return LiveClassLog;
};
