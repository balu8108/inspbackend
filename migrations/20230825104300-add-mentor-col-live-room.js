"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("LiveClassRooms", "mentorId", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("LiveClassRooms", "mentorName", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("LiveClassRooms", "mentorId");
    await queryInterface.removeColumn("LiveClassRooms", "mentorName");
  },
};
