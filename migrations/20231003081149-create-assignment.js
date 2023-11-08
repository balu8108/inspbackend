"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Assignments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      subjectId:{
        type:Sequelize.STRING,
      },
      subjectName:{
        type:Sequelize.STRING,
      },


      topicId: {
        type: Sequelize.STRING,
        allowNull:false
      },
      topicName: {
        type: Sequelize.STRING,
      },
      instructorName: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.TEXT,
      },
    

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Assignments");
  },
};
