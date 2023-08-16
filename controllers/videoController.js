const AWS = require("aws-sdk");
const fs = require(fs);
const awsUpload = require("../config/awsUpload");
const recordRTC = require("recordrtc");

let recordedStream;

exports.startRecording = function (req, res) {
  if (recordedStream) {
    return res
      .status(400)
      .json({ message: "Screen Recording is already in progress." });
  }
  const base64Stream = req.body.base64Stream;
  const buffer = Buffer.from(base64Stream, "base64");
  recordedStream = recordRTC(buffer, { type: "video" });

  return res
    .status(200)
    .json({ message: "Screen recording started successfully." });
};

exports.stopRecording = function (req, res) {
  if (!recordedStream) {
    return res
      .status(400)
      .json({ message: "No screen recording in progress to stop." });
  }

  recordedStream.stop((blob) => {
    const s3 = new AWS.S3();
    const bucketName = "bucket-name";
    const fileName = "your-file-name.mp4";

    const params = {
      Bucket: bucketName,
      key: fileName,
      Body: blob,
    };
    s3.upload(params, (s3Err, data) => {
      if (s3Err) {
        console.log("Error uploading to S3:", s3Err);
        return res.status(500).send("Error uploading to S3");
      }
      console.log("File uploaded to S3:", data.Location);

      recordedStream = null;
      return res.status(200).json({ url: data.Location });
    });
  });
};

exports.uploadVideo = function (req, res) {
  const tempPath = "uploads/your-recorded-video.mp4";
  const bucketName = "your bucket name";
  const fileName = "your-file-name.mp4";

  awsUpload.uploadFileToS3(tempPath, bucketName, fileName, (err, s3Url) => {
    if (err) {
      return res.status(500).send("Error uploading to S3");
    }
    return res.status(200).json({ url: s3Url });
  });
};

//assass