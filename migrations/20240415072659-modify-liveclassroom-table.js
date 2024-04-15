"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("LiveClassRoomRecordings", "url");
    await queryInterface.removeColumn("SoloClassRoomRecordings", "url");
    await queryInterface.removeColumn("AssignmentFiles", "url");
    await queryInterface.removeColumn("LiveClassRoomFiles", "url");
    await queryInterface.removeColumn("LiveClassRoomNotes", "url");
    await queryInterface.removeColumn("LiveClassRoomQNANotes", "url");
    await queryInterface.removeColumn("SoloClassRoomFiles", "url");
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
    await queryInterface.addColumn("AssignmentFiles", "url", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("LiveClassRoomFiles", "url", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("LiveClassRoomNotes", "url", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("LiveClassRoomQNANotes", "url", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("SoloClassRoomFiles", "url", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
