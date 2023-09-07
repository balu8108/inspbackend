"use strict";

const { sequelize } = require("../models");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Notifications", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      notificationType: {
        type: Sequelize.ENUM("EMAIL", "SMS", "EMAIL+SMS"),
        defaultValue: "EMAIL",
      },
      notificationStatus: {
        type: Sequelize.ENUM("PENDING", "SENT", "FAILED"),
        defaultValue: "PENDING",
      },
      notificationSMSStatus: {
        type: Sequelize.ENUM("PENDING", "SENT", "FAILED"),
        defaultValue: "PENDING",
      },
      notificationEmailStatus: {
        type: Sequelize.ENUM("PENDING", "SENT", "FAILED"),
        defaultValue: "PENDING",
      },
      notificationSMSText: {
        type: Sequelize.STRING,
      },
      notificationEmailText: {
        type: Sequelize.STRING,
      },
      notificationReceiverName: {
        type: Sequelize.STRING,
      },
      notificationReceiverEmail: {
        type: Sequelize.STRING,
      },
      notificationReceiverMobile: {
        type: Sequelize.STRING,
      },
      notificationMetaInfo: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("Notifications");
  },
};
