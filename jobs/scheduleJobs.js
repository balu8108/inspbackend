const schedule = require("node-schedule");
const upcomingLiveClass = require("./upcomingLiveClass");
const jobRule = "*/10 * * * * *"; // Seconds field set to */10

const scheduleJobs = () => {
  schedule.scheduleJob(jobRule, upcomingLiveClass);
};
module.exports = scheduleJobs;
