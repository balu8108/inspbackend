const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");
const { uploadRecordingToS3 } = require("../utils/awsFunctions");
const { LiveClassRoom } = require("../models");
const { classStatus } = require("../constants");
const RECORDING_FOLDER = "./recordfiles";
const BACKUP_RECORDING_FOLDER = "./backuprecordfiles";
const AWSS3Folder = "liveclassrecordings"; // folder name in which to put this recording
const elapsedTime = 2; // more than this minutes elapsed after class ends
const LOCK_FILE = path.join(__dirname, "cron.lock");
const util = require("util");
const readdir = util.promisify(fs.readdir);
moment.tz.setDefault("Asia/Kolkata");
const acquireLock = () => {
  // Check if lock file exists
  if (fs.existsSync(LOCK_FILE)) {
    console.log("Another instance of the cron job is already running.");
    return false; // Unable to acquire lock
  }

  // Create lock file
  fs.writeFileSync(LOCK_FILE, "");
  console.log("Lock acquired successfully.");
  return true; // Lock acquired successfully
};

const releaseLock = () => {
  // Delete lock file
  fs.unlinkSync(LOCK_FILE);
  console.log("Lock released successfully.");
};
const recordingToS3 = async () => {
  try {
    if (!acquireLock()) {
      console.log("already locked");
      return; // Exit if unable to acquire lock
    }
    const asof = moment();

    const files = await readdir(RECORDING_FOLDER);

    // Get Recording Files

    for (const fileName of files) {
      if (fileName !== ".keep") {
        const roomId = fileName.split("-")[0];

        const liveRoom = await LiveClassRoom.findOne({
          where: {
            roomId: roomId,
            classStatus: classStatus.FINISHED,
          },
        });

        if (!liveRoom) {
          // Means there is no corresponding class or may be it is not finished yet
          console.log("room  doesn't existed or class not finished");

          break; // break from this loop
        }
        const filePath = path.join(RECORDING_FOLDER, fileName);
        const fileStream = fs.createReadStream(filePath);
        const fileUploadToS3 = await uploadRecordingToS3(
          AWSS3Folder,
          fileName,
          fileStream
        );
        if (fileUploadToS3) {
          // Check success
          if (fileUploadToS3?.success) {
            console.log("Upload successfully mirgating file to backup folder");
            const backupFilePath = path.join(BACKUP_RECORDING_FOLDER, fileName);
            fs.rename(filePath, backupFilePath, function (err) {
              if (err) throw err;
              console.log("Successfully renamed - AKA moved!");
            });
            // Move this file to backup folder
            // TODO: we delete this file
          }
        }
      }
    }

    releaseLock(); // Doesn't matter what happens just release lock

    // Log the list of files
  } catch (err) {
    console.log("Error in uploading recording to aws s3", err);
    releaseLock();
  }
};

module.exports = recordingToS3;
