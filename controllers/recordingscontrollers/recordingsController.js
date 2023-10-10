const {
  LiveClassRoom,
  LiveClassRoomRecording,
  LiveClassRoomFile,
  LiveClassRoomDetail,
} = require("../../models");
const {
  isObjectExistInS3ByKey,
  generatePresignedUrls,
} = require("../../utils");
const getRecordingsWithDetails = async (req, res) => {
  try {
    const { type, id } = req.query;
    if (!type || !id || (type !== "class" && type !== "topic")) {
      // if not correct query params then return error
      throw new Error("Invalid parameters or no recordings available");
    }
    let recordings = [];
    if (type === "class") {
      // In type class we will expect primary key of that live class room of which we need to fetch the recording
      recordings = await LiveClassRoom.findOne({
        where: { id: id },
        include: [
          { model: LiveClassRoomDetail },
          { model: LiveClassRoomRecording, order: [["createdAt", "ASC"]] },
          { model: LiveClassRoomFile },
        ],
      });
    }
    if (type === "topic") {
      // If type === topic then we expect that it is coming from topics screen or library
      // get all the recordings of that topic
      const getClassRoomsWithTopicId = await LiveClassRoomDetail.findAll({
        where: { topicId: id },
        attributes: ["classRoomId"], // Select only the classRoomId
        raw: true, // Get raw data as an array of objects
      });
      const classRoomIds = getClassRoomsWithTopicId.map(
        (detail) => detail.classRoomId
      );
      recordings = await LiveClassRoom.findAll({
        where: { id: classRoomIds },
        include: [
          { model: LiveClassRoomDetail },
          { model: LiveClassRoomRecording, order: [["createdAt", "ASC"]] },
          { model: LiveClassRoomFile },
        ],
      });
    }

    return res.status(200).json({ status: true, data: recordings });
  } catch (err) {
    return res.status(400).json({ status: false, data: err.message });
  }
};

const getSingleRecording = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      throw new Error("Invalid parameters or no recordings available");
    }
    const recording = await LiveClassRoomRecording.findOne({
      where: { id: id },
    });
    // After getting recording use its key to generate aws presigned url that we can use to display video at frontend
    if (!recording) {
      return res
        .status(200)
        .json({ status: true, data: "No Recording available" });
    }

    const isRecordingAvailableInAWSS3 = await isObjectExistInS3ByKey(
      recording?.key
    );

    if (!isRecordingAvailableInAWSS3) {
      throw new Error("No Recording available");
    }
    const getPresignedUrl = await generatePresignedUrls(recording?.key);

    return res.status(200).json({
      status: true,
      data: { recordingData: recording, awsPresignedUrls: getPresignedUrl },
    });
  } catch (err) {
    return res.status(400).json({ status: false, data: err.message });
  }
};

const getRecordingsByTopicOnly = async (req, res) => {
  try {
    const { topicId } = req.body;

    if (!topicId) {
      throw new Error("Topic id is required");
    }
    // From Insp website we will get the TopicId in body and will get all the recording of that topics
    // At the moment we include only liveClassRecording
    // Later we need to introduce non live one

    const getClassRoomsWithTopicId = await LiveClassRoomDetail.findAll({
      where: { topicId: topicId },
      attributes: ["classRoomId"], // Select only the classRoomId
      raw: true, // Get raw data as an array of objects
    });

    const classRoomIds = getClassRoomsWithTopicId.map(
      (detail) => detail.classRoomId
    );
    const allRecordings = await LiveClassRoomRecording.findAll({
      where: { classRoomId: classRoomIds },
    });
    return res.status(200).json({ status: true, data: allRecordings });
  } catch (err) {
    return res.status(400).json({ status: false, data: err.message });
  }
};
module.exports = {
  getRecordingsWithDetails,
  getSingleRecording,
  getRecordingsByTopicOnly,
};
