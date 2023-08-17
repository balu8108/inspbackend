const twilio = require('twilio');

const twilioPhoneNumber = '+918287241918';

const client = twilio("AC650264f0854dfd7b95c7ce2c0d3c2cfc", "2a56e1bc0df42204d7d952f273ecd874");

async function sendMeetingInvitation(mobileNumber) {
  const message = `Hello! This is a reminder for our upcoming meeting. Please join us at the scheduled time. Looking forward to your participation!`;
  
  try {
    const sentMessage = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: mobileNumber
    });

    console.log(`Invitation message sent to ${mobileNumber}. Message SID: ${sentMessage.sid}`);
  } catch (error) {
    console.log('Error sending invitation message:', error);
    throw error;
  }
}
module.exports = {
  sendMeetingInvitation,
};
