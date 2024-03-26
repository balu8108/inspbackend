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
          { model: LiveClassRoomQNANotes },
          { model: LiveClassRoomNote },
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
          { model: LiveClassRoomQNANotes },
          { model: LiveClassRoomNote },
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
const viewRecording = async (req, res) => {
  try {
    console.log("req query", req.query);
    const { type, id, topicId } = req.query;

    // extra query parameter -> topicId is only required if type is live_specific or solo_specific
    if (
      !type ||
      !id ||
      (type !== "live" &&
        type !== "solo" &&
        type !== "live_specific" &&
        type !== "solo_specific" &&
        type !== "live_topic" &&
        type !== "solo_topic" &&
        type !== "live_lecture_specific")
    ) {
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
      if (responseData?.LiveClassRoomRecordings.length > 0) {
        const combinedData = {
          ...responseData.dataValues, // Extract data from the Sequelize instance
          activeRecordingToPlay:
            responseData?.LiveClassRoomRecordings[0] ?? null, // Add the activeRecording property
        };

        responseData = combinedData;
      }
    } else if (type === "live_specific") {
      if (!topicId) {
        throw new Error("Topic id required to view this recordings");
      }
      // in live specific user clicks a particular video from library now it will give the id of the liveclassrecording
      // first we retreive the class id for that particular recording
      const specificLiveRecording = await LiveClassRoomRecording.findOne({
        where: { id: id },
      });
      if (specificLiveRecording !== null) {
        const getClassRoomsWithTopicId = await LiveClassRoomDetail.findAll({
          where: { topicId: topicId },
          attributes: ["classRoomId"], // Select only the classRoomId
          raw: true, // Get raw data as an array of objects
        });
        const classRoomIds = getClassRoomsWithTopicId.map(
          (detail) => detail.classRoomId
        );

        responseData = await LiveClassRoom.findAll({
          where: { id: classRoomIds },
          include: [
            { model: LiveClassRoomDetail },
            { model: LiveClassRoomRecording, order: [["createdAt", "ASC"]] },
            { model: LiveClassRoomFile },
            { model: LiveClassRoomQNANotes },
            { model: LiveClassRoomNote },
          ],
        });
        const combinedData = {
          responseData, // Extract data from the Sequelize instance
          activeRecordingToPlay: specificLiveRecording, // Add the activeRecording property
        };

        responseData = combinedData;
      }
    } else if (type === "solo_specific") {
      if (!topicId) {
        throw new Error("Topic id required to view this recordings");
      }
      const specificSoloRecording = await SoloClassRoomRecording.findOne({
        where: { id: id },
      });
      if (specificSoloRecording !== null) {
        responseData = await SoloClassRoom.findAll({
          where: { topicId: topicId },
          include: [
            { model: SoloClassRoomRecording, order: [["createdAt", "ASC"]] },
            { model: SoloClassRoomFiles },
          ],
        });
        const combinedData = {
          responseData,
          activeRecordingToPlay: specificSoloRecording,
        };
        responseData = combinedData;
      }
    } else if (type === "live_topic") {
      const getClassRoomsWithTopicId = await LiveClassRoomDetail.findAll({
        where: { topicId: id },
        attributes: ["classRoomId"], // Select only the classRoomId
        raw: true, // Get raw data as an array of objects
      });
      const classRoomIds = getClassRoomsWithTopicId.map(
        (detail) => detail.classRoomId
      );

      responseData = await LiveClassRoom.findAll({
        where: { id: classRoomIds },
        order: [["createdAt", "ASC"]],
        include: [
          { model: LiveClassRoomDetail },
          { model: LiveClassRoomRecording, order: [["createdAt", "ASC"]] },
          { model: LiveClassRoomFile },
          { model: LiveClassRoomQNANotes },
          { model: LiveClassRoomNote },
        ],
      });

      const combinedData = {
        responseData,
        activeRecordingToPlay:
          responseData?.[0]?.LiveClassRoomRecordings?.[0] ?? null,
      };
      responseData = combinedData;
    } else if (type === "solo_topic") {
      responseData = await SoloClassRoom.findAll({
        where: { topicId: id },
        order: [["createdAt", "ASC"]],
        include: [
          { model: SoloClassRoomRecording, order: [["createdAt", "ASC"]] },
          { model: SoloClassRoomFiles },
        ],
      });

      const combinedData = {
        responseData,
        activeRecordingToPlay:
          responseData?.[0]?.SoloClassRoomRecordings?.[0] ?? null,
      };
      responseData = combinedData;
    } else if (type === "live_lecture_specific") {
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
    if (
      !type ||
      !recordId ||
      (type !== "live" &&
        type !== "solo" &&
        type !== "live_specific" &&
        type !== "solo_specific" &&
        type !== "live_topic" &&
        type !== "solo_topic")
    ) {
      // if not correct query params then return error
      throw new Error("Invalid parameters or no recordings available");
    }
    let jwtToken = null;
    let hlsJwtToken = null;

    if (type === "live" || type === "live_specific" || type === "live_topic") {
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
    } else if (
      type === "solo" ||
      type === "solo_specific" ||
      type === "solo_topic"
    ) {
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
    return res
      .status(200)
      .json({
        status: true,
        data: { DRMjwtToken: jwtToken, HlsDRMJwtToken: hlsJwtToken },
      });
  } catch (err) {
    console.log("Error in play recordings", err);
    return res.status(400).json({ status: false, data: err.message });
  }
};

module.exports = {
  getRecordingsWithDetails,
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
};
