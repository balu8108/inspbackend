const {
  loginHandler,
  loginWithIpHandler,
  loginWithUidHandler,
} = require("./authentication/authController");
const {
  getAllSubjects,
  openFile,
  imageToDoc,
  createFeedback,
  uploadTimeTable,
  getAllTimeTable,
} = require("./genericcontrollers/genericController");
const {
  createLiveClass,
  getAllLiveClasses,
  getLiveClassDetails,
  getUpcomingClass,
  // getLectureNo,
  uploadFilesToClass,
  updateScheduleClassData,
} = require("./scheduleliveclasses/scheduleLiveClassController");
const {
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
} = require("./recordingscontrollers/recordingsController");

const {
  getAllLecture,
  getLectureById,
  getAllLectureByTopicId,
  getLectureNo
} = require("./lectures/lecturesController");

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
  uploadTimeTable,
  getAllTimeTable,
  createLiveClass,
  getAllLiveClasses,
  getLiveClassDetails,
  getUpcomingClass,
  createFeedback,
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
  getLectureNo,
  updateScheduleClassData,
  uploadFilesToClass,
  getAllLecture,
  getLectureById,
  getAllLectureByTopicId,
  loginWithIpHandler,
  createStudentFeedback,
  getAllStudentFeedback,
  deleteFeedbackById,
  loginWithUidHandler,
};
