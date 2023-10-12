'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SoloClassRooms', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      subjectId: {
        type: Sequelize.STRING
      },
      mentorName: {
        type: Sequelize.STRING
      },
      topicId: {
        type: Sequelize.STRING
      },
      topic: {
        type: Sequelize.STRING
      },
      agenda: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.STRING
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
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SoloClassRooms');
  }
};