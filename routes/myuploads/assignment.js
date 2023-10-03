const express = require("express");
const router = express.Router();

const { routesConstants } = require("../../constants");
const {
  uploadAssignment,
  createAssignment,
  allAssignments,
  deleteAssignment,
  latestAssignments,
} = require("../../controllers/MyUploads/assignments");
router.post(routesConstants.CREATE_ASSIGNMENT, createAssignment);
router.get(routesConstants.GET_ASSIGNMENT, allAssignments);
router.delete(
  "routesConstants.DELETE_ASSIGNMENT/:assignmentId",
  deleteAssignment
);
router.get(routesConstants.LATEST_ASSIGNMENT, latestAssignments);
router.post(routesConstants.My_UPLOADS,uploadAssignment);
module.exports = router;
