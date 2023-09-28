"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LiveClassBlockedPeer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LiveClassBlockedPeer.belongsTo(models.LiveClassRoom, {
        foreignKey: "classRoomId",
      });
    }
  }
  LiveClassBlockedPeer.init(
    {
      blockedPersonId: DataTypes.STRING,
      classRoomId: DataTypes.INTEGER,
      isBlocked: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "LiveClassBlockedPeer",
    }
  );
  return LiveClassBlockedPeer;
};
