const { notificationType } = require("../constants");

const templates = {
  upcomingLiveClass: {
    email:
      "Hi {0},\nYour class for {1} is starting in 15 minutes.\nPlease be ready with your laptop and internet connection.",
    sms: "Hi {0},\nYour class for {1} is starting in 15 minutes.\nPlease be ready with your laptop and internet connection.",
  },
};

// Register all above templates in below
// This is exported so that the generateNotifcationText function can be used in other files
// something like
// generateNotificationText(NOTF_TEMPLATE_NAME.UPCOMING_LIVE_CLASS, [name, classTitle])
const NOTF_TEMPLATE_NAME = {
  UPCOMING_LIVE_CLASS: "upcomingLiveClass",
};

const stringInterpolation = (str, args) => {
  try {
    return str.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != "undefined" ? args[number] : match;
    });
  } catch (err) {
    console.log("Error in stringInterpolation", err);
  }
};

const generateNotificationText = (notf_type, notf_temp_type, args) => {
  try {
    if (templates.hasOwnProperty(notf_temp_type)) {
      if (notf_type === notificationType.EMAIL) {
        return {
          emailText: stringInterpolation(templates[notf_temp_type].email, args),
          smsText: null,
        };
      } else if (notf_type === notificationType.SMS) {
        return {
          smsText: stringInterpolation(templates[notf_temp_type].sms, args),
          emailText: null,
        };
      } else if (notf_type === notificationType.EMAIL_AND_SMS) {
        return {
          emailText: stringInterpolation(templates[notf_temp_type].email, args),
          smsText: stringInterpolation(templates[notf_temp_type].sms, args),
        };
      } else {
        return { emailText: null, smsText: null };
      }
    } else {
      return "";
    }
  } catch (err) {}
};

module.exports = { generateNotificationText, NOTF_TEMPLATE_NAME };
