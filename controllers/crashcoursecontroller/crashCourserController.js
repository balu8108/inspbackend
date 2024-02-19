const Sequelize = require("sequelize");
const { Op } = Sequelize;
const {
    LiveClassRoom,
    LiveClassRoomDetail,
    LiveClassRoomFile,
} = require("../../models");

const getAllCrashCourseLecture = async (req, res) => {
    try {
        const liveClassRooms = await LiveClassRoom.findAll({
            where: {
                classType: "CRASHCOURSE",
                subjectName: "PHYSICS",
            },
            include: [{
                model: LiveClassRoomDetail
            }]
        });

        return res.status(200).json({ message: "All Crash course lecture data", data: liveClassRooms });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
}

module.exports = {
    getAllCrashCourseLecture,
}