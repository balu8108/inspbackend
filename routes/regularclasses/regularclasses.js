const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  isAuthenticated,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");

const { getLectureDetails,getAllLectureByTopicName } = require("../../controllers/regularclasses/regularclasses");

router.get(
  routesConstants.GET_LECTURE_BY_TOPIC_NAME,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAllLectureByTopicName
);

router.get(
  routesConstants.GET_SINGLE_LECTURE_DETAIL,
   isAuthenticated,
  checkPaidStatusOrTeacher,
  getLectureDetails
)

module.exports = router;
