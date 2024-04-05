const schedule = require("node-schedule");
const notificationSender = require("./notificationSender");
const classStatusChange = require("./classStatusChange");
const recordingToS3 = require("./recordingToS3");
const { ENVIRON } = require("../envvar");
// let jobRule = "*/1 * * * *";

let jobRule = "*/10 * * * * *";
let recordingRule = "*/1 * * * *";

if (ENVIRON === "local") {
  jobRule = "*/10 * * * * *"; // job run in 10 seconds in local environ
  recordingRule = "*/1 * * * *";
}
const scheduleJobs = () => {
  schedule.scheduleJob(recordingRule, notificationSender);
  // schedule.scheduleJob(jobRule, classStatusChange);
  // schedule.scheduleJob(recordingRule, recordingToS3);
};
module.exports = scheduleJobs;
