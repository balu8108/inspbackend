const { loginHandler } = require("./authentication/authController");
const {
  getAllSubjects,
  openFile,
  imageToDoc,
  generateGetPresignedUrl,
  createFeedback,
} = require("./genericcontrollers/genericController");
const {
  createLiveClass,
  getAllLiveClasses,
  getLiveClassDetails,
  getUpcomingClass,
} = require("./scheduleliveclasses/scheduleLiveClassController");
const {
  getRecordingsWithDetails,
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
} = require("./recordingscontrollers/recordingsController");

module.exports = {
  loginHandler,
  getAllSubjects,
  openFile,
  imageToDoc,
  createLiveClass,
  getAllLiveClasses,
  getLiveClassDetails,
  getUpcomingClass,
  generateGetPresignedUrl,
  createFeedback,
  getRecordingsWithDetails,
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
};
