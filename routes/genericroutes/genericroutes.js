// This file gives api data which can be used throughout the application
// such as fetching subjects from database

const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  getAllSubjects,
  openFile,
  createFeedback,
  uploadTimeTable,
  getAllTimeTable,
  createMauTracker,
  deleteTimeTable,
} = require("../../controllers");
const {
  isAuthenticated,
  isTeacher,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");
const {
  latestfeedback,
  getCompletedLiveClasses,
  getTopicDetails,
  updateRecordingData,
} = require("../../controllers/genericcontrollers/genericController");

router.get(routesConstants.GET_ALL_SUBJECTS, getAllSubjects);
router.get(
  `${routesConstants.OPEN_FILE}`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  openFile
);
router.post(
  `${routesConstants.UPLOAD_TIMETABLE}`,
  isAuthenticated,
  isTeacher,
  uploadTimeTable
);
router.get(
  `${routesConstants.GET_ALL_TIMETABLE}`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAllTimeTable
);
router.delete(
  `${routesConstants.DELETE_TIMETABLE}/:id`,
  isAuthenticated,
  isTeacher,
  deleteTimeTable
);
router.post(
  routesConstants.CREATE_FEEDBACK,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  createFeedback
);
router.get(routesConstants.LATEST_FEEDBACK, latestfeedback);
router.get(
  routesConstants.LATEST_COMPLETEDCLASSROOM,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getCompletedLiveClasses
);
router.get(
  `${routesConstants.TOPIC_FEEDBACK_RATING_DETAILS}/:topicId`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getTopicDetails
);
router.post(
  `${routesConstants.CREATE_MAU_REPORT}`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  createMauTracker
);

router.post(routesConstants.UPDATE_RECORDING_DATA, updateRecordingData);
module.exports = router;
