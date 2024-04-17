const { externalApiEndpoints } = require("../../constants");
const { INSP_EXTERNAL_WEBSITE_SECRET_KEY } = require("../../envvar");

const getSecretTokenWithUid = async (req, res, next) => {
  try {
    if (req?.params?.unique_id) {
      const body = {
        secret_key: INSP_EXTERNAL_WEBSITE_SECRET_KEY,
        unique_id: req?.params?.unique_id,
      };
      const requestOptions = {
        method: "POST",
        body: JSON.stringify(body),
      };
      const response = await fetch(
        externalApiEndpoints.loginWithUid,
        requestOptions
      );

      const data = await response.json();

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

module.exports = getSecretTokenWithUid;
