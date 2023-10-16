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
} = require("../../controllers");
const { isAuthenticated } = require("../../middlewares");
const {
  latestfeedback,
  getCompletedLiveClasses,
  getTopicDetails,
  updateRecordingData,
} = require("../../controllers/genericcontrollers/genericController");

router.get(routesConstants.GET_ALL_SUBJECTS, getAllSubjects);
router.get(`${routesConstants.OPEN_FILE}/:id`, openFile);
router.post(
  routesConstants.GENERATE_GET_PRESIGNED_URL,
  generateGetPresignedUrl
);
router.post(routesConstants.IMAGE_TO_DOC, imageToDoc);
router.post(routesConstants.CREATE_FEEDBACK, isAuthenticated, createFeedback);
router.get(routesConstants.LATEST_FEEDBACK, isAuthenticated, latestfeedback);
router.get(routesConstants.LATEST_COMPLETEDCLASSROOM, getCompletedLiveClasses);
router.get(
  `${routesConstants.TOPIC_FEEDBACK_RATING_DETAILS}/:topicId`,
  getTopicDetails
);

router.post(routesConstants.UPDATE_RECORDING_DATA, updateRecordingData);
module.exports = router;
