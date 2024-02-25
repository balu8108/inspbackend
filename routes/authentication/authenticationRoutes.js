const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const { loginHandler, loginWithIpHandler } = require("../../controllers");
const {
  isAuthenticated,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");
const getSecretTokenWithIp = require("../../middlewares/authentication/getSecretTokenWithIp");

router.post(
  `${routesConstants.LOGIN}/:secret_token`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  loginHandler
);

router.post(
  `${routesConstants.LOGIN_WITH_IP}`,
  getSecretTokenWithIp,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  loginWithIpHandler
);

module.exports = router;
