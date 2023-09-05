const { externalApiEndpoints } = require("../../constants");
const dotenv = require("dotenv");
dotenv.config({ path: "../../config/.env" });

const isAuthenticated = async (req, res, next) => {
  try {
    const { secret_token } = req.params;
    if (!secret_token) {
      return res.status(400).json({ status: false, data: "Token is required" });
    }

    const body = {
      secret_key: process.env.INSP_EXTERNAL_WEBSITE_SECRET_KEY,
      token: secret_token,
    };
    const requestOptions = {
      method: "POST",
      body: JSON.stringify(body),
    };

    const response = await fetch(externalApiEndpoints.login, requestOptions);
    const data = await response.json();

    if (data.status) {
      req.authData = data.result;
    }

    next();
  } catch (err) {
    return res
      .status(400)
      .json({ status: false, data: "Something went wrong!!" });
  }
};

module.exports = isAuthenticated;
