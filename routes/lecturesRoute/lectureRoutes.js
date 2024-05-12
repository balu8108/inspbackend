const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  isAuthenticated,
  checkPaidStatusOrTeacher,
  isTeacher,
} = require("../../middlewares");
const {
  getAllLecture,
  getAllLectureByTopicId,
  getLectureById,
  getLectureNo,
} = require("../../controllers");
router.get(
  `${routesConstants.GET_ALL_LECTURE}/:classType/:classLevel`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAllLecture
);
router.post(
  `${routesConstants.GET_LECTURE_NO}`,
  isAuthenticated,
  isTeacher,
  getLectureNo
);

router.get(
  routesConstants.GET_LECTURE_BY_TOPIC_NAME,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAllLectureByTopicId
);

router.get(
  `${routesConstants.GET_LECTURE_BY_ID}/:roomId`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getLectureById
);
module.exports = router;
