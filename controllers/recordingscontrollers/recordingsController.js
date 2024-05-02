const {
  LiveClassRoom,
  LiveClassRoomRecording,
  LiveClassRoomFile,
  LiveClassRoomDetail,
  LiveClassRoomQNANotes,
  LiveClassRoomNote,
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

    // extra query parameter -> topicId is only required if type is live_specific or solo_specific
    if (!type || !id || (type !== "live" && type !== "solo")) {
      // if not correct query params then return error
      throw new Error("Invalid parameters or no recordings available");
    }

    let responseData = null;
    if (type === "live") {
      // we are expecting to search in liveclassrecordings along with id of classRoom (majorly if user comes from view recording button from frontend )
      responseData = await LiveClassRoom.findOne({
        where: { id: id },
        include: [
          { model: LiveClassRoomDetail },
          { model: LiveClassRoomRecording, order: [["createdAt", "ASC"]] },
          { model: LiveClassRoomFile },
          { model: LiveClassRoomQNANotes },
          { model: LiveClassRoomNote },
        ],
      });
      const data = JSON.stringify(responseData.LiveClassRoomRecordings);
      const LiveClassRecordingLength = JSON.parse(data);

      if (LiveClassRecordingLength.length > 0) {
        const presignedArray = responseData.LiveClassRoomRecordings;
        for (let i = 0; i < LiveClassRecordingLength.length; i++) {
          if (LiveClassRecordingLength[i]) {
            if (LiveClassRecordingLength[i]?.key) {
              const presignedUrl = await generateAWSS3LocationUrl(
                LiveClassRecordingLength[i]?.key
              );
              presignedArray[i].key = presignedUrl;
            }
            if (LiveClassRecordingLength[i]?.hlsDrmUrl) {
              const presignedUrl = await generateAWSS3LocationUrl(
                LiveClassRecordingLength[i]?.hlsDrmUrl
              );
              presignedArray[i].hlsDrmUrl = presignedUrl;
            }
          }
        }
        responseData = responseData.dataValues;
      }
    } else if (type === "solo") {
      // if (!topicId) {
      //   throw new Error("Topic id required to view this recordings");
      // }
      const specificSoloRecording = await SoloClassRoom.findOne({
        where: { id: id },
        include: [
          { model: SoloClassRoomRecording, order: [["createdAt", "ASC"]] },
          { model: SoloClassRoomFiles },
        ],
      });
      console.log("specific", specificSoloRecording);
      const data = JSON.stringify(
        specificSoloRecording.SoloClassRoomRecordings
      );
      const SoloClassRoomRecordingLength = JSON.parse(data);

      if (SoloClassRoomRecordingLength.length > 0) {
        const presignedArray = specificSoloRecording.SoloClassRoomRecordings;
        for (let i = 0; i < SoloClassRoomRecordingLength.length; i++) {
          if (SoloClassRoomRecordingLength[i]) {
            if (SoloClassRoomRecordingLength[i]?.key) {
              const presignedUrl = await generatePresignedUrls(
                SoloClassRoomRecordingLength[i]?.key
              );
              presignedArray[i].key = presignedUrl;
            }
            if (SoloClassRoomRecordingLength[i]?.hlsDrmUrl) {
              const presignedUrl = await generatePresignedUrls(
                SoloClassRoomRecordingLength[i]?.hlsDrmUrl
              );
              presignedArray[i].hlsDrmUrl = presignedUrl;
            }
          }
        }
        responseData = specificSoloRecording.dataValues;
      }
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

const playRecording = async (req, res) => {
  try {
    const { type, recordId } = req.body;
    if (!type || !recordId || (type !== "live" && type !== "solo")) {
      // if not correct query params then return error
      throw new Error("Invalid parameters or no recordings available");
    }
    let jwtToken = null;
    let hlsJwtToken = null;

    if (type === "live") {
      // we need to search in LiveClassRecording table
      const getRecording = await LiveClassRoomRecording.findOne({
        where: { id: recordId },
      });
      if (getRecording?.drmKeyId) {
        const tok = generateDRMJWTToken(getRecording?.drmKeyId);
        jwtToken = tok;
      }
      if (getRecording?.hlsDrmKey) {
        const hlstok = generateDRMJWTToken(getRecording?.hlsDrmKey);
        hlsJwtToken = hlstok;
      }
    } else if (type === "solo") {
      // we need soloclassrecordings
      const getSoloRecording = await SoloClassRoomRecording.findOne({
        where: { id: recordId },
      });
      if (getSoloRecording?.drmKeyId) {
        const tok = generateDRMJWTToken(getSoloRecording?.drmKeyId);
        jwtToken = tok;
      }
      if (getSoloRecording?.hlsDrmKey) {
        const hlstok = generateDRMJWTToken(getSoloRecording?.hlsDrmKey);
        hlsJwtToken = hlstok;
      }
    }
    return res.status(200).json({
      status: true,
      data: { DRMjwtToken: jwtToken, HlsDRMJwtToken: hlsJwtToken },
    });
  } catch (err) {
    console.log("Error in play recordings", err);
    return res.status(400).json({ status: false, data: err.message });
  }
};

module.exports = {
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
};
