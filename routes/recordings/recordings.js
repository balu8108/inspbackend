const express = require("express");
const router = express.Router();

const { routesConstants } = require("../../constants");
const {
  getRecordingsWithDetails,
  getSingleRecording,
  getRecordingsByTopicOnly,
  viewRecording,
  playRecording,
} = require("../../controllers");

router.get(routesConstants.ALL_LIVE_RECORDINGS, getRecordingsWithDetails);
router.get(routesConstants.GET_SINGLE_RECORDING, getSingleRecording);
router.post(
  routesConstants.GET_RECORDING_BY_TOPIC_ONLY,
  getRecordingsByTopicOnly
);
router.get(routesConstants.VIEW_RECORDING, viewRecording);
router.post(routesConstants.PLAY_RECORDING, playRecording);

module.exports = router;
