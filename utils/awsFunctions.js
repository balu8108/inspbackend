const { URL } = require("url");
const aws = require("aws-sdk");
const dotenv = require("dotenv");
dotenv.config({ path: "config/.env" });
// These static files include to be added within files

aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new aws.S3();

const uploadFilesToS3 = async (files, folderPath) => {
  // folder path can be like
  // files/roomId[jhbqwdui]
  // expecting array of files here
  return Promise.all(
    files.map((file) => {
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${folderPath}/${file.name}`, // Include folderPath in the key
        Body: file.data,
      };

      return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
          if (err) {
            reject(err);
          } else {
            console.log("data", data);
            resolve(data.Location);
          }
        });
      });
    })
  );
};

const generatePresignedUrls = async (fileUrl) => {
  const url = new URL(fileUrl);
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: url.pathname.slice(1),
      Expires: 3600,
    };
    s3.getSignedUrl("getObject", params, (err, url) => {
      if (err) {
        reject(err);
      } else {
        resolve(url);
      }
    });
  });
};

module.exports = { uploadFilesToS3, generatePresignedUrls };
