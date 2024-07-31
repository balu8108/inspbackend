const {
  loginHandler,
  loginWithUidHandler,
} = require("./authentication/authController");
const {
  getAllSubjects,
  openFile,
  createFeedback,
  uploadTimeTable,
  getAllTimeTable,
} = require("./genericcontrollers/genericController");
const {
  createLiveClass,
  getAllLiveClasses,
  getAllCalenderClasses,
  getLiveClassDetails,
  getUpcomingClass,
  uploadFilesToClass,
  updateScheduleClassData,
} = require("./scheduleliveclasses/scheduleLiveClassController");
const {
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
} = require("./recordingscontrollers/recordingsController");

const {
  getAllLecture,
  getLectureById,
  getAllLectureByTopicId,
  getLectureNo,
} = require("./lectures/lecturesController");

const {
  createStudentFeedback,
  getAllStudentFeedback,
  deleteFeedbackById,
} = require("./studentfeedback/studentFeedbackController");

const { createMauTracker } = require("./mautracker/mauController");

module.exports = {
  loginHandler,
  getAllSubjects,
  openFile,
  uploadTimeTable,
  getAllTimeTable,
  createLiveClass,
  getAllLiveClasses,
  getAllCalenderClasses,
  getLiveClassDetails,
  getUpcomingClass,
  createFeedback,
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  getLectureNo,
  updateScheduleClassData,
  uploadFilesToClass,
  getAllLecture,
  getLectureById,
  getAllLectureByTopicId,
  createStudentFeedback,
  getAllStudentFeedback,
  deleteFeedbackById,
  loginWithUidHandler,
  createMauTracker,
};
