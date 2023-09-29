'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class soloClassRoomFiles extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      soloClassRoomFiles.belongsTo(models.SoloClassRoom, {
        foreignKey: "soloClassRoomId",
      });
    }
  }
  soloClassRoomFiles.init({
    name: DataTypes.STRING,
    soloClassRoomId: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'soloClassRoomFiles',
  });
  return soloClassRoomFiles;
};