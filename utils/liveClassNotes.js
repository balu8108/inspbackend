const { degrees, PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const {
  isObjectExistInS3,
  uploadToS3,
  getObjectFromS3,
} = require("./awsFunctions");

const createOrUpdatePdfFile = async (pdfFile, folderPath, fileName, files) => {
  try {
    const imageFile = await pdfFile.embedJpg(files.screenshot.data);

    const jpgDims = imageFile.scale(0.3);

    const page = pdfFile.addPage();

    const offsetSpace = 20;

    const centerX = page.getWidth() / 2 - jpgDims.width / 2;
    const centerY = page.getHeight() / 2 - jpgDims.height / 2;

    page.drawImage(imageFile, {
      x: centerX,
      y: centerY,
      width: jpgDims.width,
      height: jpgDims.height,
    });
    // Serialize the PDFDocument to bytes (a Uint8Array)
    const modifiedPdfBytes = await pdfFile.save();
    try {
      const uploadingToS3 = await uploadToS3(folderPath, fileName, {
        mimetype: "application/pdf",
        modifiedPdfBytes: modifiedPdfBytes,
      });
      if (uploadingToS3) {
        return {
          success: true,
          result: "Live Class notes added successfully",
          key: uploadingToS3.Key,
          url: uploadingToS3.Location,
        };
      }
    } catch (err) {
      throw new Error("Some error occured while creating pdf file");
    }
  } catch (err) {
    throw new Error("Some error occured while creating pdf file");
  }
};

const createOrUpdateLiveClassNotes = async (folderPath, fileName, files) => {
  try {
    const isLiveClassNotesExists = await isObjectExistInS3(
      folderPath,
      fileName
    );

    if (isLiveClassNotesExists) {
      const liveClassNotesData = await getObjectFromS3(folderPath, fileName);
      const liveClassNotes = await PDFDocument.load(liveClassNotesData.Body);
      const { success, result, key, url } = await createOrUpdatePdfFile(
        liveClassNotes,
        folderPath,
        fileName,
        files
      );

      return { success, result, key, url };
    } else {
      const liveClassNotes = await PDFDocument.create();

      const { success, result, key, url } = await createOrUpdatePdfFile(
        liveClassNotes,
        folderPath,
        fileName,
        files
      );

      return { success, result, key, url };
    }
  } catch (err) {
    // Something wrong happens
    console.log(err);
  }
};

module.exports = { createOrUpdateLiveClassNotes };
