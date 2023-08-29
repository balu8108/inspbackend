const Sequelize = require("sequelize");
const { Op } = Sequelize;
const {
  LiveClassRoom,
  LiveClassRoomDetail,
  LiveClassRoomFile,
} = require("../../models");
const {
  generateRandomCharacters,
  validateCreationOfLiveClass,
  uploadFilesToS3,
} = require("../../utils");

const getAllLiveClasses = async (req, res) => {
  try {
    const liveClassesData = await LiveClassRoom.findAll({
      include: [{ model: LiveClassRoomDetail }, { model: LiveClassRoomFile }],
    });
    res.status(200).json({ data: liveClassesData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createLiveClass = async (req, res) => {
  const { body, files } = req;

  const addFilesInArray = Array.isArray(files.files)
    ? files.files
    : [files.files];

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
        let LiveClassRoomFiles = [];

        if (files) {
          const fileUploads = await uploadFilesToS3(
            addFilesInArray,
            `files/roomId_${newLiveClass.roomId}`
          );
          if (fileUploads) {
            fileUploads.forEach(async (file) => {
              const newFileToDB = await LiveClassRoomFile.create({
                url: file,
                classRoomId: id,
              });
              LiveClassRoomFiles.push(newFileToDB);
            });
          } else {
            throw new Error("Unable to upload files");
          }
        }
        const liveClassRoomDetail = await LiveClassRoomDetail.create({
          chapterId: JSON.parse(body.chapter).value,
          chapterName: JSON.parse(body.chapter).label,
          topicId: JSON.parse(body.topic).value,
          topicName: JSON.parse(body.topic).label,
          agenda: body.agenda,
          description: body.description,
          classRoomId: id,
        });

        newLiveClass.liveClassRoomDetail = liveClassRoomDetail; // create parent child relationship however not necessary

        const combinedData = {
          ...newLiveClass.toJSON(),
          LiveClassRoomDetail: liveClassRoomDetail.toJSON(),
          LiveClassRoomFiles: LiveClassRoomFiles,
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
      include: [{ model: LiveClassRoomFile }, { model: LiveClassRoomDetail }],
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

const getUpcomingClass = async (req, res) => {
  const { roomId } = req.params;
  if (!roomId) {
    return res.status(400).json({ error: "Room Id is required" });
  }
  try {
    const getLiveClassRoom = await LiveClassRoom.findOne({
      where: { roomId: roomId },
    });

    const getFirstUpcomingClass = await LiveClassRoom.findOne({
      where: {
        scheduledDate: {
          [Op.gt]: getLiveClassRoom.scheduledDate,
        },
      },
      include: [{ model: LiveClassRoomFile }, { model: LiveClassRoomDetail }],
      order: [["scheduledDate", "ASC"]],
    });

    return res.status(200).json({ data: getFirstUpcomingClass });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
module.exports = {
  createLiveClass,
  getAllLiveClasses,
  getLiveClassDetails,
  getUpcomingClass,
};
