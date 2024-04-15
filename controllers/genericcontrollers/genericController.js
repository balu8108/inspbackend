const {
  LiveClassRoomFile,
  LiveClassRoom,
  LiveClassRoomQNANotes,
  LiveClassRoomDetail,
  Rating,
  LiveClassRoomRecording,
  SoloClassRoomRecording,
  SoloClassRoomFiles,
  AssignmentFiles,
  LiveClassRoomNote,
  TimeTableFile,
} = require("../../models");
const {
  generatePresignedUrls,
  createOrUpdateQnANotes,
  validateCreateFeedBack,
  splitStringWithSlash,
  formM3U8String,
  formMPDString,
  uploadFilesToS3,
} = require("../../utils");
const uuidv4 = require("uuid").v4;

const { Op } = require("sequelize");

const getAllSubjects = async (req, res) => {
  return res.status(200).json({ data: "No Subjects" });
};

const openFile = async (req, res) => {
  try {
    const { docId, docType } = req.query;

    if (!docId || !docType) {
      return res.status(400).json({ error: "File id and type is required" });
    }
    if (
      docType &&
      !(
        docType === "live" ||
        docType === "solo" ||
        docType === "assignment" ||
        docType === "qna" ||
        docType === "note"
      )
    ) {
      return res
        .status(400)
        .json({ error: "File type can be only live,solo,assignment,qna,note" });
    }
    // All files uploaded to S3 so we need to generate presigned urls
    let file = null;
    if (docType === "live") {
      file = await LiveClassRoomFile.findOne({ where: { id: docId } });
    } else if (docType === "solo") {
      file = await SoloClassRoomFiles.findOne({ where: { id: docId } });
    } else if (docType === "assignment") {
      file = await AssignmentFiles.findOne({ where: { id: docId } });
    } else if (docType === "qna") {
      file = await LiveClassRoomQNANotes.findOne({ where: { id: docId } });
    } else if (docType === "note") {
      file = await LiveClassRoomNote.findOne({ where: { id: docId } });
    }

    if (!file) {
      throw new Error("No file found with this id");
    } else {
      const presignedUrls = await generatePresignedUrls(file.key);
      return res
        .status(200)
        .json({ status: true, data: { getUrl: presignedUrls } });
    }
  } catch (err) {
    return res.status(400).json({ status: false, data: err.message });
  }
};

const imageToDoc = async (req, res) => {
  try {
    const { body, files } = req;

    if (!body.roomId) {
      return res.status(400).json({ error: "Room Id is required" });
    }

    const isRoomExist = await LiveClassRoom.findOne({
      where: { roomId: body.roomId },
    });
    if (!isRoomExist) {
      return res.status(400).json({ error: "No room found with this id" });
    }

    const folderPath = `qnaNotes`; // in AWS S3
    const fileName = `qnaNotes_roomId_${body.roomId}.pdf`;

    const { success, result, key, url } = await createOrUpdateQnANotes(
      folderPath,
      fileName,
      body,
      files
    );

    if (success && key && url) {
      const isQnaNotesExistForThisRoom = await LiveClassRoomQNANotes.findOne({
        where: { classRoomId: isRoomExist.id },
      });
      if (!isQnaNotesExistForThisRoom) {
        await LiveClassRoomQNANotes.create({
          key: key,
          url: url,
          classRoomId: isRoomExist.id,
        });
      }

      return res.status(200).json({ data: result });
    } else {
      return res
        .status(400)
        .json({ error: "Some error occured while adding qna notes" });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const createFeedback = async (req, res) => {
  try {
    const { body, plainAuthData } = req;

    if (plainAuthData && validateCreateFeedBack(body)) {
      const { id, name } = plainAuthData;
      const { topicId, rating, feedback } = body;
      const feedbackCreation = await Rating.create({
        topicId: topicId,
        raterId: id,
        raterName: name,
        rating: rating,
        feedback: feedback,
      });
      if (!feedbackCreation) {
        throw new Error("Something went wrong while saving feedback");
      }
      return res
        .status(200)
        .json({ status: true, data: "Feedback created successfully" });
    } else {
      throw new Error("Something went wrong");
    }
  } catch (err) {
    return res.status(400).json({ status: false, error: err.message });
  }
};

const latestfeedback = async (req, res) => {
  try {
    // Fetch the latest three live classes
    const latestLiveClasses = await LiveClassRoom.findAll({
      where: { classStatus: "FINISHED" }, // Filter by classStatus if needed
      limit: 3, // Limit the result to the latest three classes
      order: [["createdAt", "DESC"]], // Order by createdAt in descending order
      include: [
        {
          model: LiveClassRoomDetail,
          as: "LiveClassRoomDetail",
        },
      ],
    });

    const topicIds = latestLiveClasses.map(
      (liveClass) => liveClass.LiveClassRoomDetail.topicId
    );

    const topicDetails = await LiveClassRoomDetail.findAll({
      where: { topicId: topicIds },
    });
    const latestRatings = await Rating.findAll({
      where: { topicId: topicIds },
      limit: 3,
      order: [["createdAt", "DESC"]],
    });

    const latestData = latestLiveClasses.map((liveClass) => {
      const { topicId } = liveClass.LiveClassRoomDetail;
      const topicDetail = topicDetails.find(
        (detail) => detail.topicId === topicId
      );
      const ratings = latestRatings.filter(
        (rating) => rating.topicId === topicId
      );
      return {
        topicName: topicDetail.topicName,
        mentorName: liveClass.mentorName,
        description: topicDetail.description,
        ratings: ratings,
      };
    });

    // Return the latest data in the response
    res.status(200).json(latestData);
  } catch (error) {
    console.error("Error fetching latest data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getCompletedLiveClasses = async (req, res) => {
  try {
    const completedLiveClasses = await LiveClassRoom.findAll({
      where: {
        classStatus: "FINISHED",
      },
      limit: 3,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: LiveClassRoomDetail,
          as: "LiveClassRoomDetail",
        },
      ],
    });

    res.status(200).json(completedLiveClasses);
  } catch (error) {
    console.error("Error fetching completed live classes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTopicDetails = async (req, res) => {
  try {
    const topicId = req.params.topicId;
    const topicDetails = await Rating.findAll({
      where: { topicId },
    });
    res.status(200).json({ topicId, topicDetails });
  } catch (error) {
    console.error("Error fetching topic details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const formMPDKey = (inputFileKey, outputFolder) => {
  try {
    const splitKeyToArray = splitStringWithSlash(inputFileKey);
    const convertToMPDformat = formMPDString(splitKeyToArray);
    const finalOutputKey = `${outputFolder}/${convertToMPDformat}`;
    return finalOutputKey;
  } catch (err) {
    console.log("Err", err);
    throw err;
  }
};

const formM3U8Key = (inputFileKey, outputFolder) => {
  try {
    const splitKeyToArray = splitStringWithSlash(inputFileKey);
    const convertToMPDformat = formM3U8String(splitKeyToArray);
    const finalOutputKey = `${outputFolder}/${convertToMPDformat}`;
    return finalOutputKey;
  } catch (err) {
    console.log("Err", err);
    throw err;
  }
};

// THE BELOW IS A SPECIAL API TO UPDATE KEY AND URL OF RECORDINGS UPLOADED TO AWS
// WHEN WEBM OR MP4 VIDEO FILE UPLOADED IN AWS S3 THEN AWS LAMBDA CONVERTS INTO m3u8 FORMAT USING MEDIACONVERT API
// THEN AFTER SUCCESS JOB CREATION IT WILL TRIGGER THIS API TO UPDATE DATABASES
const updateRecordingData = async (req, res) => {
  try {
    const { bucketName, inputFileKey, outputFolder, drmKeyId, hlsDrmKeyId } =
      req.body;
    // we expect the above data from AWS lambda
    // input file key is to search in db whether the inputFileKey is present in any of recording table means either in Live or soloRecord
    // Example of above data:-
    // bucketName = insp_development_bucket // bucket name where all recordings will live
    // inputFileKey = liverecords/sample.webm // key of the input bucket , required for searching and to form .m3u8 from it
    // outputFolder - outputvideofiles //this folder is output folder where all the m3u8 recoridng will live
    // therefore the new key we need to form with this data is somethinglike:
    // outputvideofiles/sample.m3u8
    if (!bucketName || !inputFileKey || !outputFolder || !hlsDrmKeyId) {
      throw new Error("Some required data missing");
    }

    const liveRecording = await LiveClassRoomRecording.findOne({
      where: { key: { [Op.like]: `%${inputFileKey}%` } },
    });

    if (liveRecording) {
      const finalOutputKey = formMPDKey(inputFileKey, outputFolder);
      const finalHlsOutputKey = formM3U8Key(inputFileKey, outputFolder);
      if (finalOutputKey) {
        liveRecording.key = finalOutputKey;
        liveRecording.hlsDrmKey = hlsDrmKeyId;
        liveRecording.hlsDrmUrl = finalHlsOutputKey;
        liveRecording.drmKeyId = drmKeyId;
        liveRecording.save();
      }
    }
    // Now if above we are not able to find recording in live one then there may be possiblity we have recording under solorecord tabel
    const soloRecord = await SoloClassRoomRecording.findOne({
      where: { key: { [Op.like]: `%${inputFileKey}%` } },
    });
    if (soloRecord) {
      const finalOutputKey = formMPDKey(inputFileKey, outputFolder);
      const finalHlsOutputKey = formM3U8Key(inputFileKey, outputFolder);
      if (finalOutputKey) {
        soloRecord.key = finalOutputKey;
        soloRecord.hlsDrmKey = hlsDrmKeyId;
        soloRecord.hlsDrmUrl = finalHlsOutputKey;
        soloRecord.drmKeyId = drmKeyId;
        soloRecord.save();
      }
    }
    return res.status(200).json({
      success: true,
      data: liveRecording || soloRecord,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

const getAllTimeTable = async (req, res) => {
  try {
    const timetableData = await TimeTableFile.findAll();
    return res
      .status(200)
      .json({ message: "All timetable data", data: timetableData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const uploadTimeTable = async (req, res) => {
  try {
    const { files } = req;

    let addFilesInArray = [];
    if (files) {
      addFilesInArray = Array.isArray(files?.files)
        ? files?.files
        : [files?.files];
    }

    if (files) {
      const fileUploads = await uploadFilesToS3(
        addFilesInArray,
        `timetable/timetable_${uuidv4()}`
      );
      if (fileUploads) {
        fileUploads.forEach(async (file) => {
          await TimeTableFile.create({
            url: file.url,
          });
        });
        return res.status(200).json({ message: "Uploaded files" });
      } else {
        throw new Error("unable to upload files");
      }
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllSubjects,
  openFile,
  imageToDoc,
  createFeedback,
  latestfeedback,
  getCompletedLiveClasses,
  getTopicDetails,
  updateRecordingData,
  uploadTimeTable,
  getAllTimeTable,
};
