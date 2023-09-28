let {
  rooms,
  peers,
  transports,
  producers,
  consumers,
  testQuestions,
  testResponses,
} = require("./socketglobalvariables");

const uuidv4 = require("uuid").v4;

const {
  SOCKET_EVENTS,
  mediaCodecs,
  liveClassLogInfo,
  classStatus,
  liveClassTestQuestionLogInfo,
} = require("../constants");
const config = require("./config");
const { getPort } = require("./port");
const {
  LiveClassRoomFile,
  LiveClassRoom,
  LiveClassLog,
  LiveClassTestQuestionLog,
  LiveClassBlockedPeer,
} = require("../models");
const {
  uploadFilesToS3,
  updateLeaderboard,
  isFeedbackProvided,
} = require("../utils");
const { ENVIRON } = require("../envvar");

const FFmpeg = require("./ffmpeg");
const Gstreamer = require("./gstreamer");
const RECORD_PROCESS_NAME = "GStreamer";

const createOrJoinRoomFunction = async (data, authData, socketId, worker) => {
  try {
    // check if create room have this id or not
    let router1;
    let peers = [];
    let mentors = [];
    if ("roomId" in data) {
      // means room exist then add this peer to given room
      let roomId = data.roomId;
      let peerDetails = authData;

      const liveClass = await LiveClassRoom.findOne({
        where: { roomId: roomId },
      });

      if (!liveClass) {
        return {
          roomId: false,
          router1: false,
          newPeerDetails: null,
          liveClass: null,
          errMsg: "No Class with this room id",
        }; // No corresponding room in db
      }
      // update logs if peer is a teacher and change status of class to Ongoing
      if (peerDetails) {
        // check if the peer is blocked from this class
        // check if this peer is not blocked
        const isPeerBlocked = await LiveClassBlockedPeer.findOne({
          where: {
            classRoomId: liveClass?.id,
            blockedPersonId: peerDetails.id,
            isBlocked: true,
          },
        });
        if (isPeerBlocked) {
          return {
            roomId: false,
            router1: false,
            newPeerDetails: null,
            liveClass: null,
            errMsg: "You are blocked from this class",
          }; // No corresponding room in db
        }

        // check if already this peer exists in peers
        const isPeerExists = rooms[roomId]?.peers.find(
          (peer) => peer.id === peerDetails.id
        );
        if (isPeerExists) {
          return {
            roomId: false,
            router1: false,
            errMsg: "You have already joined the class!!",
          };
        }
        if (peerDetails.user_type === 1) {
          liveClass.classStatus = classStatus.ONGOING;
          await liveClass.save();
          LiveClassLog.create({
            classRoomId: liveClass.id,
            logInfo: liveClassLogInfo.TEACHER_JOINED,
          });
        }
      }

      let newPeerDetails = {
        socketId: socketId,
        id:
          ENVIRON !== "local"
            ? authData.id
            : authData.id + Math.floor(Math.random() * (10000 - 1 + 1)) + 1,
        name:
          ENVIRON !== "local"
            ? authData.name
            : authData.name + Math.floor(Math.random() * (10000 - 1 + 1)) + 1,
        isTeacher: authData?.user_type === 1,
        isAudioEnabled: false,
        isVideoEnabled: false,
        isScreenSharingEnabled: false,
      };

      // search within rooms object whether this roomId exists or not?
      // if exists then send roomId and router back
      // if not exists then check in db whether that room exists or not?
      // if exists then create the new room
      // if not exists then send false,false
      // In below mentors key we are taking an array as we can have multiple mentors in a class
      if (roomId in rooms) {
        router1 = rooms[roomId].router;
        peers = rooms[roomId].peers || [];
        mentors = rooms[roomId].mentors || [];

        rooms[roomId] = {
          router: router1,
          mentors: newPeerDetails.isTeacher
            ? [...mentors, newPeerDetails]
            : [...mentors],
          peers: [...peers, newPeerDetails],
        };

        return { roomId, router1, newPeerDetails, liveClass: liveClass };
      } else {
        // TODO Check in db and then create room if it exists otherwise don't create and send false,false
        // Right now we will create using uuid
        // let generateRoomId = uuidv4();
        router1 = await worker.createRouter({ mediaCodecs });

        rooms[roomId] = {
          router: router1,
          mentors: newPeerDetails.isTeacher
            ? [...mentors, newPeerDetails]
            : [...mentors],
          peers: [...peers, newPeerDetails],
        };
        return { roomId, router1, newPeerDetails, liveClass: liveClass };
      }
    } else {
      // no room Id supplied then send false,false
      return { roomId: false, router1: false, errMsg: "No room id given" };
    }
  } catch (err) {
    console.log("Error in create or join room Function");
  }
};

// rooms contains temporarily the rooms that are currently active means there is at least one peer in the room

const joinRoomPreviewHandler = (data, callback, socket, io) => {
  try {
    const { roomId } = data;
    if (roomId) {
      // check from existing rooms if it exist if not exist then go to below step
      // TODO check from database if roomId exist if it exist then send them empty array and also success as true
      // once any one peer joins we will create the room
      // when everybody leaves we will destroy the temporary room
      if (roomId in rooms) {
        socket.join(roomId);
        callback({ success: true, peers: rooms[roomId].peers });
      } else {
        // most likely no body joins
        socket.join(roomId);
        callback({ success: true, peers: [] });
      }
    }
    callback({ success: false }); // No room id supplied
  } catch (err) {
    console.log("Error in join room Preview Handler", err);
  }
};

const joinRoomHandler = async (data, callback, socket, io, worker) => {
  try {
    const { authData } = socket;
    const { roomId, router1, newPeerDetails, liveClass, errMsg } =
      await createOrJoinRoomFunction(data, authData, socket.id, worker);
    if (roomId === false && router1 === false) {
      callback({ success: false, errMsg }); // No room id/something not supplied
    } else {
      peers[socket.id] = {
        socket,
        roomId,
        classPk: liveClass?.id,
        transports: [],
        producers: [],
        consumers: [],
        peerDetails: newPeerDetails,
      };

      const rtpCapabilities = router1.rtpCapabilities;
      callback({ success: true, roomId, rtpCapabilities });
      socket.broadcast.to(roomId).emit(SOCKET_EVENTS.NEW_PEER_JOINED, {
        peer: newPeerDetails,
      }); // later on we will send the peer details send all joined user that new user joined
      socket.emit(SOCKET_EVENTS.ROOM_UPDATE, { peers: rooms[roomId].peers }); // send all peers to new joinee
    }
  } catch (err) {
    console.log("Error in join room hander", err);
  }
};

const createWebRtcTransport = async (router) => {
  try {
    const webRtcOptions = config.webRtcTransport;

    let transport = await router.createWebRtcTransport(webRtcOptions);
    transport.on(SOCKET_EVENTS.DTLS_STATE_CHANGE, (dtlsState) => {
      if (dtlsState === "closed") {
        transport.close();
      }
    });

    transport.on(SOCKET_EVENTS.CLOSE, () => {
      console.log("transport closed");
    });
    return transport;
  } catch (err) {
    return err;
  }
};

const addTransport = (transport, roomId, consumer, socket) => {
  try {
    transports = [
      ...transports,
      { socketId: socket.id, transport, roomId, consumer },
    ];
    peers[socket.id] = {
      ...peers[socket.id],
      transports: [...peers[socket.id].transports, transport.id],
    };
  } catch (err) {
    console.log("Error in Add transport socket function", err);
  }
};

const createWebRtcTransportHandler = async (
  data,
  callback,
  socket,
  io,
  worker
) => {
  try {
    const { consumer } = data;
    const roomId = peers[socket.id].roomId;
    const router = rooms[roomId].router;

    const transport = await createWebRtcTransport(router);
    if (transport) {
      const dtlsData = {
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      };

      callback(dtlsData);
      addTransport(transport, roomId, consumer, socket);
    }
  } catch (err) {
    console.log("Error in createWebRtcTransportHandler", err);
  }
};

const getTransport = (socketId) => {
  try {
    const [producerTransport] = transports.filter(
      (transport) => transport.socketId === socketId && !transport.consumer
    );
    return producerTransport.transport;
  } catch (err) {
    console.log("Error in getTransport", err);
  }
};

const connectWebRTCTransportSendHandler = (data, socket, worker) => {
  // this is for connecting the producer transport
  try {
    const { dtlsParameters } = data;
    getTransport(socket.id).connect({ dtlsParameters });
  } catch (err) {
    console.log("Error in connectWebRTCTransportSendHandler", err);
  }
};

const addProducer = (producer, roomId, socket) => {
  try {
    producers = [...producers, { socketId: socket.id, producer, roomId }];

    peers[socket.id] = {
      ...peers[socket.id],
      producers: [...peers[socket.id].producers, producer.id],
    };
  } catch (err) {
    console.log("Error in addProducer", err);
  }
};

const transportProduceHandler = async (data, callback, socket, worker) => {
  try {
    const { kind, rtpParameters, appData } = data;

    // create producer using the transport for this socket id
    const producer = await getTransport(socket.id).produce({
      kind,
      rtpParameters,
      appData,
    });

    const { roomId } = peers[socket.id];
    addProducer(producer, roomId, socket); // add producer into prodicer list
    // POSSIBLE_TODO - We may require remove Producer also so that when either a producer leaves or it stops producing then it should not be there in the producer list
    // emit that new-producer started like someone started his video streaming and do not send the stream to the original user who initiated the request

    socket.broadcast.to(roomId).emit(SOCKET_EVENTS.NEW_PRODUCER, {
      producerId: producer.id,
      appData: appData,
    });

    producer.on(SOCKET_EVENTS.TRANSPORT_CLOSE, () => {
      // later on we may need to do some cleanups here
      producer.close();
    });

    // we actually do not need to send produceExist as when someone joins we send the producer list after joining always
    callback({
      id: producer.id,
      producerExist: producers.length >= 1, // required if some new user joins and already some of the user are producing the stream then in frontend we will consume all the producer
    });
  } catch (err) {
    console.log("Error in transportProduceHandler", err);
  }
};

const getProducersHandler = (callback, socket, worker) => {
  try {
    // send back all the producers list to the user of the room to which this user belongs
    const { roomId } = peers[socket.id];
    let producersList = [];
    // do not send the producer who has requested for the producers list
    // as he wants to consume all data from other producer not from himself

    producers.forEach((producer) => {
      if (producer.socketId !== socket.id && producer.roomId === roomId) {
        let obj = {
          producerId: producer.producer.id,
          appData: producer.producer.appData,
        };
        producersList = [...producersList, obj];
      }
    });

    callback(producersList);
  } catch (err) {
    console.log("Error in getProducersHandler", err);
  }
};

const connectWebRTCTransportRecvHandler = async (data, socket, worker) => {
  try {
    const { dtlsParameters, serverConsumerTransportId } = data;
    // find the transport and check if that transport is consumer type
    const consumerTransport = transports.find(
      (transportData) =>
        transportData.consumer &&
        transportData.transport.id == serverConsumerTransportId
    ).transport;
    await consumerTransport.connect({ dtlsParameters });
  } catch (err) {
    console.log("Error in connectWebRTCTransportRecvHandler", err);
  }
};

const addConsumer = (consumer, roomId, socket) => {
  try {
    consumers = [...consumers, { socketId: socket.id, consumer, roomId }];
    peers[socket.id] = {
      ...peers[socket.id],
      consumers: [...peers[socket.id].consumers, consumer.id],
    };
  } catch (err) {
    console.log("Error in addConsumer", err);
  }
};

const consumeHandler = async (data, callback, socket, worker) => {
  const {
    rtpCapabilities,
    remoteProducerId,
    serverConsumerTransportId,
    appData,
  } = data;

  try {
    const { roomId } = peers[socket.id];
    const router = rooms[roomId].router;
    let consumerTransport = transports.find(
      (transport) =>
        transport.consumer &&
        transport.transport.id === serverConsumerTransportId
    ).transport;
    if (router.canConsume({ producerId: remoteProducerId, rtpCapabilities })) {
      // transport can consume and return a consumer
      const consumer = await consumerTransport.consume({
        producerId: remoteProducerId,
        rtpCapabilities,
        paused: true,
      });

      consumer.on(SOCKET_EVENTS.PRODUCERPAUSE, () => {
        socket.emit(SOCKET_EVENTS.PRODUCER_PAUSED, {
          appData,
          remoteProducerId,
        });
      });
      consumer.on(SOCKET_EVENTS.PRODUCERRESUME, () => {
        console.log("producer resmue");
        socket.emit(SOCKET_EVENTS.PRODUCER_RESUMED, {
          appData,
          remoteProducerId,
        });
      });

      // on transport close
      consumer.on(SOCKET_EVENTS.TRANSPORT_CLOSE, () => {});
      // on producer close
      consumer.on(SOCKET_EVENTS.PRODUCERCLOSE, () => {
        socket.emit(SOCKET_EVENTS.PRODUCER_CLOSED, { remoteProducerId });

        consumerTransport.close();
        transports = transports.filter(
          (transportData) => transportData.transport.id !== consumerTransport.id
        );
        consumer.close();
        consumers = consumers.filter(
          (consumerData) => consumerData.consumer.id !== consumer.id
        );
      });

      addConsumer(consumer, roomId, socket);
      const params = {
        id: consumer.id,
        producerId: remoteProducerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        serverConsumerId: consumer.id,
      };
      callback({ params });
    }
  } catch (err) {
    callback({ params: { error: err } });
  }
};

const consumerResumeHandler = async (data, socket, worker) => {
  try {
    const { serverConsumerId } = data;
    const { consumer } = consumers.find(
      (consumer) => consumer.consumer.id === serverConsumerId
    );
    await consumer.resume();
  } catch (err) {
    console.log("Error in consumerResumeHandler", err);
  }
};

const removeItems = (items, socketId, type) => {
  try {
    items.forEach((item) => {
      if (item.socketId === socketId) {
        item[type].close();
      }
    });
    items = items.filter((item) => item.socketId !== socketId);
    return items;
  } catch (err) {
    console.log("Error in removeItems", err);
  }
};

const chatMsgHandler = (data, socket) => {
  try {
    const { roomId, peerDetails } = peers[socket.id];
    const { msg } = data;
    socket.broadcast.to(roomId).emit(SOCKET_EVENTS.CHAT_MSG_FROM_SERVER, {
      msg: msg,
      peerDetails: peerDetails,
    }); // broadcast message to all
  } catch (err) {
    console.log("Error in chatMsgHandler", err);
  }
};

const disconnectHandler = async (socket, worker, io) => {
  try {
    consumers = removeItems(consumers, socket.id, "consumer");
    producers = removeItems(producers, socket.id, "producer");
    transports = removeItems(transports, socket.id, "transport");
    if (socket.id in peers) {
      const { roomId } = peers[socket.id];
      const leavingPeer = peers[socket.id];
      delete peers[socket.id];

      rooms[roomId] = {
        router: rooms[roomId].router,
        mentors: rooms[roomId].mentors.filter(
          (mentor) => mentor.id !== leavingPeer.peerDetails.id
        ),
        peers: rooms[roomId].peers.filter(
          (peer) => peer.id !== leavingPeer.peerDetails.id
        ),
      };

      if (rooms[roomId].peers.length === 0) {
        delete rooms[roomId];
        socket.leave(roomId);
        io.to(roomId).emit(SOCKET_EVENTS.PEER_LEAVED, {
          peerLeaved: leavingPeer.peerDetails,
        });
      } else {
        socket.leave(roomId);
        io.to(roomId).emit(SOCKET_EVENTS.PEER_LEAVED, {
          peerLeaved: leavingPeer.peerDetails,
        });
      }
    }
  } catch (err) {
    console.log("Error in disconnectHandler", err);
  }
};

const leaveRoomHandler = async (callback, socket, worker, io) => {
  try {
    consumers = removeItems(consumers, socket.id, "consumer");
    producers = removeItems(producers, socket.id, "producer");
    transports = removeItems(transports, socket.id, "transport");
    if (socket.id in peers) {
      const { roomId } = peers[socket.id];
      const leavingPeer = peers[socket.id];
      delete peers[socket.id];

      rooms[roomId] = {
        router: rooms[roomId].router,
        mentors: rooms[roomId].mentors.filter(
          (mentor) => mentor.id !== leavingPeer.peerDetails.id
        ),
        peers: rooms[roomId].peers.filter(
          (peer) => peer.id !== leavingPeer.peerDetails.id
        ),
      };

      const { success, isFeedback, feedBackTopicId } = await isFeedbackProvided(
        leavingPeer.peerDetails,
        roomId
      );

      callback({
        feedBackStatus: { success, isFeedback, feedBackTopicId },
      });

      if (rooms[roomId].peers.length === 0) {
        delete rooms[roomId];
        socket.leave(roomId);
        io.to(roomId).emit(SOCKET_EVENTS.PEER_LEAVED, {
          peerLeaved: leavingPeer.peerDetails,
        });
      } else {
        socket.leave(roomId);
        io.to(roomId).emit(SOCKET_EVENTS.PEER_LEAVED, {
          peerLeaved: leavingPeer.peerDetails,
        });
      }
    }
  } catch (err) {
    console.log("Error in disconnectHandler", err);
  }
};
const endMeetHandler = async (socket, worker, io) => {
  // End meet by mentor
  try {
    const { roomId } = peers[socket.id];
    if (roomId in rooms) {
      // send all the room-mates as meeting ended to navigate user
      io.in(roomId).emit(SOCKET_EVENTS.END_MEET_FROM_SERVER);

      const liveClassRoom = await LiveClassRoom.findOne({
        where: { roomId: roomId },
      });
      if (liveClassRoom) {
        liveClassRoom.classStatus = classStatus.FINISHED;
        liveClassRoom.save();
      }

      // cleanups
      // rooms[roomId].peers.forEach(async (peer) => {
      //   consumers = removeItems(consumers, peer.socketId, "consumer");
      //   producers = removeItems(producers, peer.socketId, "producer");
      //   transports = removeItems(transports, peer.socketId, "transport");
      //   delete peers[peer.socketId];
      // });
      // delete rooms[roomId];
      // // Change class status to Finished
      // const liveClassRoom = await LiveClassRoom.findOne({
      //   where: { roomId: roomId },
      // });
      // if (liveClassRoom) {
      //   liveClassRoom.classStatus = classStatus.FINISHED;
      //   liveClassRoom.save();
      // }
    }
  } catch (err) {
    console.log("Error in ending meet", err);
  }
};
const questionsHandler = async (data, socket) => {
  try {
    const { roomId, classPk } = peers[socket.id];
    const qId = uuidv4();
    data = { ...data, questionId: qId };
    if (roomId in testQuestions) {
      testQuestions[roomId].push(data);
    } else {
      testQuestions[roomId] = [data];
    }
    // Seed question log to db
    await LiveClassTestQuestionLog.create({
      logInfo: liveClassTestQuestionLogInfo.NEW_QUESTION_ADDED,
      questionNo: data.questionNo,
      questionId: data.questionId,
      questionType: data.type,
      classRoomId: classPk,
    });
    // there can be polls mcq and qna
    socket.broadcast
      .to(roomId)
      .emit(SOCKET_EVENTS.QUESTION_SENT_FROM_SERVER, { data });
  } catch (err) {
    console.log("Error in questionsHandler", err);
  }
};

const stopProducingHandler = (data, socket) => {
  try {
    // getting producer Id to stop producing
    const { roomId } = peers[socket.id];
    const { producerId, producerAppData } = data;
    const producer = producers.find(
      (producer) => producer.producer.id === producerId
    );
    producer.producer.close(); // this will fire of all the consumers producer close event above in consume handler we can do some cleanups there
    // after close we can emit to broadcast everyone that producer closed at the moment

    socket.broadcast.to(roomId).emit(SOCKET_EVENTS.SOME_PRODUCER_CLOSED, {
      producerId,
      producerAppData,
    });
  } catch (err) {
    console.log("Error in stopProducingHandler", err);
  }
};

const raiseHandHandler = (data, socket) => {
  try {
    const { isHandRaised } = data;
    const { roomId, peerDetails } = peers[socket.id];
    socket.broadcast.to(roomId).emit(SOCKET_EVENTS.RAISE_HAND_FROM_SERVER, {
      isHandRaised,
      peerDetails,
    });
  } catch (err) {
    console.log("Error in raiseHandHandler", err);
  }
};

const uploadFileHandler = async (data, callback, socket) => {
  // will receive array of files data buffer  and then broadcast to all

  // upload to AWS S3 First
  try {
    const getRoom = await LiveClassRoom.findOne({
      where: { roomId: data?.roomId },
    });
    if (!getRoom) {
      throw new Error("Something went wrong");
    }

    console.log("data", data);
    const fileUploads = await uploadFilesToS3(
      data?.files,
      `files/roomId_${data?.roomId}`
    );
    let filesResArray = [];
    if (fileUploads) {
      console.log("fileUploads", fileUploads);
      for (const file of fileUploads) {
        const newFileToDB = await LiveClassRoomFile.create({
          key: file.key,
          url: file.url,
          classRoomId: getRoom.id,
        });
        filesResArray.push(newFileToDB);
      }
    } else {
      throw new Error("Unable to upload files");
    }
    callback({
      success: true,
      data: {
        roomType: data?.roomType,
        roomId: data?.roomId,
        files: filesResArray,
      },
    });
    socket.broadcast.to(roomId).emit(SOCKET_EVENTS.UPLOAD_FILE_FROM_SERVER, {
      roomType: data?.roomType,
      roomId: data?.roomId,
      files: filesResArray,
    });
  } catch (err) {
    callback({ success: false, data: err.message });
  }
};

const publishProducerRTPStream = async (peer, producer, router) => {
  try {
    const rtpTransportConfig = config.plainRtpTransport;
    // create plain transport
    const rtpTransport = await router.createPlainTransport(rtpTransportConfig);
    const remoteRtpPort = await getPort();
    let remoteRtcpPort;
    // If rtpTransport rtcpMux is false also set the receiver RTCP ports, require for Gstreamer but not for ffmpeg
    if (!rtpTransportConfig.rtcpMux) {
      remoteRtcpPort = await getPort();
    }
    await rtpTransport.connect({
      ip: "127.0.0.1",
      port: remoteRtpPort,
      rtcpPort: remoteRtcpPort,
    });

    const codecs = [];
    // Codec passed to the RTP Consumer must match the codec in the Mediasoup router rtpCapabilities
    const routerCodec = router.rtpCapabilities.codecs.find(
      (codec) => codec.kind === producer.kind
    );
    codecs.push(routerCodec);

    const rtpCapabilities = {
      codecs,
      rtcpFeedback: [],
    };
    const rtpConsumer = await rtpTransport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: true,
    });

    rtpConsumer.on(SOCKET_EVENTS.PRODUCERPAUSE, () => {
      console.log("recording process screen share paused", producer?.id);
    });
    rtpConsumer.on(SOCKET_EVENTS.PRODUCERRESUME, () => {
      console.log("recording process screen share resumed", producer?.id);
    });

    addConsumer(rtpConsumer, peer.roomId, peer.socket);
    // consumers

    return {
      remoteRtpPort,
      remoteRtcpPort,
      localRtpPort: rtpTransport.tuple.localPort,
      localRtcpPort: rtpTransport.rtcpTuple
        ? rtpTransport.rtcpTuple.localPort
        : undefined,
      rtpCapabilities,
      rtpParameters: rtpConsumer.rtpParameters,
    };
  } catch (err) {
    console.log("Error in publishProducerRTPStream", err);
  }
};

const getProcess = (recordInfo) => {
  switch (RECORD_PROCESS_NAME) {
    case "FFmpeg":
      return new FFmpeg(recordInfo);
    case "GStreamer":
      return new Gstreamer(recordInfo);
    default:
      return new FFmpeg(recordInfo);
  }
};

const startRecord = async (peer, peerProducersList, router) => {
  try {
    let recordInfo = {};

    for (const obj of peerProducersList) {
      recordInfo["producerId"] = obj.producer.id;
      recordInfo[obj.producer.kind] = await publishProducerRTPStream(
        peer,
        obj.producer,
        router
      );
    }

    recordInfo.fileName = `${peer.roomId}-${Date.now().toString()}`;

    let recordProcess = getProcess(recordInfo);
    peers[peer.socket.id] = { ...peer, recordProcess: recordProcess };

    console.log("consumer", consumers);

    setTimeout(async () => {
      for (const consumer of consumers) {
        if (
          consumer.socketId === peer.socket.id &&
          consumer.roomId === peer.roomId
        ) {
          await consumer.consumer.resume();
          await consumer.consumer.requestKeyFrame();
        }
      }
    }, 1000);
  } catch (err) {
    console.log("Error in startRecord", err);
  }
};

const startRecordingHandler = (data, socket) => {
  try {
    const peer = peers[socket.id];
    const router = rooms[peer.roomId].router;
    // expecting some producers like screenshare and audio share of mentor to record using FFmpeg or gstreamer
    const { producerScreenShare, producerAudioShare } = data;
    if (peer.recordProcess) {
      peer.recordProcess.kill();
      return;
    }

    const peerProducersList = producers.filter(
      (obj) =>
        obj.roomId === peer.roomId &&
        obj.socketId === socket.id &&
        (obj.producer.id === producerScreenShare?._id ||
          obj.producer.id === producerAudioShare?._id)
    );

    if (peerProducersList.length > 0) {
      startRecord(peer, peerProducersList, router);
    }
  } catch (err) {
    console.log("Error in startRecordingHandler", err);
  }
};

const producerPauseHandler = (data, socket) => {
  try {
    const { appData, producerId } = data;
    const { roomId } = peers[socket.id];
    const producer = producers.find(
      (obj) =>
        obj.roomId === roomId &&
        obj.producer.id === producerId &&
        obj.socketId === socket.id
    );
    if (producer) {
      producer.producer.pause(); // pause the producer
    }
  } catch (err) {
    console.log("Error in producerPauseHandler", err);
  }
};

const producerResumeHandler = (data, socket) => {
  try {
    const { appData, producerId } = data;
    const { roomId } = peers[socket.id];
    const producer = producers.find(
      (obj) =>
        obj.roomId === roomId &&
        obj.producer.id === producerId &&
        obj.socketId === socket.id
    );
    if (producer) {
      producer.producer.resume(); // pause the producer
    }
  } catch (err) {
    console.log("Error in producerResumeHandler", err);
  }
};

const studentTestAnswerResponseHandler = (data, socket, io) => {
  try {
    const { classPk, roomId, peerDetails } = peers[socket.id];
    const updatedLeaderboard = updateLeaderboard(
      classPk,
      roomId,
      peerDetails,
      data
    );
    const getAllTeachers = rooms[roomId].mentors;

    getAllTeachers.forEach(async (peer) => {
      // send leader board to specific teacher
      io.to(peer.socketId).emit(SOCKET_EVENTS.LEADERBOARD_FROM_SERVER, {
        leaderBoard: updatedLeaderboard,
      });
    });
    console.log("updatedLeaderboard", updatedLeaderboard);
  } catch (err) {
    console.log("Error in studentTestAnswerResponseHandler", err);
  }
};

const miroBoardDataHandler = (data, socket) => {
  try {
    const { roomId } = peers[socket.id];
    socket.broadcast
      .to(roomId)
      .emit(SOCKET_EVENTS.MIRO_BOARD_DATA_FROM_SERVER, data);
  } catch (err) {
    console.log("Err in Miro board data handler", err);
  }
};

const stopRecordingHandler = (socket) => {
  try {
    const peer = peers[socket.id];
    if (peer?.recordProcess) {
      peer.recordProcess.kill();
      peers[socket.id] = { ...peer, recordProcess: null };
    }
  } catch (err) {
    console.log("No recording proces to stop");
  }
};
const setIsAudioStreamEnabled = (data, socket, io) => {
  try {
    const { roomId, peerDetails } = peers[socket.id];

    io.in(roomId).emit(SOCKET_EVENTS.IS_AUDIO_STREAM_ENABLED_FROM_SERVER, {
      ...data,
      peerId: peerDetails?.id,
    });
  } catch (err) {
    console.log("Error in set is audio stream enabled", err);
  }
};

const kickOutFromClassHandler = async (data, socket, io) => {
  const { classPk } = peers[socket.id];
  const { peerSocketId, peerId } = data;
  if (peerSocketId && peerId) {
    // TODO write in db that this user is kicked out from class
    await LiveClassBlockedPeer.create({
      blockedPersonId: peerId,
      classRoomId: classPk,
      isBlocked: true,
    });
    io.to(peerSocketId).emit(SOCKET_EVENTS.KICK_OUT_FROM_CLASS_FROM_SERVER);
  }
};
module.exports = {
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
  producerPauseHandler,
  producerResumeHandler,
  studentTestAnswerResponseHandler,
  miroBoardDataHandler,
  endMeetHandler,
  stopRecordingHandler,
  setIsAudioStreamEnabled,
  kickOutFromClassHandler,
};
