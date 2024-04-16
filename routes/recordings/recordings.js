const express = require("express");
const router = express.Router();

const { routesConstants } = require("../../constants");
const {
  isAuthenticated,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");
const {
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
} = require("../../controllers");

router.get(routesConstants.GET_SINGLE_RECORDING, getSingleRecording);
router.post(
  routesConstants.GET_RECORDING_BY_TOPIC_ONLY,
  getRecordingsByTopicOnly
);
router.get(
  routesConstants.VIEW_RECORDING,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  viewRecording
);
router.post(
  routesConstants.PLAY_RECORDING,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  playRecording
);

module.exports = router;
