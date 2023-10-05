const {
  LiveClassRoomFile,
  LiveClassRoom,
  LiveClassRoomQNANotes,
  LiveClassRoomDetail,
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
    console.log("body", body);
    console.log("plain auth data", plainAuthData);

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
      attributes: [
        "mentorName", // Include mentorName from LiveClassRoom
      ],
      include: [
        {
          model: LiveClassRoomDetail,
          as: "LiveClassRoomDetail",
          attributes: ["topicId", "topicName", "description"], // Include these attributes from LiveClassRoomDetail
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
      attributes: ["raterName", "feedback", "rating"],
    });
    res.status(200).json({ topicId, topicDetails });
  } catch (error) {
    console.error("Error fetching topic details:", error);
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
  getCompletedLiveClasses,
  getTopicDetails
};
