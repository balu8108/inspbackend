const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const { isAuthenticated, isTeacher } = require("../../middlewares");

const {
  createSoloClassRoom,
  getLatestSoloclassroom,
  uploadSoloClassRoomRecordings,
  getTopicDetails,
} = require("../../controllers/SoloClassRoom/soloclassroom");

router.post(
  routesConstants.SOLO_CLASSROOM,
  isAuthenticated,
  isTeacher,
  createSoloClassRoom
);
router.get(routesConstants.LATEST_CLASSROOM, getLatestSoloclassroom);
router.post(routesConstants.SOLO_CLASSROOM_RECORDINGS,uploadSoloClassRoomRecordings);
router.get(routesConstants.SOLO_TOPIC_DETAILS_FILES_RECORDINGS,getTopicDetails)

module.exports = router;
