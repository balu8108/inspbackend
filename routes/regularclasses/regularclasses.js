const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  isAuthenticated,
  isTeacher,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");
const {
  getAllLectureByTopicName,
} = require("../../controllers");
const { getLectureDetails } = require("../../controllers/regularclasses/regularclasses");

router.get(
  routesConstants.GET_LECTURE_BY_TOPIC_NAME,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAllLectureByTopicName
);

router.get(
  routesConstants.GET_SINGLE_LECTURE_DETAIL,
  getLectureDetails
)

module.exports = router;
