const {
  LiveClassRoomFile,
  LiveClassRoom,
  LiveClassRoomQNANotes,
  Rating,
} = require("../../models");
const {
  generatePresignedUrls,
  createOrUpdateQnANotes,
  validateCreateFeedBack,
} = require("../../utils");

const getAllSubjects = async (req, res) => {
  return res.status(200).json({ data: "No Subjects" });
};

const generateGetPresignedUrl = async (req, res) => {
  try {
    const { s3_key } = req.body;
    if (!s3_key) {
      throw new Error("s3 url is required");
    }
    const presignedUrls = await generatePresignedUrls(s3_key);
    return res
      .status(200)
      .json({ status: true, data: { getUrl: presignedUrls } });
  } catch (err) {
    return res.status(400).json({ status: false, data: err.message });
  }
};

const openFile = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "File id is required" });
  }
  // All files uploaded to S3 so we need to generate presigned urls
  try {
    const file = await LiveClassRoomFile.findOne({ where: { id: id } });
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
// for latest two rating for mentors homepage-
const latestfeedback = async (req, res) => {
  try {
    // Query the database to retrieve the latest two ratings and feedback
    const latestRatings = await Rating.findAll({
      order: [["createdAt", "DESC"]], // Order by createdAt in descending order
      limit: 2, // Limit the result to two records
    });

    // Send the retrieved data as a JSON response
    res.status(200).json(latestRatings);
  } catch (error) {
    // Handle any errors and send an error response if necessary
    console.error("Error fetching latest ratings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllSubjects,
  openFile,
  imageToDoc,
  generateGetPresignedUrl,
  createFeedback,
  latestfeedback,
};
