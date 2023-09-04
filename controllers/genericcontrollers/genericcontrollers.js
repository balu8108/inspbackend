const { LiveClassRoomFile } = require("../../models");
const { generatePresignedUrls } = require("../../utils");

const fs = require("fs");
const path = require("path");
const { uploadFilesToS3 } = require("../../utils");
const { degrees, PDFDocument, rgb, StandardFonts } = require("pdf-lib");
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
  fs.readFile("output.pdf", async (err, data) => {
    if (err) {
      return;
    }
    console.log("data", data);
    const pdfDoc = await PDFDocument.load(data);
    const imageFile = await pdfDoc.embedJpg(req.files.imageFile.data);
    const jpgDims = imageFile.scale(0.35);
    console.log("jgpDims", jpgDims);
    const page = pdfDoc.addPage();
    const marginFromTop = 50;
    page.drawImage(imageFile, {
      x: page.getWidth() / 2 - jpgDims.width / 2,
      y: page.getHeight() - jpgDims.height - marginFromTop,
      width: jpgDims.width,
      height: jpgDims.height,
    });

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFile("output.pdf", modifiedPdfBytes, (writeErr) => {
      if (writeErr) {
        console.error(writeErr);
      } else {
        console.log(
          "Text added to the existing PDF and saved to the same file"
        );
      }
    });
  });

  return res.status(200).json({ data: "base 64 image" });
};

module.exports = { getAllSubjects, openFile, imageToDoc };
