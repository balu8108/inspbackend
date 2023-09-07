const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  createLiveClass,
  getAllLiveClasses,
  getLiveClassDetails,
  getUpcomingClass,
} = require("../../controllers");
const {
  isAuthenticated,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");

router.post(routesConstants.CREATE_LIVE_CLASS, createLiveClass); // This route will create a new Live Class/room in db
router.get(
  routesConstants.GET_ALL_LIVE_CLASSES,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  getAllLiveClasses
);
router.get(
  `${routesConstants.GET_LIVE_CLASS_DETAILS}/:roomId`,
  getLiveClassDetails
);
router.get(`${routesConstants.GET_UPCOMING_CLASS}/:roomId`, getUpcomingClass);
module.exports = router;
