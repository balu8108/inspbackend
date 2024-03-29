"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("LiveClassRoomRecordings", "hlsDrmKey", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("LiveClassRoomRecordings", "hlsDrmUrl", {
      type: Sequelize.STRING,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("LiveClassRoomRecordings", "hlsDrmKey");
    await queryInterface.removeColumn("LiveClassRoomRecordings", "hlsDrmUrl");
  },
};
