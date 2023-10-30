const {
  AXINOM_COMMUNICATION_KEY_ID,
  AXINOM_COMMUNICATION_KEY,
} = require("../envvar");
const jwt = require("jsonwebtoken");
const moment = require("moment-timezone");
const generateDRMJWTToken = (drmKeyId) => {
  console.log("drm key id", drmKeyId);
  console.log("axinom ck", AXINOM_COMMUNICATION_KEY);
  console.log("axinom cki", AXINOM_COMMUNICATION_KEY_ID);
  try {
    let communicationKeyAsBuffer = Buffer.from(
      AXINOM_COMMUNICATION_KEY,
      "base64"
    );

    let now = moment();
    let validFrom = now.clone().subtract(1, "days");
    let validTo = now.clone().add(1, "days");
    let message = {
      type: "entitlement_message",
      version: 2,
      license: {
        start_datetime: validFrom.toISOString(),
        expiration_datetime: validTo.toISOString(),
        allow_persistence: true,
      },

      // The keys list will be filled separately by the next code block.
      content_keys_source: {
        inline: [{ id: drmKeyId }],
      },
    };
    let envelope = {
      version: 1,
      com_key_id: AXINOM_COMMUNICATION_KEY_ID,
      message: message,
      begin_date: validFrom.toISOString(),
      expiration_date: validTo.toISOString(),
    };

    let licenseToken = jwt.sign(envelope, communicationKeyAsBuffer, {
      algorithm: "HS256",
      noTimestamp: true,
    });

    console.log("licence token", licenseToken);

    return licenseToken;
  } catch (err) {
    console.log("error in generation jwt token", err);
  }
};
module.exports = generateDRMJWTToken;
