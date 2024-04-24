const generateRandomCharacters = require("./generateRandomCharacters");
const {
  validateCreationOfLiveClass,
  validateCreateFeedBack,
  validateUpdateScheduleLiveClass,
} = require("./validators");
const {
  uploadFilesToS3,
  generatePresignedUrls,
  isObjectExistInS3,
  getObjectFromS3,
  uploadToS3,
  generateAWSS3LocationUrl,
  generateSignedCookies,
  isObjectExistInS3ByKey,
} = require("./awsFunctions");
const checkArraysHaveSameElements = require("./checkArrayHaveSameElement");
const updateLeaderboard = require("./updateLeaderboard");
const createOrUpdateQnANotes = require("./qnaNotesFunction");
const isObjectValid = require("./objectValidation");
const dbObjectConverter = require("./dbObjectConverter");
const { fetchAllStudentsFromInspApi } = require("./inspexternalapis");
const { isFeedbackProvided } = require("./dbUtilityFunctions");
const generateDRMJWTToken = require("./generateDRMJWTToken");
const {
  splitStringWithSlash,
  formM3U8String,
  formMPDString,
} = require("./stringFunctions");
const { createOrUpdateLiveClassNotes } = require("./liveClassNotes");
module.exports = {
  generateRandomCharacters,
  validateCreationOfLiveClass,
  uploadFilesToS3,
  checkArraysHaveSameElements,
  generatePresignedUrls,
  updateLeaderboard,
  createOrUpdateQnANotes,
  isObjectValid,
  isObjectExistInS3,
  getObjectFromS3,
  uploadToS3,
  generateAWSS3LocationUrl,
  dbObjectConverter,
  fetchAllStudentsFromInspApi,
  validateCreateFeedBack,
  validateUpdateScheduleLiveClass,
  isFeedbackProvided,
  isObjectExistInS3ByKey,
  splitStringWithSlash,
  formM3U8String,
  formMPDString,
  generateDRMJWTToken,
  createOrUpdateLiveClassNotes,
  generateSignedCookies,
};
