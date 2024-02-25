const SOCKET_EVENTS = require("./socketevents");
const mediaCodecs = require("./mediasoupconstants");
const routesConstants = require("./routesconstants");
const utilityConstants = require("./utilityConstants");
const externalApiEndpoints = require("./externalApiEndpoints");
const {
  notificationType,
  classStatus,
  liveClassLogInfo,
  liveClassTestQuestionLogInfo,
} = require("./dbConstants");
module.exports = {
  SOCKET_EVENTS,
  mediaCodecs,
  routesConstants,
  utilityConstants,
  externalApiEndpoints,
  notificationType,
  classStatus,
  liveClassLogInfo,
  liveClassTestQuestionLogInfo,
};
