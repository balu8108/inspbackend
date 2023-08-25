module.exports = Object.freeze({
  plainRtpTransport: {
    listenIp: { ip: "0.0.0.0", announcedIp: "127.0.0.1" }, // TODO: Change announcedIp to your external IP or domain name
    rtcpMux: true,
    comedia: false,
  },
});
