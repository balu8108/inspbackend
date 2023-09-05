// This file gives api data which can be used throughout the application
// such as fetching subjects from database

const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const { getAllSubjects, openFile, imageToDoc } = require("../../controllers");

router.get(routesConstants.GET_ALL_SUBJECTS, getAllSubjects);
router.get(`${routesConstants.OPEN_FILE}/:id`, openFile);
router.post(routesConstants.IMAGE_TO_DOC, imageToDoc);

module.exports = router;
