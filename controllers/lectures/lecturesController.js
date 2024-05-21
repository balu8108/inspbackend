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

    if (isSoloClass) {
      const soloClassRooms = await SoloClassRoom.findAll();
      numberOfLecture = soloClassRooms.length;
      return res.status(200).json({ data: numberOfLecture });
    } else {
      if (!subjectName || !classType || !classLevel) {
        return res.status(400).json({ error: "please send is required" });
      }

      let numberOfLecture = 0;
      if (classType == "REGULARCLASS") {
        const liveClassRooms = await LiveClassRoom.findAll({
          where: {
            subjectName: subjectName,
            classType: classType,
            classLevel: classLevel,
          },
          include: [
            {
              model: LiveClassRoomDetail,
            },
          ],
        });
        numberOfLecture = liveClassRooms.length;
      } else if (classType == "CRASHCOURSE") {
        const liveClassRooms = await LiveClassRoom.findAll({
          where: {
            subjectName: subjectName,
            classType: classType,
          },
          include: [
            {
              model: LiveClassRoomDetail,
            },
          ],
        });
        numberOfLecture = liveClassRooms.length;
      }

      return res.status(200).json({ data: numberOfLecture });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

module.exports = {
  getAllLecture,
  getLectureById,
  getAllLectureByTopicId,
  getLectureNo,
};
