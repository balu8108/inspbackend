const {
  LiveClassRoom,
  LiveClassRoomRecording,
  LiveClassRoomFile,
  LiveClassRoomDetail,
  SoloClassRoomRecording,
  SoloClassRoom,
  SoloClassRoomFiles,
} = require("../../models");
const {
  isObjectExistInS3ByKey,
  generatePresignedUrls,
  generateDRMJWTToken,
  generateAWSS3LocationUrl,
} = require("../../utils");
const { drmTypeConstant } = require("../../constants");

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

const viewRecording = async (req, res) => {
  try {
    const { type, id } = req.query;

    if (!type || !id || (type !== "live" && type !== "solo")) {
      // if not correct query params then return error
      throw new Error("Invalid parameters or no recordings available");
    }

    let responseData = null;
    if (type === "live") {
      responseData = await LiveClassRoom.findOne({
        where: { id: id },
        include: [
          { model: LiveClassRoomDetail },
          { model: LiveClassRoomRecording, order: [["createdAt", "ASC"]] },
          { model: LiveClassRoomFile },
        ],
      });

      // Label the recordings as "Part X" based on their order
      let tempArray = [];
      if (responseData && responseData.LiveClassRoomRecordings.length > 0) {
        responseData.LiveClassRoomRecordings.forEach((recording, index) => {
          let partWiseRecording = {
            ...recording.dataValues,
            part: `Part ${index + 1}`,
          };

          tempArray.push(partWiseRecording);
        });
      }
      responseData.dataValues.LiveClassRoomRecordings = tempArray;

      responseData = responseData.dataValues;
    } else if (type === "solo") {
      responseData = await SoloClassRoom.findOne({
        where: { id: id },
        include: [
          { model: SoloClassRoomRecording, order: [["createdAt", "ASC"]] },
          { model: SoloClassRoomFiles },
        ],
      });

      let tempArray = [];
      if (responseData && responseData.SoloClassRoomRecordings.length > 0) {
        responseData.SoloClassRoomRecordings.forEach((recording, index) => {
          let partWiseRecording = {
            ...recording.dataValues,
            part: `Part ${index + 1}`,
          };

          tempArray.push(partWiseRecording);
        });
      }
      responseData.dataValues.SoloClassRoomRecording = tempArray;
    } else {
      throw new Error("Invalid recording type");
    }

    return res.status(200).json({
      status: true,
      data: responseData,
    });
  } catch (err) {
    console.log("Error in view recordings", err);
    return res.status(400).json({ status: false, data: err.message });
  }
};

module.exports = {
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
};
