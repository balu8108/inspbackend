const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const mediasoup = require("mediasoup");
const bodyParser = require("body-parser");
const upload = require("express-fileupload");
const scheduleJob = require("./jobs/scheduleJobs");
const { SOCKET_EVENTS, routesConstants } = require("./constants");
const { Server } = require("socket.io");
const scheduleLiveClass = require("./routes/scheduleliveclasses/scheduleLiveClass");
const genericRoutes = require("./routes/genericroutes/genericroutes");
const authenticationRoutes = require("./routes/authentication/authenticationRoutes");
const soloClassroomRoutes = require("./routes/soloclassroom/soloClassroom");
const myUploadRoutes = require("./routes/myuploads/assignment");
const recordingRoutes = require("./routes/recordings/recordings");
const studentFeedbackRoutes = require("./routes/studentfeedback/studentFeedackRoutes");
const lectureRoute = require("./routes/lecturesRoute/lectureRoutes");
const config = require("./socketcontrollers/config");

const { ENVIRON, ALLOWED_ORIGINS } = require("./envvar");

const {
  isSocketUserAuthenticated,
  socketPaidStatusOrTeacher,
} = require("./middlewares");

const {
  joinRoomPreviewSocketHandler,
  joinRoomSocketHandler,
  createWebRtcTransportSocketHandler,
  getProducersSocketHandler,
  connectWebRTCTransportSendSocketHandler,
  transportProduceSocketHandler,
  producerPauseSocketHandler,
  producerResumeSocketHandler,
  connectWebRTCTransportRecvSocketHandler,
  consumeSocketHandler,
  consumerResumeSocketHandler,
  disconnectSocketHandler,
  leaveRoomSocketHandler,
  endMeetSocketHandler,
  startRecordingSocketHandler,
  chatMsgSocketHandler,
  questionMsgSentByStudentSocketHandler,
  kickOutFromClassSocketHandler,
  questionsSocketHandler,
  stopProducingSocketHandler,
  uploadFileSocketHandler,
  setIsAudioStreamSocketEnabled,
  blockOrUnblockMicSocketHandler,
  muteMicCommandByMentorSocketHandler,
  pollTimeIncreaseSocketHandler,
  stopRecordingSocketHandler,
  studentTestAnswerResponseSocketHandler,
  replaceTrackSocketHandler,
} = require("./socketcontrollers/socketFunctions");

app.use(express.json({ limit: "200mb" }));
app.use(bodyParser.json({ limit: "200mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "200mb",
    extended: true,
  })
);
app.use(express.urlencoded({ limit: "200mb", extended: true }));
app.use((req, res, next) => {
  // Remove the 'X-Powered-By' header from all responses
  res.removeHeader("X-Powered-By");
  next();
});

app.use(upload()); // this is required for uploading multipart/formData
app.use(cors());

app.use(cookieParser());

app.use(routesConstants.SCHEDULE_LIVE_CLASS, scheduleLiveClass);
app.use(routesConstants.GENERIC_API, genericRoutes);
app.use(routesConstants.AUTH, authenticationRoutes);
app.use(routesConstants.SOLO, soloClassroomRoutes);
app.use(routesConstants.TOPIC_ASSIGNMENTS, myUploadRoutes);
app.use(routesConstants.RECORDING, recordingRoutes);
app.use(routesConstants.STUDENT_FEEDBACK, studentFeedbackRoutes);
app.use(routesConstants.LECTURES_ENDPOINT, lectureRoute);
// Cron jobs function
if (ENVIRON !== "local") {
  scheduleJob();
}
//scheduleJob();

// let worker;

const mediaSoupWorkers = new Map();

async function runMediasoupWorkers() {
  try {
    mediasoup.observer.on("newworker", (worker) => {
      worker.appData.routers = new Map();
      worker.appData.transports = new Map();
      worker.appData.producers = new Map();
      worker.appData.consumers = new Map();
      worker.observer.on("close", () => {
        // not needed as we have 'died' listiner below
        console.log("worker closed = ", worker.pid);
      });

      worker.observer.on("newrouter", (router) => {
        router.appData.transports = new Map();
        router.appData.producers = new Map();
        router.appData.consumers = new Map();
        router.appData.worker = worker;
        worker.appData.routers.set(router.id, router);

        router.observer.on("close", () => {
          worker.appData.routers.delete(router.id);
        });
        router.observer.on("newtransport", (transport) => {
          transport.appData.producers = new Map();
          transport.appData.consumers = new Map();
          transport.appData.router = router;
          router.appData.transports.set(transport.id, transport);

          transport.observer.on("close", () => {
            router.appData.transports.delete(transport.id);
          });

          transport.observer.on("newproducer", (producer) => {
            producer.appData.transport = transport;
            transport.appData.producers.set(producer.id, producer);
            router.appData.producers.set(producer.id, producer);
            worker.appData.producers.set(producer.id, producer);

            producer.observer.on("close", () => {
              transport.appData.producers.delete(producer.id);
              router.appData.producers.delete(producer.id);
              worker.appData.producers.delete(producer.id);
            });
          });

          transport.observer.on("newconsumer", (consumer) => {
            consumer.appData.transport = transport;
            transport.appData.consumers.set(consumer.id, consumer);
            router.appData.consumers.set(consumer.id, consumer);
            worker.appData.consumers.set(consumer.id, consumer);

            consumer.observer.on("close", () => {
              transport.appData.consumers.delete(consumer.id);
              router.appData.consumers.delete(consumer.id);
              worker.appData.consumers.delete(consumer.id);
            });
          });
        });
      });
    });
    const { numWorkers, workerConfig } = config;

    const { logLevel, logTags, rtcMinPort, rtcMaxPort } = workerConfig;
    const portInterval = Math.floor((rtcMaxPort - rtcMinPort) / numWorkers);

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel,
        logTags,
        rtcMinPort: rtcMinPort + i * portInterval,
        rtcMaxPort:
          i === numWorkers - 1
            ? rtcMaxPort
            : rtcMinPort + (i + 1) * portInterval - 1,
      });

      worker.on("died", () => {});

      mediaSoupWorkers.set(worker.pid, worker);
      console.log(`Worker ${i + 1} successfully created with id ${worker.pid}`);
    }
  } catch (err) {
    console.log("Some error in creating mediasoup worker", err);
  }
}

runMediasoupWorkers();

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  maxHttpBufferSize: 1e8, // 100 MB,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.use(isSocketUserAuthenticated);
io.use(socketPaidStatusOrTeacher);

io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
  socket.on(SOCKET_EVENTS.JOIN_ROOM_PREVIEW, (data, callback) => {
    joinRoomPreviewSocketHandler(data, callback, socket);
  });
  socket.on(SOCKET_EVENTS.JOIN_ROOM, (data, callback) => {
    joinRoomSocketHandler(data, callback, socket, mediaSoupWorkers);
  });
  socket.on(SOCKET_EVENTS.CREATE_WEB_RTC_TRANSPORT, (data, callback) => {
    createWebRtcTransportSocketHandler(data, callback, socket);
  });
  socket.on(SOCKET_EVENTS.TRANSPORT_SEND_CONNECT, (data) => {
    connectWebRTCTransportSendSocketHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.TRANSPORT_PRODUCE, (data, callback) => {
    transportProduceSocketHandler(data, callback, socket);
  });
  socket.on(SOCKET_EVENTS.GET_PRODUCERS, (data, callback) => {
    getProducersSocketHandler(callback, socket);
  });
  socket.on(SOCKET_EVENTS.TRANSPORT_RECV_CONNECT, (data) => {
    connectWebRTCTransportRecvSocketHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.CONSUME, (data, callback) => {
    consumeSocketHandler(data, callback, socket);
  });
  socket.on(SOCKET_EVENTS.CONSUMER_RESUME, (data) => {
    consumerResumeSocketHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.CHAT_MSG_TO_SERVER, (data) => {
    chatMsgSocketHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.QUESTION_SENT_TO_SERVER, (data, callback) => {
    questionsSocketHandler(data, callback, socket);
  });
  socket.on(SOCKET_EVENTS.ANSWER_SENT_TO_SERVER, (data) => {
    studentTestAnswerResponseSocketHandler(data, socket, io);
  });
  socket.on(SOCKET_EVENTS.STOP_PRODUCING, (data) => {
    stopProducingSocketHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.UPLOAD_FILE_TO_SERVER, (data, callback) => {
    uploadFileSocketHandler(data, callback, socket);
  });
  socket.on(SOCKET_EVENTS.PRODUCER_PAUSE, (data) => {
    producerPauseSocketHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.PRODUCER_RESUME, (data) => {
    producerResumeSocketHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.REPLACE_TRACK, (data) => {
    replaceTrackSocketHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.START_RECORDING, (data) => {
    startRecordingSocketHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.STOP_RECORDING, () => {
    stopRecordingSocketHandler(socket);
  });
  socket.on(SOCKET_EVENTS.IS_AUDIO_STREAM_ENABLED_TO_SERVER, (data) => {
    setIsAudioStreamSocketEnabled(data, socket, io);
  });
  socket.on(SOCKET_EVENTS.BLOCK_OR_UNBLOCK_MIC_TO_SERVER, (data) => {
    blockOrUnblockMicSocketHandler(data, socket, io);
  });
  socket.on(SOCKET_EVENTS.MUTE_MIC_COMMAND_BY_MENTOR_TO_SERVER, (data) => {
    muteMicCommandByMentorSocketHandler(data, socket, io);
  });
  socket.on(SOCKET_EVENTS.KICK_OUT_FROM_CLASS_TO_SERVER, (data) => {
    kickOutFromClassSocketHandler(data, socket, io);
  });
  socket.on(SOCKET_EVENTS.QUESTION_MSG_SENT_TO_SERVER, (data, callback) => {
    questionMsgSentByStudentSocketHandler(data, callback, socket, io);
  });
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, (callback) => {
    leaveRoomSocketHandler(callback, socket, io);
  });
  socket.on(SOCKET_EVENTS.END_MEET_TO_SERVER, () => {
    endMeetSocketHandler(socket, io);
  });
  socket.on(SOCKET_EVENTS.POLL_TIME_INCREASE_TO_SERVER, (data) => {
    pollTimeIncreaseSocketHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    disconnectSocketHandler(socket, io);
  });
});

module.exports = httpServer;
