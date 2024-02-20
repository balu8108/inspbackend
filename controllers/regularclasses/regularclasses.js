const Sequelize = require("sequelize");
const { Op } = Sequelize;
const {
    LiveClassRoom,
    LiveClassRoomDetail,
    LiveClassRoomFile,
    LiveClassRoomRecording,
    LiveClassRoomNote
} = require("../../models");

const getAllLectureByTopicName = async (req, res) => {
    try {
        const { topicDetails } = req.params;
        const { name } = JSON.parse(topicDetails)
        console.log({ name })
        const liveClassRooms = await LiveClassRoom.findAll({
            where: {
                classType: "REGULARCLASS",
                // classStatus: "FINISHED"
            },
            include: [{
                model: LiveClassRoomDetail,
                where: {
                    topicName: name
                }
            }]
        });

        return res.status(200).json({ message: "All Regular classes lecture data", data: liveClassRooms });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
}


module.exports = {
    getAllLectureByTopicName,
}
