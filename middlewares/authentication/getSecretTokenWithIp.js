const { externalApiEndpoints } = require("../../constants");
const { INSP_EXTERNAL_WEBSITE_SECRET_KEY } = require("../../envvar");
const requestIp = require("request-ip");
const getSecretTokenWithIp = async (req, res, next) => {
  try {
    const clientIp = requestIp.getClientIp(req);
    console.log("Client ip", clientIp);
    if (clientIp) {
      const body = {
        secret_key: INSP_EXTERNAL_WEBSITE_SECRET_KEY,
        ip_address: clientIp,
      };
      const requestOptions = {
        method: "POST",
        body: JSON.stringify(body),
      };
      const response = await fetch(
        externalApiEndpoints.loginWithIp,
        requestOptions
      );

      const data = await response.json();
      console.log("response data using ip", data);
      if (data && data.status && data.result) {
        req.params.secret_token = data?.result?.token;
      }
      next();
    } else {
      return res
        .status(400)
        .json({ status: false, data: "Something went wrong!!" });
    }
  } catch (err) {
    return res
      .status(400)
      .json({ status: false, data: "Something went wrong!!" });
  }
};

module.exports = getSecretTokenWithIp;
