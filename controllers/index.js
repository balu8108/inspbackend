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
} = require("./scheduleliveclasses/scheduleLiveClassController");
const {
  getRecordingsWithDetails,
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
} = require("./recordingscontrollers/recordingsController");

const {
  getAllCrashCourseLecture,
  getLectureById,
} = require("./crashcoursecontroller/crashCourserController");
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
  getAllCrashCourseLecture,
  getLectureById,
  loginWithIpHandler,
  createStudentFeedback,
  getAllStudentFeedback,
  deleteFeedbackById,
  loginWithUidHandler,
};
