"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("LeaderBoards", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      peerId: {
        type: Sequelize.STRING,
      },
      peerName: {
        type: Sequelize.STRING,
      },
      peerEmail: {
        type: Sequelize.STRING,
        validate: {
          isEmail: true,
        },
      },
      correctAnswers: {
        type: Sequelize.INTEGER,
      },
      combinedResponseTime: {
        type: Sequelize.INTEGER,
      },
      classRoomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "liveclassrooms",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("LeaderBoards");
  },
};
