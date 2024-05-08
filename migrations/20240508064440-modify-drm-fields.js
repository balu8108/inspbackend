"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.removeColumn("SoloClassRoomRecordings", "hlsDrmKey");
        await queryInterface.removeColumn("SoloClassRoomRecordings", "hlsDrmUrl");
        await queryInterface.removeColumn("SoloClassRoomRecordings", "drmKeyId");
        await queryInterface.removeColumn("LiveClassRoomRecordings", "hlsDrmKey");
        await queryInterface.removeColumn("LiveClassRoomRecordings", "hlsDrmUrl");
        await queryInterface.removeColumn("LiveClassRoomRecordings", "drmKeyId");
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.addColumn("SoloClassRoomRecordings", "hlsDrmKey", {
            type: Sequelize.STRING,
        });
        await queryInterface.addColumn("SoloClassRoomRecordings", "hlsDrmUrl", {
            type: Sequelize.STRING,
        });
        await queryInterface.addColumn("SoloClassRoomRecordings", "drmKeyId", {
            type: Sequelize.STRING,
        });
        await queryInterface.addColumn("LiveClassRoomRecordings", "hlsDrmKey", {
            type: Sequelize.STRING,
        });
        await queryInterface.addColumn("LiveClassRoomRecordings", "hlsDrmUrl", {
            type: Sequelize.STRING,
        });
        await queryInterface.addColumn("LiveClassRoomRecordings", "drmKeyId", {
            type: Sequelize.STRING,
        });
    },
};
