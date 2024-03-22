"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("SoloClassRoomRecordings", "hlsDrmKey", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("SoloClassRoomRecordings", "hlsDrmUrl", {
      type: Sequelize.STRING,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("SoloClassRoomRecordings", "hlsDrmKey");
    await queryInterface.removeColumn("SoloClassRoomRecordings", "hlsDrmUrl");
  },
};
