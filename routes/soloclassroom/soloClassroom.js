const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const { isAuthenticated, isTeacher } = require("../../middlewares");

const {
  createSoloClassRoom,
  getLatestSoloclassroom,
} = require("../../controllers/SoloClassRoom/soloclassroom");

router.post(
  routesConstants.SOLO_CLASSROOM,
  isAuthenticated,
  isTeacher,
  createSoloClassRoom
);
router.get(routesConstants.LATEST_CLASSROOM, getLatestSoloclassroom);
module.exports = router;
