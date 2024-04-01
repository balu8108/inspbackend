const {
  loginHandler,
  loginWithIpHandler,
  loginWithUidHandler,
} = require("./authentication/authController");
const {
  getAllSubjects,
  openFile,
  imageToDoc,
  generateGetPresignedUrl,
  createFeedback,
  createLiveClassNotes,
} = require("./genericcontrollers/genericController");
const {
  createLiveClass,
  getAllLiveClasses,
  getLiveClassDetails,
  getUpcomingClass,
  getLectureNo,
  uploadFilesToClass,
} = require("./scheduleliveclasses/scheduleLiveClassController");
const {
  getRecordingsWithDetails,
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
} = require("./recordingscontrollers/recordingsController");

const {
  getAllLecture,
  getLectureById,
  getAllLectureByTopicName
 }= require("./lectures/lecturesController");

const {
  createStudentFeedback,
  getAllStudentFeedback,
  deleteFeedbackById,
} = require("./studentfeedback/studentFeedbackController");

module.exports = {
  loginHandler,
  getAllSubjects,
  openFile,
  imageToDoc,
  createLiveClassNotes,
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
  getLectureNo,
  uploadFilesToClass,
  getAllLecture,
  getLectureById,
  getAllLectureByTopicName,
  loginWithIpHandler,
  createStudentFeedback,
  getAllStudentFeedback,
  deleteFeedbackById,
  loginWithUidHandler,
};
