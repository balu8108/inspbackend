"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Notification.init(
    {
      notificationType: DataTypes.ENUM("EMAIL", "SMS", "EMAIL+SMS"),
      notificationStatus: DataTypes.ENUM("PENDING", "SENT", "FAILED"),
      notificationSMSStatus: DataTypes.ENUM("PENDING", "SENT", "FAILED"),
      notificationEmailStatus: DataTypes.ENUM("PENDING", "SENT", "FAILED"),
      notificationSMSText: DataTypes.STRING,
      notificationEmailText: DataTypes.STRING,
      notificationReceiverName: DataTypes.STRING,
      notificationReceiverEmail: DataTypes.STRING,
      notificationReceiverMobile: DataTypes.STRING,
      notificationMetaInfo: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Notification",
    }
  );
  return Notification;
};
