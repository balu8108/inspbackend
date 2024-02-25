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
      from: `Support Insp Test <${process.env.GOOGLE_GMAIL_USER}>`,
      to: notificationDBObject.notificationReceiverEmail,
      subject: notificationDBObject.notificationSubject,
      text: notificationDBObject.notificationEmailText,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        notificationDBObject.notificationStatus = "FAILED";
        notificationDBObject.save();
      } else {
        notificationDBObject.notificationStatus = "SENT"; //This ensures atleast one of the notification is sent
        notificationDBObject.save();
      }
    });
  } catch (err) {
    console.log("Error in sending email", err);
    notificationDBObject.notificationStatus = "FAILED"; // Failed to send email so notification din't send from email
    notificationDBObject.save();
  }
};

module.exports = sendEmail;
