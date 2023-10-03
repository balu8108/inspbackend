const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const mediasoup = require("mediasoup");
const bodyParser = require("body-parser");
const upload = require("express-fileupload");
const scheduleJob = require("./jobs/scheduleJobs");
const { SOCKET_EVENTS, routesConstants } = require("./constants");
const scheduleLiveClass = require("./routes/scheduleliveclasses/scheduleLiveClass");
const genericRoutes = require("./routes/genericroutes/genericroutes");
const authenticationRoutes = require("./routes/authentication/authenticationRoutes");
const soloClassroomRoutes = require("./routes/soloclassroom/soloClassroom");
const myUploadRoutes = require("./routes/myuploads/assignment")
const { ENVIRON } = require("./envvar");
const {
  isSocketUserAuthenticated,
  socketPaidStatusOrTeacher,
} = require("./middlewares");
const {
  joinRoomPreviewHandler,
  joinRoomHandler,
  createWebRtcTransportHandler,
  connectWebRTCTransportSendHandler,
  transportProduceHandler,
  getProducersHandler,
  connectWebRTCTransportRecvHandler,
  consumeHandler,
  consumerResumeHandler,
  chatMsgHandler,
  disconnectHandler,
  leaveRoomHandler,
  questionsHandler,
  stopProducingHandler,
  raiseHandHandler,
  uploadFileHandler,
  startRecordingHandler,
  stopRecordingHandler,
  producerPauseHandler,
  producerResumeHandler,
  studentTestAnswerResponseHandler,
  miroBoardDataHandler,
  endMeetHandler,
  setIsAudioStreamEnabled,
  kickOutFromClassHandler,
} = require("./socketcontrollers");

app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(upload()); // this is required for uploading multipart/formData
app.use(cors());
app.use(cookieParser());

app.use(routesConstants.SCHEDULE_LIVE_CLASS, scheduleLiveClass);
app.use(routesConstants.GENERIC_API, genericRoutes);
app.use(routesConstants.AUTH, authenticationRoutes);
app.use(routesConstants.SOLO,soloClassroomRoutes);
app.use(routesConstants.TOPIC_ASSIGNMENTS,myUploadRoutes);
// Cron jobs function
if (ENVIRON !== "local") {
  // scheduleJob();
}
// scheduleJob();
// Cron jobs function

let worker;

(async () => {
  worker = await mediasoup.createWorker({
    logLevel: "warn",
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  console.log("worker created", worker.pid);
})();

const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.use(isSocketUserAuthenticated);
io.use(socketPaidStatusOrTeacher);

io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
  console.log("connected client with socket id", socket.id);

  socket.on(SOCKET_EVENTS.JOIN_ROOM_PREVIEW, (data, callback) => {
    joinRoomPreviewHandler(data, callback, socket, io);
  });
  socket.on(SOCKET_EVENTS.JOIN_ROOM, (data, callback) => {
    joinRoomHandler(data, callback, socket, io, worker);
  });
  socket.on(SOCKET_EVENTS.CREATE_WEB_RTC_TRANSPORT, (data, callback) => {
    createWebRtcTransportHandler(data, callback, socket, io, worker);
  });
  socket.on(SOCKET_EVENTS.TRANSPORT_SEND_CONNECT, (data) => {
    connectWebRTCTransportSendHandler(data, socket, worker);
  });
  socket.on(SOCKET_EVENTS.TRANSPORT_PRODUCE, (data, callback) => {
    transportProduceHandler(data, callback, socket, worker);
  });
  socket.on(SOCKET_EVENTS.GET_PRODUCERS, (callback) => {
    getProducersHandler(callback, socket, worker);
  });
  socket.on(SOCKET_EVENTS.TRANSPORT_RECV_CONNECT, (data) => {
    connectWebRTCTransportRecvHandler(data, socket, worker);
  });
  socket.on(SOCKET_EVENTS.CONSUME, (data, callback) => {
    consumeHandler(data, callback, socket, worker);
  });
  socket.on(SOCKET_EVENTS.CONSUMER_RESUME, (data) => {
    consumerResumeHandler(data, socket, worker);
  });
  socket.on(SOCKET_EVENTS.CHAT_MSG_TO_SERVER, (data) => {
    chatMsgHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.QUESTION_SENT_TO_SERVER, (data) => {
    questionsHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.ANSWER_SENT_TO_SERVER, (data) => {
    studentTestAnswerResponseHandler(data, socket, io);
  });
  socket.on(SOCKET_EVENTS.STOP_PRODUCING, (data) => {
    stopProducingHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.RAISE_HAND_TO_SERVER, (data) => {
    raiseHandHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.UPLOAD_FILE_TO_SERVER, (data, callback) => {
    uploadFileHandler(data, callback, socket);
  });
  socket.on(SOCKET_EVENTS.PRODUCER_PAUSE, (data) => {
    producerPauseHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.PRODUCER_RESUME, (data) => {
    producerResumeHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.START_RECORDING, (data) => {
    startRecordingHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.STOP_RECORDING, () => {
    stopRecordingHandler(socket);
  });
  socket.on(SOCKET_EVENTS.MIRO_BOARD_DATA_TO_SERVER, (data) => {
    miroBoardDataHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.IS_AUDIO_STREAM_ENABLED_TO_SERVER, (data) => {
    setIsAudioStreamEnabled(data, socket, io);
  });
  socket.on(SOCKET_EVENTS.KICK_OUT_FROM_CLASS_TO_SERVER, (data) => {
    kickOutFromClassHandler(data, socket, io);
  });
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, (callback) => {
    leaveRoomHandler(callback, socket, worker, io);
    console.log("Client leaved the room", socket.id);
  });
  socket.on(SOCKET_EVENTS.END_MEET_TO_SERVER, () => {
    endMeetHandler(socket, worker, io);
    console.log("Client ended the meet", socket.id);
  });
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    disconnectHandler(socket, worker, io);
    console.log("disconnected client with socket id", socket.id);
  });
});

module.exports = httpServer;
