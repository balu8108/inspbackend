const Sequelize = require("sequelize");
const { Op } = Sequelize;
const {
  LiveClassRoom,
  LiveClassRoomDetail,
  LiveClassRoomFile,
  SoloClassRoom,
  LiveClassNotificationStatus,
  SoloClassRoomFiles,
} = require("../../models");
const {
  generateRandomCharacters,
  validateCreationOfLiveClass,
  validateUpdateScheduleLiveClass,
  uploadFilesToS3,
  categoriseClass,
} = require("../../utils");
const { classStatus } = require("../../constants");
const moment = require("moment-timezone");
moment.tz.setDefault("Asia/Kolkata");

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
      classType: body.classType,
      classLevel: body.classLevel,
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

const extractDateInYYYMMDD = (date) => {
  return date.split("T")[0];
};

const getAllCalenderClasses = async (req, res) => {
  try {
    const liveClassesData = await LiveClassRoom.findAll({
      include: [{ model: LiveClassRoomDetail }],
    });
    const finalResult = [];
    if (liveClassesData) {
      liveClassesData.forEach((obj) => {
        const filteredData = {
          id: obj?.id,
          title:
            obj?.LiveClassRoomDetail?.topicName === null
              ? "General"
              : obj?.LiveClassRoomDetail?.topicName,
          classType: obj?.classType,
          classLevel: obj?.classLevel,
          start: `${extractDateInYYYMMDD(obj?.scheduledDate.toISOString())}T${
            obj?.scheduledStartTime
          }`,
          end: `${extractDateInYYYMMDD(obj?.scheduledDate.toISOString())}T${
            obj?.scheduledEndTime
          }`,
        };
        finalResult.push(filteredData);
      });
    }
    res.status(200).json({ data: finalResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DB FUNCTIONS END
const getAllLiveClasses = async (req, res) => {
  const currentDate = moment();
  const startOfWeek = currentDate.startOf("week").toISOString();
  const endOfWeek = currentDate.endOf("week").toISOString();
  let scheduledClasses = { Ongoing: [], Today: [], Week: [], Completed: [] };
  try {
    const liveClassesData = await LiveClassRoom.findAll({
      where: {
        scheduledDate: {
          [Op.between]: [startOfWeek, endOfWeek],
        },
      },
      include: [{ model: LiveClassRoomDetail }, { model: LiveClassRoomFile }],
    });
    if (liveClassesData) {
      liveClassesData.forEach((obj) => {
        const categorisedClass = categoriseClass(obj);
        if (scheduledClasses[categorisedClass]) {
          scheduledClasses[categorisedClass].push(obj);
        }
      });
    }

    res.status(200).json({ data: scheduledClasses });
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
        throw new Error(result);
      }
      if (result) {
        const { id } = result;
        const LiveClassRoomFiles = await uploadFilesAndCreateEntries(
          files,
          addFilesInArray,
          result
        );
        const liveClassRoomDetail = await LiveClassRoomDetail.create({
          chapterId: JSON.parse(body.chapter)?.value,
          chapterName: JSON.parse(body.chapter)?.label,
          topicId: JSON.parse(body.topic)?.value,
          topicName: JSON.parse(body.topic)?.label,
          agenda: body.agenda,
          description: body.description,
          classRoomId: id,
          lectureNo: body.lectureNo,
        });

        let timestamp = moment.tz(
          `${body.scheduledDate} ${body.scheduledStartTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata"
        );

        // Subtract 15 minutes
        let minus15mintimeStamp = timestamp.subtract(15, "minutes").format();

        await LiveClassNotificationStatus.create({
          liveClassNotificationStatus: "PENDING",
          classRoomId: id,
          notificationClassType: "LIVE_CLASS",
          notificationType: "EMAIL+SMS",
          notificationSubject: "Meeting Reminder",
          notificationSendingTime: minus15mintimeStamp,
        });

        result.liveClassRoomDetail = liveClassRoomDetail; // create parent child relationship however not necessary

        const combinedData = {
          ...result.toJSON(),
          LiveClassRoomDetail: liveClassRoomDetail.toJSON(),
          LiveClassRoomFiles: LiveClassRoomFiles,
        };

        const categorisedClass = categoriseClass(combinedData);

        const filteredData = {
          ...combinedData,
          category: categorisedClass,
        };

        return res.status(200).json({ data: filteredData });
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

const updateScheduleClassData = async (req, res) => {
  try {
    const { body, files } = req;

    // Initialize the files array
    let addFilesInArray = [];
    if (files && files.files) {
      addFilesInArray = Array.isArray(files.files)
        ? files.files
        : [files.files];
    }

    // Validate all form data values
    if (!validateUpdateScheduleLiveClass(body)) {
      return res.status(400).json({ error: "Some fields are missing!!" });
    }

    // Find the LiveClass using the provided classId
    const LiveClass = await LiveClassRoom.findByPk(body.classId);

    if (!LiveClass) {
      return res.status(404).json({ error: "Live class not found" });
    }

    // Create a timestamp for the scheduled start time in the specified timezone
    let timestamp = moment.tz(
      `${body.scheduledDate} ${body.scheduledStartTime}`,
      "YYYY-MM-DD HH:mm",
      "Asia/Kolkata"
    );

    // Subtract 15 minutes from the timestamp
    let minus15mintimeStamp = timestamp.subtract(15, "minutes").format();

    // Find the LiveClassNotification for the specified classRoomId
    const LiveClassNotification = await LiveClassNotificationStatus.findOne({
      where: { classRoomId: LiveClass.id },
    });

    if (!LiveClassNotification) {
      return res
        .status(404)
        .json({ error: "Live class notification not found" });
    }

    // Add all new files to the LiveClassRoomFile table
    const result = {
      id: LiveClass.id,
      roomId: LiveClass.roomId,
    };
    await uploadFilesAndCreateEntries(files, addFilesInArray, result);

    // Remove all files from LiveClassRoomFile table that the teacher wants to delete
    if (body.deletedFileIds && body.deletedFileIds.length > 0) {
      let deletedFileIds;
      try {
        deletedFileIds = JSON.parse(body.deletedFileIds);
      } catch (error) {
        return res.status(400).json({ error: "Invalid deletedFileIds format" });
      }

      await LiveClassRoomFile.destroy({
        where: {
          id: {
            [Op.in]: deletedFileIds,
          },
        },
      });
    }

    // Find the LiveClassRoomDetail for the specified classRoomId
    const LiveClassRoomD = await LiveClassRoomDetail.findOne({
      where: { classRoomId: LiveClass.id },
    });

    if (!LiveClassRoomD) {
      return res
        .status(404)
        .json({ error: "Live class room detail not found" });
    }

    // Update the LiveClass with new values
    try {
      await LiveClass.update({
        subjectId: JSON.parse(body.subject)?.value,
        subjectName: JSON.parse(body.subject)?.label,
        classType: body.classType,
        classLevel: body.classLevel,
        scheduledDate: body.scheduledDate,
        scheduledStartTime: body.scheduledStartTime,
        scheduledEndTime: body.scheduledEndTime,
      });

      // Update the LiveClassRoomDetail with new values
      await LiveClassRoomD.update({
        chapterId:
          body.chapter === "null" ? null : JSON.parse(body.chapter)?.value,
        chapterName:
          body.chapter === "null" ? null : JSON.parse(body.chapter)?.label,
        topicId: body.topic === "null" ? null : JSON.parse(body.topic)?.value,
        topicName: body.topic === "null" ? null : JSON.parse(body.topic)?.label,
        agenda: body.agenda,
        description: body.description,
        lectureNo: body.lectureNo,
      });

      // Update the LiveClassNotification with the new notification sending time
      await LiveClassNotification.update({
        notificationSendingTime: minus15mintimeStamp,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error });
    }

    // Return a success message
    return res.status(200).json({ message: "Class schedule change" });
  } catch (err) {
    // Return an error message if an exception occurs
    return res.status(500).json({ error: err.message });
  }
};

const uploadFilesToClass = async (req, res) => {
  try {
    const { type, classId } = req.params;
    const { files } = req;

    if (!type || !classId || (type !== "live" && type !== "solo")) {
      // if not correct query params then return error
      throw new Error("Invalid parameters or no recordings available");
    }

    if (!classId) {
      return res.status(400).json({ error: "Class Id is required" });
    }

    let addFilesInArray = [];
    if (files) {
      addFilesInArray = Array.isArray(files?.files)
        ? files?.files
        : [files?.files];
    }

    if (type === "live") {
      const getLiveClassRoom = await LiveClassRoom.findOne({
        where: { id: classId },
      });

      if (getLiveClassRoom) {
        let LiveClassRoomFiles = [];
        if (files) {
          const fileUploads = await uploadFilesToS3(
            addFilesInArray,
            `files/roomId_${getLiveClassRoom.roomId}`
          );
          if (fileUploads) {
            fileUploads.forEach(async (file) => {
              const newFileToDB = await LiveClassRoomFile.create({
                key: file.key,
                classRoomId: classId,
              });
              LiveClassRoomFiles.push(newFileToDB);
            });
            return res.status(200).json({ message: "Uploaded files" });
          } else {
            throw new Error("unable to upload files");
          }
        }
      } else {
        throw new Error("No Live Class Found with this Room Id");
      }
    } else if (type === "solo") {
      // we need soloclassrecordings
      const getSoloRecording = await SoloClassRoom.findOne({
        where: { id: classId },
      });
      if (getSoloRecording) {
        let SoloClassRoomFile = [];
        if (files) {
          const fileUploads = await uploadFilesToS3(
            addFilesInArray,
            `soloclassroomfiles/soloclassId_${classId}`
          );
          if (fileUploads) {
            fileUploads.forEach(async (file) => {
              const newFileToDB = await SoloClassRoomFiles.create({
                key: file.key,
                soloClassRoomId: classId,
              });
              SoloClassRoomFile.push(newFileToDB);
            });
            return res.status(200).json({ message: "Uploaded files" });
          } else {
            throw new Error("unable to upload files");
          }
        }
      } else {
        throw new Error("No Solo Class Found with this Room Id");
      }
    }
  } catch (err) {
    console.log("Error", err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createLiveClass,
  getAllLiveClasses,
  getAllCalenderClasses,
  getLiveClassDetails,
  getUpcomingClass,
  uploadFilesToClass,
  updateScheduleClassData,
};
