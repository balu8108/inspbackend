const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  createLiveClass,
  getAllLiveClasses,
  getAllCalenderClasses,
  getLiveClassDetails,
  getUpcomingClass,
  uploadFilesToClass,
  updateScheduleClassData,
} = require("../../controllers");
const {
  isAuthenticated,
  checkPaidStatusOrTeacher,
  isTeacher,
} = require("../../middlewares");

router.post(
  routesConstants.CREATE_LIVE_CLASS,
  isAuthenticated,
  isTeacher,
  createLiveClass
); // This route will create a new Live Class/room in db
router.get(
  routesConstants.GET_ALL_CALENDER_CLASSES,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAllCalenderClasses
);
router.get(
  routesConstants.GET_ALL_LIVE_CLASSES,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAllLiveClasses
);
router.get(
  `${routesConstants.GET_LIVE_CLASS_DETAILS}/:roomId`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getLiveClassDetails
);
router.get(
  `${routesConstants.GET_UPCOMING_CLASS}/:roomId`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getUpcomingClass
);
router.post(
  `${routesConstants.UPLOAD_ASSIGNMENT_TO_CLASS_BY_ID}/:type/:classId`,
  isAuthenticated,
  isTeacher,
  uploadFilesToClass
);
router.post(
  routesConstants.UPDATE_SCHEDULE_CLASS,
  isAuthenticated,
  isTeacher,
  updateScheduleClassData
);

module.exports = router;
