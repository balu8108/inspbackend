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

exports.getAllLectureByTopicName = async (req, res) => {
  try {
    const { topicDetails } = req.params;
    const { name } = JSON.parse(topicDetails);
    console.log({ name });
    const liveClassRooms = await LiveClassRoom.findAll({
      where: {
        classType: "REGULARCLASS",
        classStatus: "FINISHED",
      },
      include: [
        {
          model: LiveClassRoomDetail,
          where: {
            topicName: name,
          },
        },
      ],
    });

    return res
      .status(200)
      .json({
        message: "All Regular classes lecture data",
        data: liveClassRooms,
      });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

exports.getLectureDetails = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) return res.status(400).json({ error: "Room id is required" });

    const liveClassRoom = await LiveClassRoom.findOne({
      where: {
        roomId: roomId,
      },
      include: [
        {
          model: LiveClassRoomDetail,
        },
        {
          model: LiveClassRoomFile,
        },
        {
          model: LiveClassRoomRecording,
        },
        {
          model: LiveClassRoomNote,
        },
        {
          model: LeaderBoard,
          order: [["correctAnswers", "DESC"]], // Order by correctAnswers in descending order
          limit: 10, // Limit the number of LeaderBoard records to 10
        },
      ],
    });

    if (!liveClassRoom) return res.status(400).json({ error: "No data found" });

    return res
      .status(200)
      .json({ message: "Lecture details by id success ", data: liveClassRoom });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
