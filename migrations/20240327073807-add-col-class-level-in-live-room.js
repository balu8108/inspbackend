"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn("LiveClassRooms", "classLevel", {
      type: Sequelize.ENUM("Class_11", "Class_12", "Foundation_Course"),
      allowNull: false,
      defaultValue: "Class_11",
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("LiveClassRooms", "classLevel");
  },
};
