"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("LiveClassRoomRecordings", "url");
    await queryInterface.removeColumn("SoloClassRoomRecordings", "url");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("LiveClassRoomRecordings", "url", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("SoloClassRoomRecordings", "url", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
