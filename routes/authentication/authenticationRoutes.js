const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const { loginHandler } = require("../../controllers");
const {
  isAuthenticated,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");

router.post(
  `${routesConstants.LOGIN}/:secret_token`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  loginHandler
);

module.exports = router;
