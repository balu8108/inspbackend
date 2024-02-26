"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("LiveClassRooms", "muteAllStudents", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn("LiveClassRooms", "blockStudentsCamera", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("LiveClassRooms", "muteAllStudents");
    await queryInterface.removeColumn("LiveClassRooms", "blockStudentsCamera");
  },
};
