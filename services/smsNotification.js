// const twilio = require('twilio');
// const dotenv=require("dotenv");

// dotenv.config({ path: "config/variable.env" });

// const twilioPhoneNumber = '+16184924131';
// const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;

// const client = twilio(TWILIO_ACCOUNT_SID, "306a0ee3f0bbbee3c785982ae748f0d9");

// async function sendMeetingInvitation(mobileNumber) {
//   const message = `Hello! This is a reminder for our upcoming meeting. Please join us at the scheduled time. Looking forward to your participation!`;

//   try {
//     const sentMessage = await client.messages.create({
//       body: message,
//       from: twilioPhoneNumber,
//       to: mobileNumber
//     });

//     console.log(`Invitation message sent to ${mobileNumber}. Message SID: ${sentMessage.sid}`);
//   } catch (error) {
//     console.log('Error sending invitation message:', error);
//     throw error;
//   }
// }
// module.exports = {
//   sendMeetingInvitation,
// };

const twilio = require("twilio");
const dotenv = require("dotenv");

dotenv.config({ path: "config/.env" });

const twilioPhoneNumber = "+16184924131";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN; // Corrected this line

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN); // Use TWILIO_AUTH_TOKEN here

async function sendMeetingInvitation(mobileNumber) {
  const message = `Hello! This is a reminder for our upcoming meeting. Please join us at the scheduled time. Looking forward to your participation!`;

  try {
    const sentMessage = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: mobileNumber,
    });
  } catch (error) {
    console.log("Error sending invitation message:", error);
    throw error;
  }
}

module.exports = {
  sendMeetingInvitation,
};
