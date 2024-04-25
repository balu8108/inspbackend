const oauthClient = require("../googleoauth/googleoauth");
const nodemailer = require("nodemailer");
const {
  GOOGLE_GMAIL_USER,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
} = require("../../envvar");

const getAuthCredentials = (token) => {
  return {
    type: "OAuth2",
    user: GOOGLE_GMAIL_USER,
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    refreshToken: GOOGLE_REFRESH_TOKEN,
    accessToken: token,
  };
};

const sendEmail = async (notificationDBObject) => {
  try {
    const { token } = await oauthClient.getAccessToken();
    const authCredentials = getAuthCredentials(token);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: authCredentials,
    });

    const mailOptions = {
      from: "support@inspedu.in",
      to: notificationDBObject.receiverEmail,
      subject: `Reminder: Upcoming Class ${notificationDBObject?.subjectName} in 15 Minutes`,
      html: `<div>
      <strong>Hello ${notificationDBObject?.receivername}</strong>
      <p>This is to inform you that the class <strong>${notificationDBObject?.subjectName}</strong> is going to start in 15 minutes.</p>
      <p>Please be ready and join the class on time.</p>
  </div>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("FAILED");
      } else {
        console.log("DONE");
      }
    });
  } catch (err) {
    console.log("Error in sending email", err);
  }
};

module.exports = sendEmail;
