"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("LiveClassRooms", "mentorEmail", {
      type: Sequelize.STRING,
      validate: {
        isEmail: true,
      },
      allowNull: false,
    });
    await queryInterface.addColumn("LiveClassRooms", "mentorMobile", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("LiveClassRooms", "mentorEmail");
    await queryInterface.removeColumn("LiveClassRooms", "mentorMobile");
  },
};
