const {
  ENVIRON,
  MEDIA_SOUP_LISTEN_IP,
  MEDIA_SOUP_ANNOUNCED_IP,
} = require("../envvar");

module.exports = Object.freeze({
  plainRtpTransport: {
    listenIp: {
      ip: MEDIA_SOUP_LISTEN_IP,
      announcedIp: ENVIRON !== "local" ? MEDIA_SOUP_ANNOUNCED_IP : "127.0.0.1",
    }, // TODO: Change announcedIp to your external IP or domain name
    rtcpMux: false,
    comedia: false,
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: MEDIA_SOUP_LISTEN_IP,
        announcedIp:
          ENVIRON !== "local" ? MEDIA_SOUP_ANNOUNCED_IP : "127.0.0.1",
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
});
