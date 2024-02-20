const { loginHandler } = require("./authentication/authController");
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
  getLectureNo
} = require("./scheduleliveclasses/scheduleLiveClassController");
const {
  getRecordingsWithDetails,
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
} = require("./recordingscontrollers/recordingsController");
const { getAllLectureByTopicName } = require("./regularclasses/regularclasses");

const {
  getAllCrashCourseLecture,
  getLectureById
} = require("./crashcoursecontroller/crashCourserController");

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
  getAllLectureByTopicName
};
