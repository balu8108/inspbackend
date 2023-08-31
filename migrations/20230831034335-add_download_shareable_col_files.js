"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("LiveClassRoomFiles", "isDownloadable", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn("LiveClassRoomFiles", "isShareable", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("LiveClassRoomFiles", "isDownloadable");
    await queryInterface.removeColumn("LiveClassRoomFiles", "isShareable");
  },
};
