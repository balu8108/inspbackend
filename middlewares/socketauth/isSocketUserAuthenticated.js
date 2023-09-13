const { externalApiEndpoints } = require("../../constants");
const { INSP_EXTERNAL_WEBSITE_SECRET_KEY } = require("../../envvar");
const isSocketUserAuthenticated = async (socket, next) => {
  try {
    const secret_token = socket.handshake.auth.secret_token;
    if (!secret_token) {
      const err = new Error("Not Authorized");
      next(err);
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
      socket.authData = data.result;
      next();
    } else {
      const err = new Error("Something went wrong");
      next(err);
    }
  } catch (err) {
    console.log("Error in Authentication", err);
    next(err);
  }
};

module.exports = isSocketUserAuthenticated;
