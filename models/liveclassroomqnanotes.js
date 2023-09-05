"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LiveClassRoomQNANotes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      LiveClassRoomQNANotes.belongsTo(models.LiveClassRoom, {
        foreignKey: "classRoomId",
      });
    }
  }
  LiveClassRoomQNANotes.init(
    {
      url: DataTypes.STRING,
      classRoomId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "LiveClassRoomQNANotes",
    }
  );
  return LiveClassRoomQNANotes;
};
