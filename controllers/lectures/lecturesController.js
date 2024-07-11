const { Op, Sequelize } = require("sequelize");
const {
  LiveClassRoom,
  LiveClassRoomDetail,
  LiveClassRoomFile,
  LiveClassRoomRecording,
  LeaderBoard,
  LiveClassTestQuestionLog,
  SoloClassRoom,
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
          model: LeaderBoard,
          order: [["correctAnswers", "DESC"]], // Order by correctAnswers in descending order
          limit: 10, // Limit the number of LeaderBoard records to 10
        },
      ],
    });

    if (!liveClassRoom) return res.status(400).json({ error: "No data found" });

    // Subquery for the question log count
    const questionLogCount = await LiveClassTestQuestionLog.count({
      where: {
        classRoomId: liveClassRoom?.id,
      },
    });

    return res.status(200).json({
      message: "Lecture details by id success ",
      data: {
        liveClassRoom,
        questionLogCount,
      },
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const getLectureNo = async (req, res) => {
  try {
    const { subjectName, classType, classLevel, isSoloClass } = req.body;
    if (
      classLevel === "General_Discussion" ||
      classLevel === "JEE_Advanced_Mastery_Top_500"
    ) {
      const liveClassRooms = await LiveClassRoom.count({
        where: { classLevel: classLevel },
      });
     
      return res.status(200).json({
        message: `Total number of lectures  is ${liveClassRooms}`,
        data: liveClassRooms,
      });
    } else {
      if (
        !isSoloClass &&
        (!subjectName ||
          !classType ||
          (classType === "REGULARCLASS" && !classLevel))
      ) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let numberOfLecture = 0;

      if (isSoloClass) {
        const soloClassRooms = await SoloClassRoom.count();
        numberOfLecture = soloClassRooms;
      } else {
        const query = { subjectName, classType };
        if (classType === "REGULARCLASS") {
          query.classLevel = classLevel;
        }
        const liveClassRooms = await LiveClassRoom.count({ where: query });
        numberOfLecture = liveClassRooms;
      }

      return res.status(200).json({
        message: `Total number of lectures for ${
          isSoloClass ? "solo class" : "live class"
        } is ${numberOfLecture}`,
        data: numberOfLecture,
      });
    }
  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
  // Validate required fields for non-solo classes
};

module.exports = {
  getAllLecture,
  getLectureById,
  getAllLectureByTopicId,
  getLectureNo,
};
