// awsUpload.js

const AWS = require('aws-sdk');
const fs = require('fs');

function uploadFileToS3(tempPath, bucketName, fileName, callback) {
  // Read the file from the server
  fs.readFile(tempPath, (err, fileData) => {
    if (err) {
      console.error('Error reading file:', err);
      return callback('Error reading file');
    }

    // Create an instance of the S3 service
    const s3 = new AWS.S3();

    // Configure the S3 parameters for the upload
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileData
    };

    // Upload the file to S3
    s3.upload(params, (s3Err, data) => {
      if (s3Err) {
        console.error('Error uploading to S3:', s3Err);
        return callback('Error uploading to S3');
      }

      // File uploaded successfully
      console.log('File uploaded to S3:', data.Location);
      callback(null, data.Location);
    });
  });
}

module.exports = {
  uploadFileToS3,
};
