"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LiveClassNotificationStatus extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LiveClassNotificationStatus.belongsTo(models.LiveClassRoom, {
        foreignKey: "classRoomId",
      });
    }
  }
  LiveClassNotificationStatus.init(
    {
      // notificationClassType: DataTypes.ENUM("LIVE_CLASS", "PTM"),
      liveClassNotificationStatus: DataTypes.ENUM("PENDING", "SENT", "FAILED"),
      classRoomId: DataTypes.INTEGER,
      notificationType: DataTypes.ENUM("EMAIL", "SMS", "EMAIL+SMS"),
      notificationSubject: DataTypes.TEXT,
      notificationSendingTime: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "LiveClassNotificationStatus",
    }
  );
  return LiveClassNotificationStatus;
};
