"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("LiveClassRoomDetails", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      chapterId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      chapterName: {
        type: Sequelize.STRING(512),
      },
      topicId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      topicName: {
        type: Sequelize.STRING(512),
      },
      agenda: {
        type: Sequelize.TEXT,
      },
      description: {
        type: Sequelize.TEXT,
      },
      classRoomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "LiveClassRooms",
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
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("LiveClassRoomDetails");
  },
};
