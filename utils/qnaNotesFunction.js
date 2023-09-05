const fs = require("fs");
const { degrees, PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const { utilityConstants } = require("../constants");
const {
  isObjectExistInS3,
  getObjectFromS3,
  uploadToS3,
} = require("./awsFunctions");

const createOrUpdatePdfFile = async (pdfFile, fileLoc, data, files) => {
  try {
    const fontFamily = await pdfFile.embedFont(StandardFonts.TimesRoman);
    const imageFile = await pdfFile.embedJpg(files.screenshot.data);
    const jpgDims = imageFile.scale(0.35);
    const page = pdfFile.addPage();
    const fontSize = 20;
    const marginFromTop = 80;
    const offsetSpace = 20;
    page.drawText(`QNo - ${data.questionNo}\n`, {
      x: 50,
      y: page.getHeight() - marginFromTop,
      size: fontSize,
      font: fontFamily,
    });
    page.drawText(`Type - ${data.type}\n`, {
      x: 50,
      y: page.getHeight() - marginFromTop - offsetSpace,
      size: fontSize,
      font: fontFamily,
    });

    page.drawImage(imageFile, {
      x: page.getWidth() / 2 - jpgDims.width / 2,
      y: page.getHeight() - jpgDims.height - marginFromTop - (offsetSpace + 20),
      width: jpgDims.width,
      height: jpgDims.height,
    });

    page.drawText(`Correct Answers - ${data.correctAnswers}\n`, {
      x: 50,
      y: page.getHeight() - jpgDims.height - marginFromTop - (offsetSpace + 60),
      size: fontSize,
      font: fontFamily,
    });

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const modifiedPdfBytes = await pdfFile.save();

    try {
      const uploadingToS3 = await uploadToS3(fileLoc, modifiedPdfBytes);
      if (uploadingToS3) {
        return { success: true, result: "QnA notes added successfully" };
      }
    } catch (err) {
      throw new Error("Some error occured while creating pdf file");
    }
  } catch (err) {
    throw new Error("Some error occured while creating pdf file");
  }
};

const createOrUpdateQnANotes = async (fileLoc, textData, files) => {
  // This function will create a pdf file of qna notes
  // We need to check first if fileLoc already exist
  // If exist then read the content first and then again write the content including the new content
  // If not exist then create a new file and write the content
  // In data we will receive the data buffer of imageFile (Which is screenshot coming from frontend)
  // and some text data

  const textDataObj = JSON.parse(textData.data);

  try {
    const isQnANotesExists = await isObjectExistInS3(fileLoc);

    if (isQnANotesExists) {
      const qnaNotesData = await getObjectFromS3(fileLoc);
      const qnaNotes = await PDFDocument.load(qnaNotesData.Body);
      const { success, result } = await createOrUpdatePdfFile(
        qnaNotes,
        fileLoc,
        textDataObj,
        files
      );
      return { success, result };
    } else {
      const qnaNotes = await PDFDocument.create();

      const { success, result } = await createOrUpdatePdfFile(
        qnaNotes,
        fileLoc,
        textDataObj,
        files
      );

      return { success, result };
    }
  } catch (err) {
    // Something wrong happens
    console.log(err);
  }
};

module.exports = createOrUpdateQnANotes;
