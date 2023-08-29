const { LiveClassRoomFile } = require("../../models");
const { generatePresignedUrls } = require("../../utils");
const getAllSubjects = async (req, res) => {
  //   try {
  //     const subjects = await Subject.findAll();
  //     return res.status(200).json({ data: subjects });
  //   } catch (err) {
  //     return res.status(500).json({ error: err.message });
  //   }
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

module.exports = { getAllSubjects, openFile };
