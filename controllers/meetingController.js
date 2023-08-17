const Meeting = require("../models/meetingModel");
const {verifyViaEmail}=require("../services/emailNotify");
const {  sendMeetingInvitation} = require("../services/smsNotification");
const { v4: uuidv4 } = require("uuid");

const generateUniqueLink = () => {
    const uuid=uuidv4();
    // Generate a version 4 UUID, which is random and unique
    const firstPart=uuid.substr(0,3);
    const secondPart=uuid.substr(4,4);
    const thirdPart=uuid.substr(9,3);
  
    return `${firstPart}-${secondPart}-${thirdPart}`;
  };

  
  // Controller function to create a meeting
  exports.createMeeting = (req, res) => {
    try {
      const meetingUrl =   generateUniqueLink();
      // You can save the meetingUrl in a database or take any other actions required
      res.json({ meetingUrl });
    } catch (error) {
      console.error("Error creating meeting:", error);
      res.status(500).json({ error: "Failed to create meeting" });
    }
  };


  exports.scheduleMeeting = async (req, res) => {
    const meetingUrl = generateUniqueLink();
    const { date, time, title, description } = req.body;
  
    try {
    
      const newMeeting = new Meeting({
        date,
        time,
        title,
        description,
        meetingUrl
       
      });
  
      // Save the new meeting to the database
      await newMeeting.save();
  
      res.status(201).json({ message: "Meeting scheduled successfully",meetingUrl });
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  // notification via e-mail--
  exports.notifyViaEmail=async(req,res)=>{
    const recipientEmail = req.body.email; 
    try {
      const email=  await verifyViaEmail(recipientEmail);
      console.log('Email sent:', email);
      
  
      res.status(200).json({ message: 'Email  sent successfully'});
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to send the email' });
    }

  }

  exports.sendNotificationSMS = async (req, res) => {
    const { mobileNumber } = req.body;
  
    try {
      const message=await   sendMeetingInvitation(mobileNumber);
      console.log('Message:',message);
      res.status(200).json({ success: true, message: 'Message sent successfully',message });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  };
  