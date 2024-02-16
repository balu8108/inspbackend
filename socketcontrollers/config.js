const {
  ENVIRON,
  MEDIA_SOUP_LISTEN_IP,
  MEDIA_SOUP_ANNOUNCED_IP,
} = require("../envvar");
const os = require("os");
// announced ip is your local ip address as we are testing with react native so we need ip address
module.exports = Object.freeze({
  plainRtpTransport: {
    listenIp: {
      ip: MEDIA_SOUP_LISTEN_IP,
      announcedIp:
        ENVIRON !== "local" ? MEDIA_SOUP_ANNOUNCED_IP : "192.168.1.8",
    }, // TODO: Change announcedIp to your external IP or domain name
    rtcpMux: false,
    comedia: false,
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: MEDIA_SOUP_LISTEN_IP,
        announcedIp:
          ENVIRON !== "local" ? MEDIA_SOUP_ANNOUNCED_IP : "192.168.1.8",
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
  numWorkers: Object.keys(os.cpus()).length,
  workerConfig: {
    logLevel: "debug",
    logTags: ["rtp", "srtp", "rtcp"],
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  },
});
