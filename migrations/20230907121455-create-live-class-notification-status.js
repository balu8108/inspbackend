"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("LiveClassNotificationStatuses", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      notificationClassType: {
        type: Sequelize.ENUM("LIVE_CLASS", "PTM"),
        defaultValue: "LIVE_CLASS",
      },
      liveClassNotificationStatus: {
        type: Sequelize.ENUM("PENDING", "SENT", "FAILED"),
        defaultValue: "PENDING",
      },
      classRoomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "LiveClassRooms",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      notificationType: {
        type: Sequelize.ENUM("EMAIL", "SMS", "EMAIL+SMS"),
        defaultValue: "EMAIL+SMS",
      },
      notificationSubject: {
        type: Sequelize.TEXT,
      },
      notificationSendingTime: {
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
    await queryInterface.dropTable("LiveClassNotificationStatuses");
  },
};
