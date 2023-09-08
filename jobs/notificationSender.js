const { Notification } = require("../models");
const { notificationType } = require("../constants");
const { sendEmail } = require("../services");
const sendNotification = async (item) => {
  try {
    // need to check type of notification
    // If Email then send only email
    // If SMS then send only SMS
    // If EMAIL+SMS then send both
    console.log(item.notificationType);
    if (item.notificationType === notificationType.EMAIL) {
      console.log("Sending only email");
      // send entire notification db instance
      sendEmail(item);
    } else if (item.notificationType === notificationType.SMS) {
      console.log("Sending only sms");
    } else if (item.notificationType === notificationType.EMAIL_AND_SMS) {
      console.log("Sending both email and sms");
      sendEmail(item);
    }
  } catch (err) {
    console.log("Error in sending notification", err);
  }
};

const notificationSender = async () => {
  try {
    const notificationsObj = await Notification.findAll({
      where: { notificationStatus: "PENDING" },
    });

    // Need to release notification based on type

    notificationsObj.forEach(sendNotification);
  } catch (err) {
    console.log("Error in notification sender", err);
  }
};
module.exports = notificationSender;
