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
      chapterId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      chapterName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      topicId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      topicName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      agenda: DataTypes.TEXT,
      description: DataTypes.TEXT,
      classRoomId: DataTypes.INTEGER,
      lectureNo: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "LiveClassRoomDetail",
    }
  );
  return LiveClassRoomDetail;
};
