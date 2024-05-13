const express = require("express");
const router = express.Router();
const { routesConstants } = require("../../constants");
const { loginHandler, loginWithUidHandler } = require("../../controllers");
const {
  isAuthenticated,
  checkPaidStatusOrTeacher,
} = require("../../middlewares");
const getSecretTokenWithUid = require("../../middlewares/authentication/getSecretTokenWithUid");

router.post(
  `${routesConstants.LOGIN}/:secret_token`,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  loginHandler
);

router.post(
  `${routesConstants.LOGIN_WITH_UNIQUE_ID}/:unique_id`,
  getSecretTokenWithUid,
  isAuthenticated,
  checkPaidStatusOrTeacher,
  loginWithUidHandler
);
module.exports = router;
