const Sequelize = require("sequelize");
const { Op } = Sequelize;
const {
    LiveClassRoom,
    LiveClassRoomDetail,
    LiveClassRoomFile,
    LiveClassRoomRecording,
    LiveClassRoomNote,
    LeaderBoard
} = require("../../models");

const getAllCrashCourseLecture = async (req, res) => {
    try {
        const liveClassRooms = await LiveClassRoom.findAll({
            where: {
                classType: "CRASHCOURSE",
                classStatus: "FINISHED"
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


const getLectureById = async (req, res) => {
    try {
        const { roomId } = req.params;

        if (!roomId) return res.status(400).json({ error: "Room id is required" });

        const liveClassRoom = await LiveClassRoom.findOne({
            where: {
                roomId: roomId
            },
            include: [{
                model: LiveClassRoomDetail,
            }, {
                model: LiveClassRoomFile,
            }, {
                model: LiveClassRoomRecording,
            }, {
                model: LiveClassRoomNote,
            }, {
                model: LeaderBoard,
                order: [['correctAnswers', 'DESC']], // Order by correctAnswers in descending order
                limit: 10 // Limit the number of LeaderBoard records to 10
            }]
        });


        if (!liveClassRoom) return res.status(400).json({ error: "No data found" });

        return res.status(200).json({ message: "Lecture details by id success ", data: liveClassRoom });

    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
}

module.exports = {
    getAllCrashCourseLecture,
    getLectureById
}