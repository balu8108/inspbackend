const express = require("express");
const { myCourses } = require("../../controllers/StudentController/myCourses");
const router = express.Router();

router.route("/myCourses").post(myCourses);
module.exports = router;