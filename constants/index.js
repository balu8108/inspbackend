const SOCKET_EVENTS = require("./socketevents");
const mediaCodecs = require("./mediasoupconstants");
const routesConstants = require("./routesconstants");
const utilityConstants = require("./utilityConstants");
const externalApiEndpoints = require("./externalApiEndpoints");
const { drmTypeConstant } = require("./generalConstant");
const {
  notificationType,
  classTypeTypes,
  classLevelType,
  classStatus,
  liveClassLogInfo,
  liveClassTestQuestionLogInfo,
} = require("./dbConstants");
module.exports = {
  SOCKET_EVENTS,
  mediaCodecs,
  drmTypeConstant,
  routesConstants,
  utilityConstants,
  externalApiEndpoints,
  notificationType,
  classTypeTypes,
  classLevelType,
  classStatus,
  liveClassLogInfo,
  liveClassTestQuestionLogInfo,
};
