const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const { isAuthenticated, isTeacher } = require("../../middlewares");

const {
  createSoloClassRoom,
  getLatestSoloclassroom,
  uploadSoloClassRoomRecordings,
  getTopicDetails,
  generateGetSoloLecturePresignedUrl,
  openSoloLetureFile,
  getSoloClassroomDetails,
} = require("../../controllers/SoloClassRoom/soloclassroom");

router.post(
  routesConstants.SOLO_CLASSROOM,
  isAuthenticated,
  isTeacher,
  createSoloClassRoom
);
router.get(routesConstants.LATEST_CLASSROOM, getLatestSoloclassroom);
router.post(
  `${routesConstants.SOLO_CLASSROOM_RECORDINGS}/:soloClassRoomId`,
  uploadSoloClassRoomRecordings
);
router.get(
  `${routesConstants.SOLO_TOPIC_DETAILS_FILES_RECORDINGS}/:topicId`,
  getTopicDetails
);
router.get(
  routesConstants.SOLO_CLASSROOM_PRESIGNED_URL,
  generateGetSoloLecturePresignedUrl
);
router.get(`${routesConstants.SOLOCLASSROOM_FILES}/:id`, openSoloLetureFile);
router.get(
  `${routesConstants.SOLOCLASSROOM_DETAILS}/:soloClassRoomId`,
  getSoloClassroomDetails
);

// `${routesConstants.TOPIC_FEEDBACK_RATING_DETAILS}/:topicId`,
module.exports = router;
