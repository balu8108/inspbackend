'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AssignmentFiles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      key: {
        type: Sequelize.STRING
      },
      url: {
        type: Sequelize.STRING
      },
      isDownloadable: {
        type: Sequelize.BOOLEAN
      },
      isShareable: {
        type: Sequelize.BOOLEAN
      },
      assignmentId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Assignments",
          key: "id",
        },
        onDelete: "CASCADE",
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
    await queryInterface.dropTable('AssignmentFiles');
  }
};