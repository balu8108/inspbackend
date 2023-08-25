"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LiveClassRoomDetail extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LiveClassRoomDetail.belongsTo(models.LiveClassRoom, {
        foreignKey: "classRoomId",
      });
    }
  }
  LiveClassRoomDetail.init(
    {
      chapterId: DataTypes.STRING,
      chapterName: DataTypes.STRING,
      topicId: DataTypes.STRING,
      topicName: DataTypes.STRING,
      agenda: DataTypes.STRING,
      description: DataTypes.STRING,
      classRoomId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "LiveClassRoomDetail",
    }
  );
  return LiveClassRoomDetail;
};
