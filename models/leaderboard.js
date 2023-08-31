"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LeaderBoard extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LeaderBoard.belongsTo(models.LiveClassRoom, {
        foreignKey: "classRoomId",
      });
    }
  }
  LeaderBoard.init(
    {
      peerId: DataTypes.STRING,
      peerName: DataTypes.STRING,
      peerEmail: DataTypes.STRING,
      correctAnswers: DataTypes.INTEGER,
      combinedResponseTime: DataTypes.INTEGER,
      classRoomId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "LeaderBoard",
    }
  );
  return LeaderBoard;
};
