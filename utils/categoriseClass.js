const moment = require("moment-timezone");
moment.tz.setDefault("Asia/Kolkata");
const categoriseClass = (data) => {
  const currentDate = moment();
  const scheduledDate = moment(data.scheduledDate);
  const scheduledStartTime = moment(data.scheduledStartTime, "HH:mm:ss");
  const scheduledEndTime = moment(data.scheduledEndTime, "HH:mm:ss");

  if (scheduledDate.isSame(currentDate, "day")) {
    // if it is today then check if it is live or upcoming
    if (
      currentDate.isSameOrAfter(scheduledStartTime) &&
      currentDate.isSameOrBefore(scheduledEndTime)
    ) {
      return "Ongoing";
    } else if (currentDate.isBefore(scheduledStartTime)) {
      return "Today";
    } else if (currentDate.isAfter(scheduledEndTime)) {
      return "Completed"; // New category for all past classes
    }
  } else if (scheduledDate.isSame(currentDate, "week")) {
    if (scheduledDate.isBefore(currentDate, "day")) {
      // Class is in the past but in the same week
      return "Completed";
    } else {
      return "Week";
    }
  }
  return "Upcoming";
};

module.exports = categoriseClass;
