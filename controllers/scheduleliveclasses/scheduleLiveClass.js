const { LiveClassRoom, LiveClassRoomDetail } = require("../../models");
const {
  generateRandomCharacters,
  validateCreationOfLiveClass,
} = require("../../utils");

const getAllLiveClasses = async (req, res) => {
  try {
    const liveClassesData = await LiveClassRoom.findAll({
      include: [LiveClassRoomDetail],
    });
    res.status(200).json({ data: liveClassesData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const createLiveClass = async (req, res) => {
  const { body } = req;
  const randomCharacters = generateRandomCharacters(10); // generate a unique class room id
  // For creation of new class we need to first check if the body contains all required parameters or not
  if (validateCreationOfLiveClass(body)) {
    try {
      //  At The moment we are providing default mentor details
      const newLiveClass = await LiveClassRoom.create({
        roomId: randomCharacters,
        scheduledDate: body.scheduledDate,
        scheduledStartTime: body.scheduledStartTime,
        scheduledEndTime: body.scheduledEndTime,
        muteAllStudents: body.muteAllStudents || false,
        blockStudentsCamera: body.blockStudentsCamera || false,
        mentorId: body.mentorId || 1,
        mentorName: body.mentorName || "Mentor",
      });
      if (newLiveClass) {
        const { id } = newLiveClass;
        const liveClassRoomDetail = await LiveClassRoomDetail.create({
          chapterId: body.chapter.value,
          chapterName: body.chapter.label,
          topicId: body.topic.value,
          topicName: body.topic.label,
          agenda: body.agenda,
          description: body.description,
          classRoomId: id,
        });

        newLiveClass.liveClassRoomDetail = liveClassRoomDetail; // create parent child relationship however not necessary
        const combinedData = {
          ...newLiveClass.toJSON(),
          LiveClassRoomDetail: liveClassRoomDetail.toJSON(),
        };
        return res.status(200).json({ data: combinedData });
      } else {
        return res.status(400).json({ error: "Unable to create new class" });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    return res.status(400).json({ error: "Some fields are missing!!" });
  }
};

const getLiveClassDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ error: "Room Id is required" });
    }
    const getLiveClassRoom = await LiveClassRoom.findOne({
      where: { roomId: roomId },
      include: [LiveClassRoomDetail],
    });

    if (getLiveClassRoom) {
      return res.status(200).json({ data: getLiveClassRoom });
    } else {
      throw new Error("No Live Class Found with this Room Id");
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
module.exports = { createLiveClass, getAllLiveClasses, getLiveClassDetails };
