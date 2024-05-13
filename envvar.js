const dotenv = require("dotenv");
dotenv.config({ path: "config/.env" });
const PORT = process.env.PORT;
const NODE_ENV = process.env.NODE_ENV;
const ENVIRON = process.env.ENVIRON;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const INSP_EXTERNAL_WEBSITE_SECRET_KEY =
  process.env.INSP_EXTERNAL_WEBSITE_SECRET_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_GMAIL_USER = process.env.GOOGLE_GMAIL_USER;

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

const ENC_KEY = process.env.ENC_KEY;
const MEDIA_SOUP_LISTEN_IP = process.env.MEDIA_SOUP_LISTEN_IP;
const MEDIA_SOUP_ANNOUNCED_IP = process.env.MEDIA_SOUP_ANNOUNCED_IP;
const PLATFORM = process.env.PLATFORM;

const AXINOM_COMMUNICATION_KEY_ID = process.env.AXINOM_COMMUNICATION_KEY_ID;
const AXINOM_COMMUNICATION_KEY = process.env.AXINOM_COMMUNICATION_KEY;

const TPSTREAM_URL = process.env.TPSTREAM_URL;
const TPSTREAM_USER_ID = process.env.TPSTREAM_USER_ID;
const TPSTREAM_AUTHTOKEN = process.env.TPSTREAM_AUTHTOKEN;

const CLOUDFRONT_PRIVATE_KEY = process.env.CLOUDFRONT_PRIVATE_KEY;
const CLOUDFRONT_KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;
module.exports = {
  PORT,
  NODE_ENV,
  ALLOWED_ORIGINS,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_BUCKET_NAME,
  INSP_EXTERNAL_WEBSITE_SECRET_KEY,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_REFRESH_TOKEN,
  GOOGLE_GMAIL_USER,
  TWILIO_PHONE_NUMBER,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  ENC_KEY,
  ENVIRON,
  MEDIA_SOUP_LISTEN_IP,
  MEDIA_SOUP_ANNOUNCED_IP,
  PLATFORM,
  AXINOM_COMMUNICATION_KEY_ID,
  AXINOM_COMMUNICATION_KEY,
  TPSTREAM_URL,
  TPSTREAM_USER_ID,
  TPSTREAM_AUTHTOKEN,
  CLOUDFRONT_PRIVATE_KEY,
  CLOUDFRONT_KEY_PAIR_ID,
  CLOUDFRONT_URL,
};
