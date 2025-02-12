const child_process = require("child_process");
const { EventEmitter } = require("events");
const { getCodecInfoFromRtpParameters } = require("./utils");
const {
  PLATFORM,
  ENVIRON,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_BUCKET_NAME,
} = require("../envvar");

const RECORD_FILE_LOCATION_PATH = "./recordfiles";
const AWS_S3_RECORD_FILES = "liveclassrecordings"; // we have mounted the s3 bucket directly to ec2 instance
const kill = require("tree-kill");
const GSTREAMER_DEBUG_LEVEL = 3;
const GSTREAMER_COMMAND = "gst-launch-1.0";
const GSTREAMER_OPTIONS = "-v -e";
module.exports = class GStreamer {
  constructor(rtpParameters) {
    this._rtpParameters = rtpParameters;
    this._process = undefined;
    this._observer = new EventEmitter();
    this._isAudioAvailable = true;
    this._isVideoAvailable = true;
    this._createProcess();
  }
  _createProcess() {
    let exe = null;
    if (PLATFORM === "windows") {
      exe = `SET GST_DEBUG=${GSTREAMER_DEBUG_LEVEL} && ${GSTREAMER_COMMAND} ${GSTREAMER_OPTIONS}`;
    } else {
      exe = `GST_DEBUG=${GSTREAMER_DEBUG_LEVEL} && ${GSTREAMER_COMMAND} ${GSTREAMER_OPTIONS}`;
    }
    this._process = child_process.spawn(exe, this._commandArgs, {
      detached: false,
      shell: true,
    });
    if (this._process.stderr) {
      this._process.stderr.setEncoding("utf-8");
    }

    if (this._process.stdout) {
      this._process.stdout.setEncoding("utf-8");
    }

    this._process.on("message", (message) =>
      console.log(
        "gstreamer::process::message [pid:%d, message:%o]",
        this._process.pid,
        message
      )
    );

    this._process.on("error", (error) => {
      console.error(
        "gstreamer::process::error [pid:%d, error:%o]",
        this._process.pid,
        error
      );
    });
    this._process.once("close", () => {
      console.log("gstreamer::process::close [pid:%d]", this._process.pid);
      this._observer.emit("process-close");
    });

    this._process.stderr.on("data", (data) => {
      // console.log("gstreamer::process::stderr::data [data:%o]", data);
    });

    this._process.stdout.on("data", (data) => {
      // console.log("gstreamer::process::stdout::data [data:%o]", data);
    });
  }

  async kill() {
    try {
      this._process.stdin.end();
      kill(this._process.pid, "SIGINT"); // Kill method of treekill pacakge, but please note it will abruptly closes record process therefore we are using local file system in case of windows/local environment
    } catch (err) {
      console.log("Error in killing gstreamer process", err);
    }
  }

  get _commandArgs() {
    let commandArgs = [
      `rtpbin name=rtpbin latency=50 buffer-mode=0 sdes="application/x-rtp-source-sdes, cname=(string)${this._rtpParameters.video.rtpParameters.rtcp.cname}"`,
      "!",
    ];

    commandArgs = commandArgs.concat(this._videoArgs);
    commandArgs = commandArgs.concat(this._audioArgs);
    commandArgs = commandArgs.concat(this._sinkArgs);
    commandArgs = commandArgs.concat(this._rtcpArgs);

    return commandArgs;
  }
  get _videoArgs() {
    const { video } = this._rtpParameters;
    // Get video codec info
    const videoCodecInfo = getCodecInfoFromRtpParameters(
      "video",
      video.rtpParameters
    );

    const VIDEO_CAPS = `application/x-rtp,width=1280,height=720,media=(string)video,clock-rate=(int)${
      videoCodecInfo.clockRate
    },payload=(int)${
      videoCodecInfo.payloadType
    },encoding-name=(string)${videoCodecInfo.codecName.toUpperCase()},ssrc=(uint)${
      video.rtpParameters.encodings[0].ssrc
    }`;

    return [
      `udpsrc port=${video.remoteRtpPort} caps="${VIDEO_CAPS}"`,
      "!",
      "rtpbin.recv_rtp_sink_0 rtpbin.",
      "!",
      "queue",
      "!",
      "rtpvp8depay",
      "!",
      "mux.",
    ];
  }

  get _audioArgs() {
    const { audio } = this._rtpParameters;
    // Get audio codec info
    const audioCodecInfo = getCodecInfoFromRtpParameters(
      "audio",
      audio.rtpParameters
    );

    const AUDIO_CAPS = `application/x-rtp,media=(string)audio,clock-rate=(int)${
      audioCodecInfo.clockRate
    },payload=(int)${
      audioCodecInfo.payloadType
    },encoding-name=(string)${audioCodecInfo.codecName.toUpperCase()},ssrc=(uint)${
      audio.rtpParameters.encodings[0].ssrc
    }`;

    return [
      `udpsrc port=${audio.remoteRtpPort} caps="${AUDIO_CAPS}"`,
      "!",
      "rtpbin.recv_rtp_sink_1 rtpbin.",
      "!",
      "queue",
      "!",
      "rtpopusdepay",
      "!",
      "opusdec",
      "!",
      "opusenc",
      "!",
      "mux.",
    ];
  }

  get _rtcpArgs() {
    const { video, audio } = this._rtpParameters;

    return [
      `udpsrc address=127.0.0.1 port=${video.remoteRtcpPort}`,
      "!",
      "rtpbin.recv_rtcp_sink_0 rtpbin.send_rtcp_src_0",
      "!",
      `udpsink host=127.0.0.1 port=${video.localRtcpPort} bind-address=127.0.0.1 bind-port=${video.remoteRtcpPort} sync=false async=false`,
      `udpsrc address=127.0.0.1 port=${audio.remoteRtcpPort}`,
      "!",
      "rtpbin.recv_rtcp_sink_1 rtpbin.send_rtcp_src_1",
      "!",
      `udpsink host=127.0.0.1 port=${audio.localRtcpPort} bind-address=127.0.0.1 bind-port=${audio.remoteRtcpPort} sync=false async=false`,
    ];
  }

  get _sinkArgs() {
    const commonArgs = ["webmmux name=mux", "!"];
    let sinks = [];
    if (PLATFORM === "windows") {
      sinks.push(
        `tee name=t ! queue ! filesink location=${RECORD_FILE_LOCATION_PATH}/${this._rtpParameters.fileName}.webm t. ! queue`
      );
      // return [
      //   "webmmux name=mux",
      //   "!",
      //   `filesink location=${RECORD_FILE_LOCATION_PATH}/${this._rtpParameters.fileName}.webm`,
      // ];
    } else {
      sinks.push(
        `tee name=t ! queue ! filesink location=${RECORD_FILE_LOCATION_PATH}/${this._rtpParameters.fileName}.webm t. ! queue`
      );
      sinks.push(
        `t. ! queue ! awss3sink access-key=${AWS_ACCESS_KEY_ID} secret-access-key=${AWS_SECRET_ACCESS_KEY} region=${AWS_REGION} bucket=${AWS_BUCKET_NAME} key=${AWS_S3_RECORD_FILES}/${this._rtpParameters.fileName}.webm`
      );
      // return [
      //   "webmmux name=mux",
      //   "!",
      //   `awss3sink access-key=${AWS_ACCESS_KEY_ID} secret-access-key=${AWS_SECRET_ACCESS_KEY} region=${AWS_REGION} bucket=${AWS_BUCKET_NAME} key=${AWS_S3_RECORD_FILES}/${this._rtpParameters.fileName}.webm`,
      // ];
    }
    return [...commonArgs, ...sinks];
  }
};
