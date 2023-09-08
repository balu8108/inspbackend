const schedule = require("node-schedule");
const upcomingLiveClass = require("./upcomingLiveClass");
const notificationSender = require("./notificationSender");
const jobRule = "*/10 * * * * *"; // Seconds field set to */10

const scheduleJobs = () => {
  schedule.scheduleJob(jobRule, upcomingLiveClass);
  schedule.scheduleJob(jobRule, notificationSender);
};
module.exports = scheduleJobs;
