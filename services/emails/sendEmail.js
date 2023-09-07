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

const sendEmail = async (rec_email) => {
  try {
    const { token } = await oauthClient.getAccessToken();

    const authCredentials = getAuthCredentials(token);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: authCredentials,
    });

    const mailOptions = {
      from: `Support Insp Test <${process.env.GOOGLE_GMAIL_USER}>`,
      to: rec_email,
      subject: "Meeting Reminder",
      text: "Your meeting is about to start in 15 minutes !!. Please join on time",
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  } catch (err) {
    console.log("Error in sending email", err);
  }
};

module.exports = sendEmail;
