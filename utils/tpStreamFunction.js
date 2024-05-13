const axios = require("axios");
const {
  TPSTREAM_URL,
  TPSTREAM_USER_ID,
  TPSTREAM_AUTHTOKEN,
} = require("../envvar");

// Function to send a request to TPStream
const sendTPStreamRequest = (tpStreamUrl, requestOptions, headers) => {
  return new Promise((resolve, reject) => {
    axios
      .post(tpStreamUrl, requestOptions, { headers })
      .then((response) => resolve(response.data))
      .catch((error) => {
        console.error("Error in POST request:", error.message);
        reject(error);
      });
  });
};

const getTpStreamId = (fileName, fileUrl) => {
  const tpStreamUrl = `${TPSTREAM_URL}/api/v1/${TPSTREAM_USER_ID}/assets/videos/`;
  const tpStreamBody = {
    title: fileName,
    inputs: [{ url: fileUrl }],
    resolutions: ["480p", "720p", "1080p"],
    enable_drm: true,
  };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Token ${TPSTREAM_AUTHTOKEN}`,
  };

  return sendTPStreamRequest(tpStreamUrl, tpStreamBody, headers)
    .then(({ id }) => id)
    .catch((error) => {
      throw error;
    });
};

module.exports = {
  getTpStreamId,
};
