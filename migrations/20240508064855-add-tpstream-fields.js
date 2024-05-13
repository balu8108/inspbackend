"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("SoloClassRoomRecordings", "tpStreamId", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("LiveClassRoomRecordings", "tpStreamId", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("LiveClassRoomRecordings", "DRMType", {
      type: Sequelize.ENUM("Axinom", "TPStream"),
      allowNull: false,
      defaultValue: "TPStream",
    });
    await queryInterface.addColumn("SoloClassRoomRecordings", "status", {
      type: Sequelize.ENUM("Uploaded", "Progress", "Completed"),
      allowNull: false,
      defaultValue: "Uploaded",
    });
    await queryInterface.addColumn("SoloClassRoomRecordings", "DRMType", {
      type: Sequelize.ENUM("Axinom", "TPStream"),
      allowNull: false,
      defaultValue: "TPStream",
    });
    await queryInterface.addColumn("LiveClassRoomRecordings", "status", {
      type: Sequelize.ENUM("Uploaded", "Progress", "Completed"),
      allowNull: false,
      defaultValue: "Uploaded",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("SoloClassRoomRecordings", "tpStreamId");
    await queryInterface.removeColumn("LiveClassRoomRecordings", "tpStreamId");
    await queryInterface.removeColumn("SoloClassRoomRecordings", "status");
    await queryInterface.removeColumn("LiveClassRoomRecordings", "status");
  },
};
