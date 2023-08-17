const twilio = require('twilio');

const twilioPhoneNumber = '+16184924131';

const client = twilio("AC6496c0d388d3e43505d872d23848d158", "306a0ee3f0bbbee3c785982ae748f0d9");

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
