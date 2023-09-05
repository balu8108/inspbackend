"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("LiveClassRooms", "subjectId", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("LiveClassRooms", "subjectName", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("LiveClassRooms", "subjectId");
    await queryInterface.removeColumn("LiveClassRooms", "subjectName");
  },
};
