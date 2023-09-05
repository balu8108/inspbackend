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

const isObjectExistInS3 = async (filePath) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: filePath,
    };

    s3.headObject(params, (err, data) => {
      if (err) {
        if (err.code === "NotFound") {
          resolve(false);
        } else {
          reject(err);
        }
      } else {
        resolve(true);
      }
    });
  });
};

const getObjectFromS3 = async (filePath) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: filePath,
    };

    s3.getObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const uploadToS3 = async (filePath, body) => {
  console.log("uploading to s3", filePath);
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: filePath, // Include folderPath in the key
      Body: body,
    };
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

module.exports = {
  uploadFilesToS3,
  generatePresignedUrls,
  isObjectExistInS3,
  getObjectFromS3,
  uploadToS3,
};
