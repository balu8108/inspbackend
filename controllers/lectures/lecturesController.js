const { Op, Sequelize } = require("sequelize");
const {
  LiveClassRoom,
  LiveClassRoomDetail,
  LiveClassRoomFile,
  LiveClassRoomRecording,
  LiveClassRoomNote,
  LeaderBoard,
  LiveClassTestQuestionLog,
} = require("../../models");

const getAllLecture = async (req, res) => {
  // classType: DataTypes.ENUM("REGULARCLASS", "CRASHCOURSE"),
  // classLevel: DataTypes.ENUM("Class_11", "Class_12", "Foundation_Course"),
  const { classType, classLevel } = req.params;
  if (!classType)
    return res.status(400).json({ error: "Class type is required" });
  if (!classLevel)
    return res.status(400).json({ error: "Class Level is required" });
  try {
    var whereCondition = {};

    if (classLevel == "ALL") {
      whereCondition = {
        classType: classType,
        classStatus: "FINISHED",
      };
    } else if (classType == "ALL") {
      whereCondition = {
        classLevel: JSON.parse(classLevel),
        classStatus: "FINISHED",
      };
    } else {
      whereCondition = {
        classType: classType,
        classLevel: classLevel,
        classStatus: "FINISHED",
      };
    }
    const liveClassRooms = await LiveClassRoom.findAll({
      where: whereCondition,
      include: [
        {
          model: LiveClassRoomDetail,
        },
      ],
    });
    return res
      .status(200)
      .json({ message: "All lecture data", data: liveClassRooms });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const getAllLectureByTopicId = async (req, res) => {
  try {
    const { topicId, topicType } = req.params;
    var whereCondition = {};
    if (topicType === "regular") {
      whereCondition = {
        classType: "REGULARCLASS",
        classStatus: "FINISHED",
      };
    }
    if (topicType === "both") {
      whereCondition = {
        classStatus: "FINISHED",
      };
    }
    const liveClassRooms = await LiveClassRoom.findAll({
      where: whereCondition,
      include: [
        {
          model: LiveClassRoomDetail,
          where: {
            topicId: topicId,
          },
        },
      ],
    });

    console.log("DFDFDF");
    console.log(liveClassRooms);

    return res.status(200).json({
      message: "Alls lecture data",
      data: liveClassRooms,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const getLectureById = async (req, res) => {
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
        {
          model: LiveClassTestQuestionLog,
          attributes: [
            [Sequelize.fn("COUNT", Sequelize.col("*")), "questionLogCount"],
          ],
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

module.exports = {
  getAllLecture,
  getLectureById,
  getAllLectureByTopicId,
};
