let cron = require("node-cron");
let nodemailer = require("nodemailer");

async function verifyViaEmail(recipientEmail) {
  let mailOptions = {
    from: "your-gmail-account@gmail.com",
    to: recipientEmail,
    subject: "Meeting Reminder",
    text: "Your meeting is about to start in 15 minutes !!. Please join on time",
  };

  // e-mail transport configuration
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "y.rhythm57@gmail.com",
      pass: "eygdwnshadiehmng",
    },
  });

  cron.schedule("* * * * *", () => {
    // Send e-mail
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  });
}

module.exports = { verifyViaEmail };
