const isAuthenticated = require("./authentication/isAuthenticated");
const checkPaidStatusOrTeacher = require("./authentication/checkPaidStatusOrTeacher");
const isSocketUserAuthenticated = require("./socketauth/isSocketUserAuthenticated");
const socketPaidStatusOrTeacher = require("./socketauth/socketPaidStatusOrTeacher");
module.exports = {
  isAuthenticated,
  checkPaidStatusOrTeacher,
  isSocketUserAuthenticated,
  socketPaidStatusOrTeacher,
};
