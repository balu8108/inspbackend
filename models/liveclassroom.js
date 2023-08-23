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
      LiveClassRoom.belongsTo(models.Subject, { foreignKey: "subjectId" });
    }
  }
  LiveClassRoom.init(
    {
      roomId: DataTypes.STRING,
      scheduledDate: DataTypes.DATE,
      scheduledStartTime: DataTypes.TIME,
      scheduledEndTime: DataTypes.TIME,
      subjectId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "LiveClassRoom",
    }
  );
  return LiveClassRoom;
};
