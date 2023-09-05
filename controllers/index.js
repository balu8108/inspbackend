const { loginHandler } = require("./authentication/authController");
const {
  getAllSubjects,
  openFile,
  imageToDoc,
} = require("./genericcontrollers/genericController");
const {
  createLiveClass,
  getAllLiveClasses,
  getLiveClassDetails,
  getUpcomingClass,
} = require("./scheduleliveclasses/scheduleLiveClassController");

module.exports = {
  loginHandler,
  getAllSubjects,
  openFile,
  imageToDoc,
  createLiveClass,
  getAllLiveClasses,
  getLiveClassDetails,
  getUpcomingClass,
};
