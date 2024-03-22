"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("LiveClassRoomsRecordings", "hlsDrmKey", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("LiveClassRoomsRecordings", "hlsfrmurl", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("LiveClassRoomsRecordings", "hlsDrmKey");
    await queryInterface.removeColumn("LiveClassRoomsRecordings", "hlsfrmurl");
  },
};
