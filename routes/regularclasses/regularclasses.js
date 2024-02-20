const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
    isAuthenticated,
    isTeacher,
    checkPaidStatusOrTeacher,
} = require("../../middlewares");
const { getAllLectureByTopicName, getLectureById } = require("../../controllers");

router.get(
    routesConstants.GET_LECTURE_BY_TOPIC_NAME,
    //   isAuthenticated,
    //   checkPaidStatusOrTeacher,
    getAllLectureByTopicName
)
// router.get(
//   routesConstants.GET_LECTURE_BY_ID,
//   isAuthenticated,
//   checkPaidStatusOrTeacher,
//   getLectureById
// )
module.exports = router;
