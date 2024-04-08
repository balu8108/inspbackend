// This file gives api data which can be used throughout the application
// such as fetching subjects from database

const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  getAllSubjects,
  openFile,
  imageToDoc,
  generateGetPresignedUrl,
  createFeedback,
  createLiveClassNotes,
  uploadTimeTable,
  getAllTimeTable,
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
  routesConstants.GENERATE_GET_PRESIGNED_URL,
  generateGetPresignedUrl
); // Test api for generating presigned url with s3 key not used in prod or dev
router.post(
  routesConstants.IMAGE_TO_DOC,
  isAuthenticated,
  isTeacher,
  imageToDoc
);
router.post(
  routesConstants.CREATE_LIVE_CLASS_NOTES,
  isAuthenticated,
  isTeacher,
  createLiveClassNotes
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
  isTeacher,
  getAllTimeTable
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

router.post(routesConstants.UPDATE_RECORDING_DATA, updateRecordingData);
module.exports = router;
