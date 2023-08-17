const express= require('express');
const { registerStudent, routechecking, submitFeedback, loginStudent, logoutStudent } = require('../controllers/studentController');
const router=express.Router();

router.route('/check').post(routechecking)
router.route('/register').post(registerStudent)
router.route('/login').post(loginStudent);
router.route('/logout').post(logoutStudent);
router.route('/feedback').post(submitFeedback);
module.exports=router;
