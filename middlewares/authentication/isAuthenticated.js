const { externalApiEndpoints } = require("../../constants");
const { INSP_EXTERNAL_WEBSITE_SECRET_KEY } = require("../../envvar");

const isAuthenticated = async (req, res, next) => {
  try {
    // we need secret_token during login from params
    // for making other rest apis protected we need secret_token from cookies for any subsequent request after login

    let secret_token = null;
    if (req?.params?.secret_token) {
      secret_token = req.params.secret_token;
    } else {
      secret_token = req?.headers?.authorization?.split(" ")[1];
    }

    if (!secret_token) {
      return res.status(400).json({ status: false, data: "Token is required" });
    }

    const body = {
      secret_key: INSP_EXTERNAL_WEBSITE_SECRET_KEY,
      token: secret_token,
    };
    const requestOptions = {
      method: "POST",
      body: JSON.stringify(body),
    };

    const response = await fetch(externalApiEndpoints.login, requestOptions);
    const data = await response.json();

    if (data.status) {
      req.plainAuthData = data.result; // this will be used for internal purpose like getting email and mobile of user
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
