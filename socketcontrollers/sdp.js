const { getCodecInfoFromRtpParameters } = require("./utils");

// File to create SDP text from mediasoup RTP Parameters
module.exports.createSdpText = (rtpParameters) => {
  let sdpString = `v=0
  o=- 0 0 IN IP4 127.0.0.1
  s=FFmpeg
  c=IN IP4 127.0.0.1
  t=0 0`;
  const { video, audio } = rtpParameters;

  // Video codec info
  if (video) {
    const videoCodecInfo = getCodecInfoFromRtpParameters(
      "video",
      video.rtpParameters
    );

    sdpString += `
    m=video ${video.remoteRtpPort} RTP/AVP ${videoCodecInfo.payloadType} 
    a=rtpmap:${videoCodecInfo.payloadType} ${videoCodecInfo.codecName}/${videoCodecInfo.clockRate}
    a=sendonly`;
  }

  if (audio) {
    // Audio codec info
    const audioCodecInfo = getCodecInfoFromRtpParameters(
      "audio",
      audio.rtpParameters
    );
    sdpString += `
    m=audio ${audio.remoteRtpPort} RTP/AVP ${audioCodecInfo.payloadType} 
    a=rtpmap:${audioCodecInfo.payloadType} ${audioCodecInfo.codecName}/${audioCodecInfo.clockRate}/${audioCodecInfo.channels}
    a=sendonly
    `;
  }

  return sdpString;
};
