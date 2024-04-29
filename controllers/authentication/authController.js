const { generateSignedCookies } = require("../../utils");
const { COOKIES_DOMAIN } = require("../../envvar");

const cookieOption = {
  domain: COOKIES_DOMAIN,
  path: "/",
  secure: true,
  sameSite: "None",
  maxAge: 86400000, // 1 day in milisecond
};

/* THIS IS DEPRECATED API */
const loginHandler = async (req, res) => {
  try {
    // we are expecting authData within request through middleware
    // if auth data present then we can assume a valid user otherwise send status as false
    const { authData } = req;
    const { secret_token } = req.params;
    if (!authData) {
      return res
        .status(400)
        .json({ status: false, data: "Invalid or No User" });
    }
    // const cookies = await generateSignedCookies();
    // Set cookies in response headers
    // res.cookie("CloudFront-Policy", cookies["CloudFront-Policy"], cookieOption);
    // res.cookie(
    //   "CloudFront-Signature",
    //   cookies["CloudFront-Signature"],
    //   cookieOption
    // );
    // res.cookie(
    //   "CloudFront-Key-Pair-Id",
    //   cookies["CloudFront-Key-Pair-Id"],
    //   cookieOption
    // );

    return res
      .status(200)
      .json({ status: true, data: { authData, secret_token } });
  } catch (err) {
    return res
      .status(400)
      .json({ status: false, data: "Something went wrong" });
  }
};
/* THE ABOVE IS DEPRECATED API */

/* API FOR LOGIN THE USER */

const loginWithIpHandler = (req, res) => {
  try {
    // we are expecting authData within request through middleware
    // if auth data present then we can assume a valid user otherwise send status as false
    const { authData } = req;
    const { secret_token } = req.params;
    if (!authData) {
      return res
        .status(400)
        .json({ status: false, data: "Invalid or No User" });
    }
    return res
      .status(200)
      .json({ status: true, data: { authData, secret_token } });
  } catch (err) {
    return res
      .status(400)
      .json({ status: false, data: "Something went wrong" });
  }
};

const loginWithUidHandler = async (req, res) => {
  try {
    // we are expecting authData within request through middleware
    // if auth data present then we can assume a valid user otherwise send status as false
    const { authData } = req;
    const { secret_token } = req.params;
    if (!authData) {
      return res
        .status(400)
        .json({ status: false, data: "Invalid or No User" });
    }
    // const cookies = await generateSignedCookies();
    // // Set cookies in response headers
    // res.cookie("CloudFront-Policy", cookies["CloudFront-Policy"], cookieOption);
    // res.cookie(
    //   "CloudFront-Signature",
    //   cookies["CloudFront-Signature"],
    //   cookieOption
    // );
    // res.cookie(
    //   "CloudFront-Key-Pair-Id",
    //   cookies["CloudFront-Key-Pair-Id"],
    //   cookieOption
    // );

    return res
      .status(200)
      .json({ status: true, data: { authData, secret_token } });
  } catch (err) {
    return res
      .status(400)
      .json({ status: false, data: "Something went wrong" });
  }
};
module.exports = { loginHandler, loginWithIpHandler, loginWithUidHandler };
