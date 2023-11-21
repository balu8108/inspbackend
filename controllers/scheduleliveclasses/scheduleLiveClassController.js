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
const { classStatus } = require("../../constants");

// DB FUNCTIONS START

const createLiveClassRoom = async (randomCharacters, body, plainAuthData) => {
  try {
    const newLiveClass = await LiveClassRoom.create({
      roomId: randomCharacters,
      scheduledDate: body.scheduledDate,
      scheduledStartTime: body.scheduledStartTime,
      scheduledEndTime: body.scheduledEndTime,
      muteAllStudents: body.muteAllStudents || false,
      blockStudentsCamera: body.blockStudentsCamera || false,
      mentorId: plainAuthData.id || 1,
      mentorName: plainAuthData.name || "Mentor",
      mentorEmail: plainAuthData.email || "test@gmail.com",
      mentorMobile: plainAuthData.mobile || "1234567890",
      subjectId: JSON.parse(body.subject).value,
      subjectName: JSON.parse(body.subject).label,
      classStatus: classStatus.SCHEDULED,
    });
    return { success: true, result: newLiveClass };
  } catch (err) {
    return { success: false, result: err.message };
  }
};

const uploadFilesAndCreateEntries = async (
  files,
  addFilesInArray,
  newLiveClass
) => {
  try {
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
            key: file.key,
            url: file.url,
            classRoomId: id,
          });
          LiveClassRoomFiles.push(newFileToDB);
        });
      } else {
        return "unable to upload files";
      }
    }
    return LiveClassRoomFiles;
  } catch (err) {
    console.log("Error in uploading files and creating entries", err);
  }
};
// DB FUNCTIONS END

// BELOW IS REST APIS HANDLER

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
  try {
    const { body, files, plainAuthData } = req;

    let addFilesInArray = [];
    if (files) {
      addFilesInArray = Array.isArray(files?.files)
        ? files?.files
        : [files?.files];
    }

    const randomCharacters = generateRandomCharacters(10); // generate a unique class room id
    // For creation of new class we need to first check if the body contains all required parameters or not
    if (validateCreationOfLiveClass(body)) {
      const { success, result } = await createLiveClassRoom(
        randomCharacters,
        body,
        plainAuthData
      );
      if (!success) {
        throw new Error("Unable to create new class");
      }
      if (result) {
        const { id } = result;
        const LiveClassRoomFiles = await uploadFilesAndCreateEntries(
          files,
          addFilesInArray,
          result
        );
        const liveClassRoomDetail = await LiveClassRoomDetail.create({
          chapterId: JSON.parse(body.chapter).value,
          chapterName: JSON.parse(body.chapter).label,
          topicId: JSON.parse(body.topic).value,
          topicName: JSON.parse(body.topic).label,
          agenda: body.agenda,
          description: body.description,
          classRoomId: id,
        });

        result.liveClassRoomDetail = liveClassRoomDetail; // create parent child relationship however not necessary

        const combinedData = {
          ...result.toJSON(),
          LiveClassRoomDetail: liveClassRoomDetail.toJSON(),
          LiveClassRoomFiles: LiveClassRoomFiles,
        };
        return res.status(200).json({ data: combinedData });
      } else {
        return res.status(400).json({ error: "Unable to create new class" });
      }
    } else {
      return res.status(400).json({ error: "Some fields are missing!!" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getLiveClassDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ error: "Room Id is required" });
    }
    console.log("liive classroom");
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
