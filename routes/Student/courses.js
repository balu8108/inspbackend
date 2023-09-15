const express = require("express");
const { myCourses } = require("../../controllers/StudentController/myCourses");
const router = express.Router();

router.route("/myCoursessss").post(myCourses);
module.exports = router;