"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("LiveClassRooms", "classStatus", {
      type: Sequelize.ENUM(
        "SCHEDULED",
        "ONGOING",
        "NOT_STARTED",
        "FINISHED",
        "NOT_CONDUCTED"
      ),
      allowNull: false,
      defaultValue: "SCHEDULED",
    });
  },

  async down(queryInterface, Sequelize) {},
};
