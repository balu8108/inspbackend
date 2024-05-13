const aws = require("aws-sdk");
const stream = require("stream");
const { getSignedUrl } = require("@aws-sdk/cloudfront-signer");

// These static files include to be added within files
const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_BUCKET_NAME,
  CLOUDFRONT_PRIVATE_KEY,
  CLOUDFRONT_KEY_PAIR_ID,
  CLOUDFRONT_URL,
} = require("../envvar.js");

aws.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

const s3 = new aws.S3();

const generateAWSS3LocationUrl = (fileKey) => {
  return `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`;
};

const generateCDNUrl = (fileKey) => {
  return `https://cdn.inspedu.in/${fileKey}`;
};

const uploadFilesToS3 = async (files, folderPath) => {
  // folder path can be like
  // files/roomId[jhbqwdui]
  // expecting array of files here
  return Promise.all(
    files.map((file) => {
      const params = {
        Bucket: AWS_BUCKET_NAME,
        Key: `${folderPath}/${file.name}`, // Include folderPath in the key
        Body: file.data,
        ContentType: file.mimetype,
      };

      return new Promise((resolve, reject) => {
        s3.upload(params, async (err, data) => {
          if (err) {
            console.log("error in uploading file", err);
            reject(err);
          } else {
            // As putObject doesn't return Location so we need to create it manually
            // If we use upload then we can't provide the contentType to it

            const fileName = encodeURIComponent(file.name).replace(/%20/g, "+");
            const fileKey = `${folderPath}/${file.name}`;
            const getPresignedUrl = await generatePresignedUrls(
              `${folderPath}/${fileName}`
            );
            const modifiedData = {
              ...data,
              Key: fileKey,
              Location: getPresignedUrl,
            };

            resolve({ key: modifiedData.Key, url: modifiedData.Location });
          }
        });
      });
    })
  );
};

const generatePresignedUrls = async (fileKey) => {
  return new Promise((resolve, reject) => {
    const url = getSignedUrl({
      url: `${CLOUDFRONT_URL}/${fileKey}`,
      dateLessThan: new Date(Date.now() + 1000 * 60 * 60),
      privateKey: CLOUDFRONT_PRIVATE_KEY,
      keyPairId: CLOUDFRONT_KEY_PAIR_ID,
    });
    if (url) {
      resolve(url);
    } else {
      reject("");
    }
  });
};

const isObjectExistInS3 = async (folderPath, fileName) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: AWS_BUCKET_NAME,
      Key: `${folderPath}/${fileName}`,
    };

    s3.headObject(params, (err, data) => {
      if (err) {
        if (err.code === "NotFound") {
          resolve(false);
        } else {
          reject(false);
        }
      } else {
        resolve(true);
      }
    });
  });
};

const isObjectExistInS3ByKey = async (key) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: AWS_BUCKET_NAME,
      Key: key,
    };

    s3.headObject(params, (err, data) => {
      if (err) {
        if (err.code === "NotFound") {
          resolve(false);
        } else {
          reject(false);
        }
      } else {
        resolve(true);
      }
    });
  });
};

const getObjectFromS3 = async (folderPath, fileName) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: AWS_BUCKET_NAME,
      Key: `${folderPath}/${fileName}`,
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

const uploadToS3 = async (folderPath, fileName, body) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: AWS_BUCKET_NAME,
      Key: `${folderPath}/${fileName}`, // Include folderPath in the key
      Body: body.modifiedPdfBytes,
      ContentType: body.mimetype,
    };
    s3.putObject(params, async (err, data) => {
      if (err) {
        reject(err);
      } else {
        const fileUrl = encodeURIComponent(fileName).replace(/%20/g, "+");
        const fileKey = `${folderPath}/${fileName}`;
        const getPresignedUrl = await generatePresignedUrls(
          `${folderPath}/${fileUrl}`
        );
        const modifiedData = {
          ...data,
          Key: fileKey,
          Location: getPresignedUrl,
        };
        resolve(modifiedData);
      }
    });
  });
};

// Special function to upload recordings to s3

const uploadRecordingToS3 = async (folderPath, fileName, fileStream) => {
  return new Promise((resolve, reject) => {
    let pass = new stream.PassThrough();
    const params = {
      Bucket: AWS_BUCKET_NAME,
      Key: `${folderPath}/${fileName}`, // Include folderPath in the key
      Body: pass,
      ContentType: "video/webm",
    };
    const uploadRequest = s3.upload(params, async (err, data) => {
      if (err) {
        reject({ success: false, err });
      } else {
        const fileUrl = encodeURIComponent(fileName).replace(/%20/g, "+");
        const fileKey = `${folderPath}/${fileName}`;
        const getPresignedUrl = await generatePresignedUrls(
          `${folderPath}/${fileUrl}`
        );
        const modifiedData = {
          ...data,
          success: true,
          Key: fileKey,
          Location: getPresignedUrl,
        };
        resolve(modifiedData);
      }
    });
    fileStream.pipe(pass);

    uploadRequest.on("httpUploadProgress", (progress) => {
      console.log("Upload in progress...", progress);
    });

    uploadRequest.on("httpDone", () => {
      console.log("Upload completed.");
    });

    uploadRequest.on("complete", () => {
      console.log("Upload request completed.");
    });

    uploadRequest.on("success", (data) => {
      console.log("Upload request success:", data);
    });

    uploadRequest.on("error", (err) => {
      console.error("Upload request error:", err);
      reject(err);
    });
  });
};

module.exports = {
  uploadFilesToS3,
  generatePresignedUrls,
  isObjectExistInS3,
  getObjectFromS3,
  uploadToS3,
  generateAWSS3LocationUrl,
  isObjectExistInS3ByKey,
  uploadRecordingToS3,
};
