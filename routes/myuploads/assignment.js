const express = require("express");
const router = express.Router();

const { routesConstants } = require("../../constants");
const {
  uploadAssignment,
  updateAssignment,
  createAssignment,
  deleteAssignment,
  latestAssignments,
  allAssignmentsWithFiles,
  allAssignmentsbytopicid,
  recentOneAssignments,
  getSubjectsAssignments,
  getAssignmentsByTopicId,
} = require("../../controllers/MyUploads/assignments");

const {
  isAuthenticated,
  isTeacher,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");

router.post(
  routesConstants.CREATE_ASSIGNMENT,
  isAuthenticated,
  isTeacher,
  createAssignment
); // Not using anywhere

router.get(
  routesConstants.GET_ASSIGNMENT_TOPIC_ID,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  allAssignmentsbytopicid
);
router.delete(
  `${routesConstants.DELETE_ASSIGNMENT}/:id`,
  isAuthenticated,
  isTeacher,
  deleteAssignment
);
router.get(
  routesConstants.LATEST_ASSIGNMENT,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  latestAssignments
);
router.get(
  `${routesConstants.GET_ASSIGNMENTS_BY_SUBJECTS}/:subjectId`,
  getSubjectsAssignments
);
router.get(
  `${routesConstants.GET_ASSIGNMENT_BY_TOPICID}/:topicId`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAssignmentsByTopicId
);
router.post(
  routesConstants.UPLOAD_ASSIGNMENT,
  isAuthenticated,
  isTeacher,
  uploadAssignment
);
router.post(
  routesConstants.UPDATE_ASSIGNMENT,
  isAuthenticated,
  isTeacher,
  updateAssignment
);
router.get(
  routesConstants.ALL_ASSIGNMENT_WITH_FILES,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  allAssignmentsWithFiles
);
router.get(
  routesConstants.RECENT_ONE_ASSIGNMENT,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  recentOneAssignments
);

module.exports = router;
