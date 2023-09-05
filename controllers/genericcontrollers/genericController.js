const {
  LiveClassRoomFile,
  LiveClassRoom,
  LiveClassRoomQNANotes,
} = require("../../models");
const {
  generatePresignedUrls,
  createOrUpdateQnANotes,
} = require("../../utils");

const path = require("path");

const getAllSubjects = async (req, res) => {
  return res.status(200).json({ data: "No Subjects" });
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
      const presignedUrls = await generatePresignedUrls(file.url);
      return res.status(200).json({ data: { getUrl: presignedUrls } });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
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

    const fileLoc = `qnaNotes/qnaNotes_roomId_${body.roomId}.pdf`; // in AWS S3
    const { success, result, url } = await createOrUpdateQnANotes(
      fileLoc,
      body,
      files
    );

    if (success && url) {
      await LiveClassRoomQNANotes.create({
        url: url,
      });

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

module.exports = { getAllSubjects, openFile, imageToDoc };
