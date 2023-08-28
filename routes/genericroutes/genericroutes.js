// This file gives api data which can be used throughout the application
// such as fetching subjects from database

const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const {
  getAllSubjects,
} = require("../../controllers/genericcontrollers/genericcontrollers");

router.get(routesConstants.GET_ALL_SUBJECTS, getAllSubjects);

module.exports = router;
