const isAuthenticated = require("./authentication/isAuthenticated");
const checkPaidStatusOrTeacher = require("./authentication/checkPaidStatusOrTeacher");
const isSocketUserAuthenticated = require("./socketauth/isSocketUserAuthenticated");
const socketPaidStatusOrTeacher = require("./socketauth/socketPaidStatusOrTeacher");
const isTeacher = require("./authentication/isTeacher");
module.exports = {
  isAuthenticated,
  checkPaidStatusOrTeacher,
  isSocketUserAuthenticated,
  socketPaidStatusOrTeacher,
  isTeacher,
};
