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
const myUploadRoutes = require("./routes/myuploads/assignment");
const recordingRoutes = require("./routes/recordings/recordings");
const config = require("./socketcontrollers/config");
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
  blockOrUnblockMicHandler,
  muteMicCommandByMentorHandler,
  questionMsgSentByStudentHandler,
  pollTimeIncreaseHandler,
  replaceTrackHandler,
} = require("./socketcontrollers");

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
app.use(upload()); // this is required for uploading multipart/formData
app.use(cors());
app.use(cookieParser());

app.use(routesConstants.SCHEDULE_LIVE_CLASS, scheduleLiveClass);
app.use(routesConstants.GENERIC_API, genericRoutes);
app.use(routesConstants.AUTH, authenticationRoutes);
app.use(routesConstants.SOLO, soloClassroomRoutes);
app.use(routesConstants.TOPIC_ASSIGNMENTS, myUploadRoutes);
app.use(routesConstants.RECORDING, recordingRoutes);
// Cron jobs function
if (ENVIRON !== "local") {
  scheduleJob();
}
// scheduleJob();
// Cron jobs function

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
        console.log("new router created with id", router.id);

        router.appData.transports = new Map();
        router.appData.producers = new Map();
        router.appData.consumers = new Map();
        router.appData.worker = worker;
        worker.appData.routers.set(router.id, router);

        router.observer.on("close", () => {
          console.log("Router closed with id", router.id);
          worker.appData.routers.delete(router.id);
        });
        router.observer.on("newtransport", (transport) => {
          console.log("transport created", transport.id);
          transport.appData.producers = new Map();
          transport.appData.consumers = new Map();
          transport.appData.router = router;
          router.appData.transports.set(transport.id, transport);

          transport.observer.on("close", () => {
            console.log("transport closed id = ", transport.id);
            router.appData.transports.delete(transport.id);
          });

          transport.observer.on("newproducer", (producer) => {
            console.log("New Producer created", producer.id);
            producer.appData.transport = transport;
            transport.appData.producers.set(producer.id, producer);
            router.appData.producers.set(producer.id, producer);
            worker.appData.producers.set(producer.id, producer);
            console.log(
              "after creating router app data",
              router.appData.producers
            );

            producer.observer.on("close", () => {
              console.log("Producer closed id = ", producer.id);
              transport.appData.producers.delete(producer.id);
              router.appData.producers.delete(producer.id);
              worker.appData.producers.delete(producer.id);
            });
          });

          transport.observer.on("newconsumer", (consumer) => {
            console.log("new Consumer created", consumer.id);
            consumer.appData.transport = transport;
            transport.appData.consumers.set(consumer.id, consumer);
            router.appData.consumers.set(consumer.id, consumer);
            worker.appData.consumers.set(consumer.id, consumer);

            consumer.observer.on("close", () => {
              console.log("consumer closed id = ", consumer.id);
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

      worker.on("died", () => {
        console.log("Worker died with id", worker.id);
      });

      mediaSoupWorkers.set(worker.pid, worker);
      console.log(`Worker ${i + 1} successfully created with id ${worker.pid}`);
    }

    // const newWorker = await mediasoup.createWorker(workerConfig);
    // mediaSoupWorkers.set(newWorker.pid, newWorker);
  } catch (err) {
    console.log("Some error in creating mediasoup worker", err);
  }
}

runMediasoupWorkers();

const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  maxHttpBufferSize: 1e8, // 100 MB,
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
    joinRoomPreviewSocketHandler(data, callback, socket, io); // class based architecture change
    // joinRoomPreviewHandler(data, callback, socket, io); // Depreceted architecture
  });
  socket.on(SOCKET_EVENTS.JOIN_ROOM, (data, callback) => {
    joinRoomSocketHandler(data, callback, socket, io, mediaSoupWorkers);
    // joinRoomHandler(data, callback, socket, io, mediaSoupWorkers); // Depreceted architecture
  });
  socket.on(SOCKET_EVENTS.CREATE_WEB_RTC_TRANSPORT, (data, callback) => {
    createWebRtcTransportSocketHandler(
      data,
      callback,
      socket,
      io,
      mediaSoupWorkers
    );
    // createWebRtcTransportHandler(data, callback, socket, io, mediaSoupWorkers); // Depreceted architecture
  });
  socket.on(SOCKET_EVENTS.TRANSPORT_SEND_CONNECT, (data) => {
    connectWebRTCTransportSendSocketHandler(data, socket, mediaSoupWorkers);
    // connectWebRTCTransportSendHandler(data, socket, mediaSoupWorkers); // Depreceted architecture
  });
  socket.on(SOCKET_EVENTS.TRANSPORT_PRODUCE, (data, callback) => {
    transportProduceSocketHandler(data, callback, socket, mediaSoupWorkers);
    // transportProduceHandler(data, callback, socket, mediaSoupWorkers); // Depreceted architecture
  });
  socket.on(SOCKET_EVENTS.GET_PRODUCERS, (callback) => {
    getProducersSocketHandler(callback, socket, mediaSoupWorkers);
    // getProducersHandler(callback, socket, mediaSoupWorkers);
  });
  socket.on(SOCKET_EVENTS.TRANSPORT_RECV_CONNECT, (data) => {
    connectWebRTCTransportRecvSocketHandler(data, socket, mediaSoupWorkers);
    // connectWebRTCTransportRecvHandler(data, socket, mediaSoupWorkers); // Depreceted architecture
  });
  socket.on(SOCKET_EVENTS.CONSUME, (data, callback) => {
    consumeSocketHandler(data, callback, socket, mediaSoupWorkers);
    // consumeHandler(data, callback, socket, mediaSoupWorkers); // Depreceted architecture
  });
  socket.on(SOCKET_EVENTS.CONSUMER_RESUME, (data) => {
    consumerResumeSocketHandler(data, socket, mediaSoupWorkers);
    // consumerResumeHandler(data, socket, mediaSoupWorkers); // Depreceted architecture
  });
  socket.on(SOCKET_EVENTS.CHAT_MSG_TO_SERVER, (data) => {
    chatMsgSocketHandler(data, socket);
    // chatMsgHandler(data, socket); // Deprecated architecture
  });
  socket.on(SOCKET_EVENTS.QUESTION_SENT_TO_SERVER, (data, callback) => {
    questionsSocketHandler(data, callback, socket);
    // questionsHandler(data, callback, socket); // Deprecated Architecture
  });
  socket.on(SOCKET_EVENTS.ANSWER_SENT_TO_SERVER, (data) => {
    studentTestAnswerResponseSocketHandler(data, socket, io);
    // studentTestAnswerResponseHandler(data, socket, io); // Deprecated Architecture
  });
  socket.on(SOCKET_EVENTS.STOP_PRODUCING, (data) => {
    stopProducingSocketHandler(data, socket);
    // stopProducingHandler(data, socket); // Deprecated architecture
  });
  socket.on(SOCKET_EVENTS.RAISE_HAND_TO_SERVER, (data) => {
    raiseHandHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.UPLOAD_FILE_TO_SERVER, (data, callback) => {
    uploadFileSocketHandler(data, callback, socket);
    // uploadFileHandler(data, callback, socket); // Deprecated architecture
  });
  socket.on(SOCKET_EVENTS.PRODUCER_PAUSE, (data) => {
    producerPauseSocketHandler(data, socket);
    // producerPauseHandler(data, socket); // deprecated  architecture
  });
  socket.on(SOCKET_EVENTS.PRODUCER_RESUME, (data) => {
    producerResumeSocketHandler(data, socket);
    // producerResumeHandler(data, socket); // deprecated  architecture
  });
  socket.on(SOCKET_EVENTS.REPLACE_TRACK, (data) => {
    replaceTrackSocketHandler(data, socket);
    // replaceTrackHandler(data, socket); // deprecated  architecture
  });
  socket.on(SOCKET_EVENTS.START_RECORDING, (data) => {
    startRecordingSocketHandler(data, socket);
    // startRecordingHandler(data, socket); // deprecated architecture
  });
  socket.on(SOCKET_EVENTS.STOP_RECORDING, () => {
    stopRecordingSocketHandler(socket);
    // stopRecordingHandler(socket);
  });
  socket.on(SOCKET_EVENTS.MIRO_BOARD_DATA_TO_SERVER, (data) => {
    miroBoardDataHandler(data, socket);
  });
  socket.on(SOCKET_EVENTS.IS_AUDIO_STREAM_ENABLED_TO_SERVER, (data) => {
    setIsAudioStreamSocketEnabled(data, socket, io);
    // setIsAudioStreamEnabled(data, socket, io); // Deprecated architecture
  });
  socket.on(SOCKET_EVENTS.BLOCK_OR_UNBLOCK_MIC_TO_SERVER, (data) => {
    blockOrUnblockMicSocketHandler(data, socket, io);
    // blockOrUnblockMicHandler(data, socket, io);   // Deprecated architecture
  });
  socket.on(SOCKET_EVENTS.MUTE_MIC_COMMAND_BY_MENTOR_TO_SERVER, (data) => {
    muteMicCommandByMentorSocketHandler(data, socket, io);
    // muteMicCommandByMentorHandler(data, socket, io);  // Deprecated architecture
  });
  socket.on(SOCKET_EVENTS.KICK_OUT_FROM_CLASS_TO_SERVER, (data) => {
    kickOutFromClassSocketHandler(data, socket, io);
    // kickOutFromClassHandler(data, socket, io); // Deprecated architecture
  });
  socket.on(SOCKET_EVENTS.QUESTION_MSG_SENT_TO_SERVER, (data, callback) => {
    questionMsgSentByStudentSocketHandler(data, callback, socket, io);
    // questionMsgSentByStudentHandler(data, callback, socket, io); // Deprecated architecture
  });
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, (callback) => {
    leaveRoomSocketHandler(callback, socket, mediaSoupWorkers, io);
    // leaveRoomHandler(callback, socket, mediaSoupWorkers, io); // Deprecated architecture
    console.log("Client leaved the room", socket.id);
  });
  socket.on(SOCKET_EVENTS.END_MEET_TO_SERVER, () => {
    endMeetSocketHandler(socket, mediaSoupWorkers, io);
    // endMeetHandler(socket, mediaSoupWorkers, io);  // Deprecated architecture
    console.log("Client ended the meet", socket.id);
  });
  socket.on(SOCKET_EVENTS.POLL_TIME_INCREASE_TO_SERVER, (data) => {
    pollTimeIncreaseSocketHandler(data, socket);
    // pollTimeIncreaseHandler(data, socket); // Deprecated architecture
  });
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    disconnectSocketHandler(socket, mediaSoupWorkers, io);
    // disconnectHandler(socket, mediaSoupWorkers, io);
    console.log("disconnected client with socket id", socket.id);
  });
});

module.exports = httpServer;
