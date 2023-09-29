const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  createSoloClassRoom, getLatestSoloclassroom,
} = require("../../controllers/SoloClassRoom/soloclassroom");


router.post( routesConstants.SOLO_CLASSROOM, createSoloClassRoom);
router.get(routesConstants.LATEST_CLASSROOM,getLatestSoloclassroom)
module.exports = router;
