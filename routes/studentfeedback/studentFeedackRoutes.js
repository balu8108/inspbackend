const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  isAuthenticated,
  isTeacher,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");
const {
  createStudentFeedback,
  getAllStudentFeedback,
  deleteFeedbackById
} = require("../../controllers");

router.post(
  routesConstants.CREATE_STUDENT_FEEDBACK,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  createStudentFeedback
)

router.post(
  routesConstants.GET_ALL_STUDENT_FEEDBACK,
  isAuthenticated,
  isTeacher,
  getAllStudentFeedback
) 

router.delete(
  routesConstants.DELETE_STUDENT_FEEDBACK,
  isAuthenticated,
  isTeacher,
  deleteFeedbackById
)


module.exports = router;