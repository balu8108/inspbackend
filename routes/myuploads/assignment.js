const express = require("express");
const router = express.Router();

const { routesConstants } = require("../../constants");
const {
  uploadAssignment,
  createAssignment,
  allAssignments,
  deleteAssignment,
  latestAssignments,
  allAssignmentsWithFiles,
  allAssignmentsbytopicid,
  recentOneAssignments,
} = require("../../controllers/MyUploads/assignments");

const { isAuthenticated, isTeacher } = require("../../middlewares");

router.post(
  routesConstants.CREATE_ASSIGNMENT,
  isAuthenticated,
  isTeacher,
  createAssignment
);
router.get(routesConstants.GET_ASSIGNMENT_TOPIC_ID, allAssignmentsbytopicid);
router.delete("routesConstants.DELETE_ASSIGNMENT/:id", deleteAssignment);
router.get(routesConstants.LATEST_ASSIGNMENT, latestAssignments);
router.post(
  routesConstants.My_UPLOADS,
  isAuthenticated,
  isTeacher,
  uploadAssignment
);
router.get(routesConstants.All_ASSIGNMENT_WITH_FILES, allAssignmentsWithFiles);
router.get(routesConstants.RECENT_ONE_ASSIGNMENT,recentOneAssignments)
module.exports = router;
