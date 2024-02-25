const CryptoJS = require("crypto-js");
const { ENC_KEY } = require("../envvar");
const encryptData = async (data) => {
  const stringifiedData = JSON.stringify(data);
  const encryptedData = CryptoJS.AES.encrypt(
    stringifiedData,
    ENC_KEY
  ).toString();
  return encryptedData;
};

module.exports = { encryptData };
