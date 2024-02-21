const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  isAuthenticated,
  isTeacher,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");
const { getAllCrashCourseLecture, getLectureById } = require("../../controllers");

router.get(
  routesConstants.GET_ALL_CRASH_COURSE_LECTURE,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAllCrashCourseLecture
)
router.get(
  routesConstants.GET_LECTURE_BY_ID,
  // isAuthenticated,
  // checkPaidStatusOrTeacher,
  getLectureById
)
module.exports = router;