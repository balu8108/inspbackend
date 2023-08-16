const express=require('express');
const { startRecording, stopRecording, uploadVideo } = require('../controllers/videoController');
const router=express.Router();

router.route('/start-Recording').post(startRecording);

router.route('/stop-Recording').post(stopRecording);

router.route('/uploads').post(uploadVideo);

module.exports=router;