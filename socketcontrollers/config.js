const {
  ENVIRON,
  MEDIA_SOUP_LISTEN_IP,
  MEDIA_SOUP_ANNOUNCED_IP,
} = require("../envvar");

const request = require("sync-request");
const os = require("os");
function getMyIPSync() {
  try {
    const res = request("GET", "https://api64.ipify.org?format=json");
    const body = JSON.parse(res.getBody("utf8"));
    return body.ip;
  } catch (error) {
    console.error("Failed to get IP address:", error);
    return null;
  }
}

// Example usage
const myIP = getMyIPSync();

module.exports = Object.freeze({
  plainRtpTransport: {
    listenIp: {
      ip: MEDIA_SOUP_LISTEN_IP,
      announcedIp: ENVIRON !== "local" ? myIP : "127.0.0.1",
    }, // TODO: Change announcedIp to your external IP or domain name
    rtcpMux: false,
    comedia: false,
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: MEDIA_SOUP_LISTEN_IP,
        announcedIp: ENVIRON !== "local" ? myIP : "127.0.0.1",
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
  pipeTransport: {
    listenInfo: {
      protocol: "udp",
      ip: "0.0.0.0",
      announcedAddress: ENVIRON !== "local" ? myIP : "127.0.0.1",
    },
    listenIp: {
      ip: "0.0.0.0",
      announcedIp: ENVIRON !== "local" ? myIP : "127.0.0.1",
    },
    enableRtx: false,
    enableSrtp: false,
  },
  numWorkers: Object.keys(os.cpus()).length,
  workerConfig: {
    logLevel: "debug",
    logTags: ["rtp", "srtp", "rtcp"],
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  },
});
