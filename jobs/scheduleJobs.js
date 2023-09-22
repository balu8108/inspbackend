const schedule = require("node-schedule");
const upcomingLiveClass = require("./upcomingLiveClass");
const notificationSender = require("./notificationSender");
const classStatusChange = require("./classStatusChange");
const { ENVIRON } = require("../envvar");
let jobRule = "*/1 * * * *";

if (ENVIRON === "local") {
  jobRule = "*/10 * * * * *"; // job run in 10 seconds in local environ
}
const scheduleJobs = () => {
  schedule.scheduleJob(jobRule, upcomingLiveClass);
  schedule.scheduleJob(jobRule, notificationSender);
  schedule.scheduleJob(jobRule, classStatusChange);
};
module.exports = scheduleJobs;
