const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  isAuthenticated,
  isTeacher,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");

const {
  createSoloClassRoom,
  getLatestSoloclassroom,
  uploadSoloClassRoomRecordings,
  getTopicDetails,
  generateGetSoloLecturePresignedUrl,
  openSoloLetureFile,
  getSoloClassroomDetails,
  getAllSoloClassRoom,
  getSoloClassForTopicBasedRecording
} = require("../../controllers/SoloClassRoom/soloclassroom");

router.post(
  routesConstants.SOLO_CLASSROOM,
  isAuthenticated,
  isTeacher,
  createSoloClassRoom
);
router.get(
  routesConstants.LATEST_CLASSROOM,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getLatestSoloclassroom
);
router.post(
  `${routesConstants.SOLO_CLASSROOM_RECORDINGS}/:soloClassRoomId`,
  isAuthenticated,
  isTeacher,
  uploadSoloClassRoomRecordings
);
router.get(
  `${routesConstants.SOLO_TOPIC_DETAILS_FILES_RECORDINGS}/:topicId`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getTopicDetails
);
router.get(
  routesConstants.SOLO_CLASSROOM_PRESIGNED_URL,
  generateGetSoloLecturePresignedUrl
); // Not Using anywhere
router.get(`${routesConstants.SOLOCLASSROOM_FILES}/:id`, openSoloLetureFile); // Not using anywhere
router.get(
  `${routesConstants.SOLOCLASSROOM_DETAILS}/:soloClassRoomId`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getSoloClassroomDetails
);

router.get(
  `${routesConstants.GET_ALL_SOLOCLASSROOM}`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAllSoloClassRoom
);

router.get(
  `${routesConstants.GET_SOLOCLASS_FOR_TOPICBASEDRECORDING}/:topicId`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getSoloClassForTopicBasedRecording
);

module.exports = router;
