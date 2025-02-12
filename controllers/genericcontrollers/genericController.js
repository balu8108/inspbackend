const {
  LiveClassRoomFile,
  LiveClassRoom,
  LiveClassRoomDetail,
  Rating,
  LiveClassRoomRecording,
  SoloClassRoomRecording,
  SoloClassRoomFiles,
  AssignmentFiles,
  TimeTableFile,
} = require("../../models");
const {
  generatePresignedUrls,
  validateCreateFeedBack,
  uploadFilesToS3,
  getTpStreamId,
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
      !(docType === "live" || docType === "solo" || docType === "assignment")
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

const updateRecordingData = async (req, res) => {
  try {
    const { inputFileKey } = req.body;
    if (!inputFileKey) {
      throw new Error("Some required data missing");
    }

    //convert/4Bt1RnUams-1715768877159_output1.mp4
    const fileNameWithExtension = inputFileKey.split("/")[1]; // 4Bt1RnUams-1715768877159.webm
    const fileNameWithoutExtension = fileNameWithExtension.split(".")[0]; // 4Bt1RnUams-1715768877159
    const finalOutputFileKey = `convert/${fileNameWithoutExtension}_output.mp4`;

    const presignedUrls = await generatePresignedUrls(finalOutputFileKey);

    const tpStreamResponse = await getTpStreamId(
      `${fileNameWithoutExtension}.mp4`,
      presignedUrls
    );

    const liveRecording = await LiveClassRoomRecording.findOne({
      where: { key: { [Op.like]: `%${inputFileKey}%` } },
    });

    if (liveRecording) {
      liveRecording.tpStreamId = tpStreamResponse;
      liveRecording.status = "Completed";
      liveRecording.save();
    }
    // Now if above we are not able to find recording in live one then there may be possiblity we have recording under solorecord tabel
    const soloRecord = await SoloClassRoomRecording.findOne({
      where: { key: { [Op.like]: `%${inputFileKey}%` } },
    });
    if (soloRecord) {
      soloRecord.tpStreamId = tpStreamResponse;
      soloRecord.status = "Completed";
      soloRecord.save();
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
    const data = JSON.stringify(timetableData);
    const TimeTableLength = JSON.parse(data);
    const presignedArray = timetableData;
    for (let i = 0; i < TimeTableLength.length; i++) {
      const presignedUrl = await generatePresignedUrls(TimeTableLength[i]?.url);
      presignedArray[i].url = presignedUrl;
    }
    return res
      .status(200)
      .json({ message: "All timetable data", data: presignedArray });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteTimeTable = async (req, res) => {
  try {
    const { id } = req.params;
    const timeTableData = await TimeTableFile.findByPk(id);

    if (!timeTableData) {
      return res.status(404).json({ error: "Time table not found" });
    }

    // Delete the assignment
    await timeTableData.destroy();

    // Respond with a success message
    res.status(200).send({ message: "Time table deleted" });
  } catch (error) {
    console.error("Error deleting time table:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the time table" });
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
            url: file.key,
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
  createFeedback,
  latestfeedback,
  getCompletedLiveClasses,
  getTopicDetails,
  updateRecordingData,
  uploadTimeTable,
  getAllTimeTable,
  deleteTimeTable,
};
