"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("LiveClassRoomDetails", "chapterId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn("LiveClassRoomDetails", "chapterName", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn("LiveClassRoomDetails", "topicId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn("LiveClassRoomDetails", "topicName", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("LiveClassRoomDetails", "chapterId", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn("LiveClassRoomDetails", "chapterName", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn("LiveClassRoomDetails", "topicId", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn("LiveClassRoomDetails", "topicName", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
