const express= require('express');
const { createMeeting, scheduleMeeting, notifyViaEmail, sendNotificationSMS } = require('../controllers/meetingController');
const router=express.Router();

router.route('/create-meeting').post(createMeeting);
router.route('/schedule-meeting').post(scheduleMeeting);
router.route('/email/notification').post(notifyViaEmail);
router.route('/sms/notification').post(sendNotificationSMS);
module.exports=router;
