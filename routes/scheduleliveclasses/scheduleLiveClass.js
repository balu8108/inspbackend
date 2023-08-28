const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  createLiveClass,
  getAllLiveClasses,
  getLiveClassDetails,
} = require("../../controllers/scheduleliveclasses/scheduleLiveClass");

router.post(routesConstants.CREATE_LIVE_CLASS, createLiveClass); // This route will create a new Live Class/room in db
router.get(routesConstants.GET_ALL_LIVE_CLASSES, getAllLiveClasses);
router.get(
  `${routesConstants.GET_LIVE_CLASS_DETAILS}/:roomId`,
  getLiveClassDetails
);
module.exports = router;
