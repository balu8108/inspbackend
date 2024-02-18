const { allRooms, allPeers, RoomManager } = require("./RoomManager");

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
  LiveClassRoomRecording,
  LeaderBoard,
} = require("../models");
const {
  uploadFilesToS3,
  updateLeaderboard,
  isFeedbackProvided,
  generateAWSS3LocationUrl,
  isObjectValid,
} = require("../utils");
const { PLATFORM, ENVIRON } = require("../envvar");

const FFmpeg = require("./ffmpeg");
const Gstreamer = require("./gstreamer");

const RECORD_PROCESS_NAME = "GStreamer";
const joinRoomPreviewSocketHandler = (data, callback, socket, io) => {
  try {
    const { roomId } = data;
    if (roomId) {
      // check from existing rooms if it exist if not exist then go to below step
      // TODO check from database if roomId exist if it exist then send them empty array and also success as true
      // once any one peer joins we will create the room
      // when everybody leaves we will destroy the temporary room

      if (allRooms.has(roomId)) {
        socket.join(roomId);

        const allPeersInThisRoom = allRooms.has(roomId)
          ? allRooms.get(roomId)._getAllPeersInRoom()
          : [];
        callback({ success: true, peers: allPeersInThisRoom });
      } else {
        // most likely no body joins

        socket.join(roomId);
        callback({ success: true, peers: [] });
      }
    } else {
      callback({ success: false }); // No room id supplied
    }
  } catch (err) {
    console.log("Error in join room Preview Handler", err);
  }
};

const createOrJoinRoomFunction = async (
  mediaSoupWorkers,
  data,
  authData,
  socketId
) => {
  try {
    if ("roomId" in data) {
      const roomId = data.roomId;
      const peerDetails = authData;

      const liveClass = await LiveClassRoom.findOne({
        where: { roomId: roomId },
      });

      if (!liveClass) {
        return {
          success: false,
          roomId: null,
          peer: null,
          routerId: null,
          liveClass: null,
          rtpCapabilities: null,
          errMsg: "No Class with this room id",
        }; // No corresponding room in db
      }

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
            success: false,
            roomId: null,
            peer: null,
            routerId: null,
            liveClass: null,
            rtpCapabilities: null,
            errMsg: "You are blocked from this class",
          }; // No corresponding room in db
        }
        const existedRoom = allRooms.get(roomId);
        const isPeerExists = existedRoom
          ? existedRoom._isPeerAlreadyExisted(peerDetails)
          : false;

        if (isPeerExists) {
          return {
            success: false,
            roomId: null,
            peer: null,
            routerId: null,
            liveClass: null,
            rtpCapabilities: null,
            errMsg: "You have already joined the class!!",
          };
        }
        if (peerDetails.user_type === 1) {
          liveClass.classStatus = classStatus.ONGOING;
          await liveClass.save();
          await LiveClassLog.create({
            classRoomId: liveClass.id,
            logInfo: liveClassLogInfo.TEACHER_JOINED,
          });
        }
      }

      // TODO - ADD Leaderboard later
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
        email: authData?.email,
        isTeacher: authData?.user_type === 1,
        isAudioBlocked:
          authData?.user_type === 1 ? false : liveClass?.muteAllStudents, // At the moment we used blocked and enabled differently need optimzation later on
        isVideoBlocked: authData?.user_type === 1 ? false : true,
        isScreenShareBlocked: authData?.user_type === 1 ? false : true,
        isAudioEnabled: false,
        isVideoEnabled: false,
        isScreenSharingEnabled: false,
      };

      let room = allRooms.get(roomId);

      if (!room) {
        // No room exist so create a new one
        room = await RoomManager.create({
          mediaSoupWorkers,
          roomId,
          newPeerDetails,
        });
        allRooms.set(roomId, room);
        room.on("close", () => {
          allRooms.delete(roomId);
          console.log("room deleted", allRooms);
        });
        // Now add this new peer to room
        const { peer, routerId, rtpCapabilities } =
          await room._joinRoomPeerHandler(newPeerDetails);
        return {
          success: true,
          roomId,
          peer,
          routerId,
          liveClass,
          rtpCapabilities,
        };
      } else {
        // Already existed so join room, add this new peer to room

        const { peer, routerId, rtpCapabilities } =
          await room._joinRoomPeerHandler(newPeerDetails);
        return {
          success: true,
          roomId,
          peer,
          routerId,
          liveClass,
          rtpCapabilities,
        };
      }
    } else {
      return {
        success: false,
        roomId: null,
        peer: null,
        routerId: null,
        liveClass: null,
        rtpCapabilities: null,
        errMsg: "No Room id supplied",
      };
    }
  } catch (err) {
    console.log("Error occurs in create or join room function ", err);
  }
};
const joinRoomSocketHandler = async (
  data,
  callback,
  socket,
  io,
  mediaSoupworkers
) => {
  try {
    const { authData } = socket;
    const {
      success,
      roomId,
      peer,
      routerId,
      liveClass,
      rtpCapabilities,
      errMsg,
    } = await createOrJoinRoomFunction(
      mediaSoupworkers,
      data,
      authData,
      socket.id
    );
    console.log("rtp capabilites", rtpCapabilities);
    if (success === false) {
      callback({ success: false, errMsg }); // No room id/something not supplied
    } else {
      allPeers.set(socket.id, {
        socket,
        roomId,
        routerId,
        classPk: liveClass?.id,
        transports: [],
        producers: [],
        consumers: [],
        peerDetails: peer,
      });
      console.log("peering calling back", peer);
      callback({
        success: true,
        selfDetails: peer,
        leaderBoardData: [], // Later on send leaderBoardData
        roomId,
        rtpCapabilities,
      });

      socket.to(roomId).emit(SOCKET_EVENTS.NEW_PEER_JOINED, {
        peer: peer,
      });

      const allPeersInThisRoom = allRooms.has(roomId)
        ? allRooms.get(roomId)._getAllPeersInRoom()
        : [];
      socket.emit(SOCKET_EVENTS.ROOM_UPDATE, { peers: allPeersInThisRoom });
    }
  } catch (err) {
    console.log("Error in join room hander", err);
  }
};

const addTransportIdInAllPeers = (socketId, transport) => {
  try {
    if (allPeers.has(socketId)) {
      const peer = allPeers.get(socketId);
      peer.transports.push(transport.id);
    }
  } catch (err) {
    console.log("Error in adding transport", transport);
  }
};

const createWebRtcTransportSocketHandler = async (
  data,
  callback,
  socket,
  io,
  mediaSoupworkers
) => {
  try {
    const { consumer } = data;
    const socketId = socket.id;
    if (allPeers.has(socketId)) {
      // Peer found
      const roomId = allPeers.get(socketId)?.roomId;
      const routerId = allPeers.get(socketId)?.routerId;
      if (roomId && routerId) {
        const room = allRooms.get(roomId);
        const transport = await room._createWebRtcTransportCreator(
          routerId,
          socketId,
          consumer
        );
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
          addTransportIdInAllPeers(socketId, transport); // May be not required later on
        }
      }
    }
  } catch (err) {
    console.log("Error in creating webRtc Transport", err);
  }
};

const getProducersSocketHandler = async (
  callback,
  socket,
  mediaSoupworkers
) => {
  try {
    const socketId = socket.id;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const producerList = await room._getProducerList(socketId);
        console.log("producer list returned ", producerList);
        callback(producerList);
      }
    }
  } catch (err) {
    console.log("Error in getProducersHandler", err);
  }
};

const connectWebRTCTransportSendSocketHandler = (
  data,
  socket,
  mediaSoupworkers
) => {
  try {
    console.log("connnecting send socket");
    const { dtlsParameters } = data;
    const socketId = socket.id;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const peerTransportIds = allPeers.get(socketId)?.transports;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        room._connectWebRtcSendTransport(
          socketId,
          dtlsParameters,
          peerTransportIds
        );
      }
    }
  } catch (err) {
    console.log("Error in connecting webRtc transport", err);
  }
};

const addProducerIdInAllPeers = (socketId, producer) => {
  try {
    if (allPeers.has(socketId)) {
      const peer = allPeers.get(socketId);
      peer.producers.push(producer.id);
    }
  } catch (err) {
    console.log("Error in adding producer", err);
  }
};

const addConsumerIdInAllPeers = (socketId, consumer) => {
  try {
    if (allPeers.has(socketId)) {
      const peer = allPeers.get(socketId);
      peer.consumers.push(consumer.id);
    }
  } catch (err) {
    console.log("Error in adding consumer", err);
  }
};

const transportProduceSocketHandler = async (
  data,
  callback,
  socket,
  mediaSoupworkers
) => {
  try {
    const { kind, rtpParameters, appData } = data;
    const socketId = socket.id;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const routerId = allPeers.get(socketId)?.routerId;
      const peerTransportIds = allPeers.get(socketId)?.transports;
      const room = allRooms.get(roomId);
      if (roomId && room && routerId) {
        const producer = await room._transportProduce(
          socketId,
          routerId,
          peerTransportIds,
          kind,
          rtpParameters,
          appData
        );
        // Adding Producer id in allPeers list
        addProducerIdInAllPeers(socketId, producer);
        socket.to(roomId).emit(SOCKET_EVENTS.NEW_PRODUCER, {
          producerId: producer.id,
          appData: appData,
        });

        // we actually do not need to send produceExist as when someone joins we send the producer list after joining always
        callback({
          id: producer.id,
        });
      }
    }
  } catch (err) {
    console.log("Transport producer error", err);
  }
};

const producerPauseSocketHandler = (data, socket) => {
  try {
    const socketId = socket.id;
    const { appData, producerId } = data;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        room._pausingProducer(producerId);
        console.log("paused producer");
      }
    }
  } catch (err) {
    console.log("Producer pause handler error", err);
  }
};

const producerResumeSocketHandler = (data, socket) => {
  try {
    const socketId = socket.id;
    const { appData, producerId } = data;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        room._resumingProducer(producerId);
        console.log("paused producer");
      }
    }
  } catch (err) {
    console.log("Producer resume handler", err);
  }
};

const connectWebRTCTransportRecvSocketHandler = async (
  data,
  socket,
  mediaSoupworkers
) => {
  try {
    console.log("connect recv");
    const { dtlsParameters, serverConsumerTransportId } = data;
    const socketId = socket.id;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const peerTransportIds = allPeers.get(socketId)?.transports;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        await room._connectWebRtcRecvTransport(
          socketId,
          dtlsParameters,
          serverConsumerTransportId,
          peerTransportIds
        );
      }
    }
  } catch (err) {
    console.log("Error in connecting receiver socket", err);
  }
};

const consumeSocketHandler = async (
  data,
  callback,
  socket,
  mediaSoupworkers
) => {
  try {
    const socketId = socket.id;
    const {
      rtpCapabilities,
      remoteProducerId,
      serverConsumerTransportId,
      appData,
    } = data;

    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const routerId = allPeers.get(socketId)?.routerId;
      const peerTransportIds = allPeers.get(socketId)?.transports;
      const room = allRooms.get(roomId);
      if (roomId && routerId && room) {
        const consumer = await room._transportConsumer(
          socketId,
          routerId,
          peerTransportIds,
          rtpCapabilities,
          remoteProducerId,
          serverConsumerTransportId,
          appData
        );
        // Adding Producer id in allPeers list
        if (consumer) {
          addConsumerIdInAllPeers(socketId, consumer);
          console.log("all peers after adding consumer", allPeers);

          consumer.on(SOCKET_EVENTS.PRODUCERPAUSE, () => {
            console.log("Producer paused hence consumer paused");
            socket.emit(SOCKET_EVENTS.PRODUCER_PAUSED, {
              appData,
              remoteProducerId,
            });
          });
          consumer.on(SOCKET_EVENTS.PRODUCERRESUME, () => {
            console.log("Producer resume hence consumer");
            socket.emit(SOCKET_EVENTS.PRODUCER_RESUMED, {
              appData,
              remoteProducerId,
            });
          });

          consumer.on(SOCKET_EVENTS.TRANSPORT_CLOSE, () => {
            console.log("producer transport closed");
          });
          consumer.on(SOCKET_EVENTS.PRODUCERCLOSE, () => {
            console.log("producer closed kindly close consumer");
            socket.emit(SOCKET_EVENTS.PRODUCER_CLOSED, {
              producerId: remoteProducerId,
              producerAppData: appData,
            });
            // It is claimed that consumer.close() is automatically will be closed
          });

          const params = {
            id: consumer.id,
            producerId: remoteProducerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            serverConsumerId: consumer.id,
          };

          callback({ params });
        }
      }
    }
  } catch (err) {}
};

const consumerResumeSocketHandler = async (data, socket, mediaSoupworkers) => {
  try {
    const socketId = socket.id;
    const { serverConsumerId } = data;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        await room._resumingConsumer(serverConsumerId);
      }
    }
  } catch (err) {
    console.log("Error in resuming consumer", err);
  }
};

const disconnectSocketHandler = async (socket, mediaSoupworkers, io) => {
  try {
    const socketId = socket.id;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const { peerCountInRoom, leavingPeer } =
          room._disconnectingOrLeavingPeer(socketId);
        // Remove this leaving peer from allPeers global list
        //TODO: stop recording processs
        allPeers.delete(socketId);
        socket.leave(roomId);
        if (peerCountInRoom === 0) {
          // Delete room as well
          allRooms.delete(roomId);
        }
        console.log("rooms after delete", allRooms);

        io.to(roomId).emit(SOCKET_EVENTS.PEER_LEAVED, {
          peerLeaved: leavingPeer.peerDetails,
        });
      }
    }
  } catch (err) {
    console.log("Error during disconnect", err);
  }
};

const leaveRoomSocketHandler = async (
  callback,
  socket,
  mediaSoupworkers,
  io
) => {
  try {
    const socketId = socket.id;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const { peerCountInRoom, leavingPeer } =
          room._disconnectingOrLeavingPeer(socketId);
        // Remove this leaving peer from allPeers global list
        //TODO: stop recording processs
        allPeers.delete(socketId);

        const { success, isFeedback, feedBackTopicId } =
          await isFeedbackProvided(leavingPeer.peerDetails, roomId);

        callback({
          feedBackStatus: { success, isFeedback, feedBackTopicId },
        });
        socket.leave(roomId);
        if (peerCountInRoom === 0) {
          // Delete room as well
          allRooms.delete(roomId);
        }
        console.log("rooms after leaving", allRooms);

        io.to(roomId).emit(SOCKET_EVENTS.PEER_LEAVED, {
          peerLeaved: leavingPeer.peerDetails,
        });
      }
    }
  } catch (err) {
    console.log("Error in leave room handler", err);
  }
};

const endMeetSocketHandler = async (socket, mediaSoupworkers, io) => {
  try {
    const socketId = socket.id;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      console.log("roomId ", roomId);
      if (roomId) {
        io.in(roomId).emit(SOCKET_EVENTS.END_MEET_FROM_SERVER); // It will instruct the peers to disconnect

        const liveClassRoom = await LiveClassRoom.findOne({
          where: { roomId: roomId },
        });
        if (liveClassRoom) {
          liveClassRoom.classStatus = classStatus.FINISHED;
          liveClassRoom.save();
        }
      }
    }
  } catch (err) {
    console.log("Error in end meet handler", err);
  }
};

const startRecordingSocketHandler = (data, socket) => {
  try {
    console.log("start recording ");
    const socketId = socket.id;
    const { producerScreenShare, producerAudioShare } = data;
    if (allPeers.has(socketId)) {
      const roomId = allPeers.get(socketId)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        room._startRecording(socketId, producerScreenShare, producerAudioShare);
      }
    }
  } catch (err) {
    console.log("Error in start recording handler", err);
  }
};
module.exports = {
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
};
