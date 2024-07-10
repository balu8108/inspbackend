"use strict";

/** @type {import('sequelize-cli').Migration} */
// The new values you want to add
const newEnumValues = ["General_Discussion", "JEE_Advanced_Mastery_Top_500"];

// Previous enum values
const previousEnumValues = ["Class_11", "Class_12", "Foundation_Olympiad"];

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.changeColumn("LiveClassRooms", "classLevel", {
      type: Sequelize.ENUM(...previousEnumValues.concat(newEnumValues)),
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
    await queryInterface.changeColumn("LiveClassRooms", "classLevel", {
      type: Sequelize.ENUM(...previousEnumValues),
      allowNull: false,
      defaultValue: "Class_11",
    });
  },
};
