const { file } = require("googleapis/build/src/apis/file");
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

module.exports = {
  getAllSubjects,
  openFile,
  imageToDoc,
  generateGetPresignedUrl,
};
