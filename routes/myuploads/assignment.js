const express = require("express");
const router = express.Router();

const { routesConstants } = require("../../constants");
const {
  uploadAssignment,
  createAssignment,
  allAssignments,
  deleteAssignment,
  latestAssignments,
  submitAssignment,
} = require("../../controllers/MyUploads/assignments");

const {
  isAuthenticated,
  isTeacher,
} = require("../../middlewares");

router.post(routesConstants.CREATE_ASSIGNMENT, isAuthenticated,isTeacher,createAssignment);
router.get(routesConstants.GET_ASSIGNMENT, allAssignments);
router.delete(
  "routesConstants.DELETE_ASSIGNMENT/:assignmentId",
  deleteAssignment
);
router.get(routesConstants.LATEST_ASSIGNMENT, latestAssignments);
router.post(routesConstants.My_UPLOADS,uploadAssignment);
router.post(routesConstants.SUBMIT_ASSIGNMENT, isAuthenticated,isTeacher,submitAssignment)
module.exports = router;
