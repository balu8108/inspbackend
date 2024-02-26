const { allRooms, allPeers, RoomManager } = require("./RoomManager");

const uuidv4 = require("uuid").v4;

const {
  SOCKET_EVENTS,
  mediaCodecs,
  liveClassLogInfo,
  classStatus,
  liveClassTestQuestionLogInfo,
} = require("../constants");
const redis = require("redis");
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
const { PLATFORM, ENVIRON, REDIS_HOST } = require("../envvar");

const FFmpeg = require("./ffmpeg");
const Gstreamer = require("./gstreamer");

const RECORD_PROCESS_NAME = "GStreamer";

// const redisClient = require("./subscriberController");
// Create a Redis client
const redisClient = redis.createClient({ url: REDIS_HOST });

(async () => {
  await redisClient.connect();
})();

const joinRoomPreviewSocketHandler = async (data, callback, socket, io) => {
  try {
    const { roomId } = data;
    if (roomId) {
      // check from existing rooms if it exist if not exist then go to below step
      // TODO check from database if roomId exist if it exist then send them empty array and also success as true
      // once any one peer joins we will create the room
      // when everybody leaves we will destroy the temporary room

      if (allRooms.has(roomId)) {
        socket.join(roomId);
        // FROM REDIS WE NEED TO GET INITIAL ROOM PEERS DATA INSTEAD OF LOCAL ROOM
        const allPeersInThisRoom = await redisClient.hGetAll(
          `room:${roomId}:peers`
        );

        const allPeersInThisRoomInfo = Object.values(allPeersInThisRoom)
          .map(JSON.parse)
          .map((peer) => peer.peerDetails);
        console.log(allPeersInThisRoomInfo);

        // const allPeersInThisRoom = allRooms.has(roomId)
        //   ? allRooms.get(roomId)._getAllPeersInRoom()
        //   : [];
        callback({ success: true, peers: allPeersInThisRoomInfo });
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
          leaderBoardArray: [],
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
            leaderBoardArray: [],
            liveClass: null,
            rtpCapabilities: null,
            errMsg: "You are blocked from this class",
          }; // No corresponding room in db
        }

        // CHECK IN REDIS THAT IF THIS PEER IS CONNECTED WITH ANY SERVER

        // const allPeersInThisRoome = await redisClient.hGetAll(
        //   `room:${roomId}:peers`
        // );

        // const existedRoom = allRooms.get(roomId);
        // const isPeerExists = existedRoom
        //   ? existedRoom._isPeerAlreadyExisted(peerDetails)
        //   : false;

        const existedRoom = await redisClient.hGetAll(`room:${roomId}:peers`);
        const isPeerExists = authData.id in existedRoom || false;
        if (isPeerExists) {
          return {
            success: false,
            roomId: null,
            peer: null,
            routerId: null,
            leaderBoardArray: [],
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

      const leaderBoardData = await LeaderBoard.findAll({
        where: { classRoomId: liveClass?.id },
        order: [
          ["correctAnswers", "DESC"],
          ["combinedResponseTime", "ASC"],
        ],
      });

      let newPeerDetails = {
        socketId: socketId,
        id: authData.id,
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
        });
        // Now add this new peer to room

        const { peer, routerId, leaderBoardArray, rtpCapabilities } =
          await room._joinRoomPeerHandler(newPeerDetails, leaderBoardData);
        return {
          success: true,
          roomId,
          peer,
          routerId,
          leaderBoardArray: leaderBoardArray.slice(0, 10),
          liveClass,
          rtpCapabilities,
        };
      } else {
        // Already existed so join room, add this new peer to room

        const { peer, routerId, leaderBoardArray, rtpCapabilities } =
          await room._joinRoomPeerHandler(newPeerDetails, leaderBoardData);
        return {
          success: true,
          roomId,
          peer,
          routerId,
          leaderBoardArray: leaderBoardArray.slice(0, 10),
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
        leaderBoardArray: [],
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
    if (!authData) {
      callback({ success: false, errMsg: "Something went wrong" });
      return;
    }
    const {
      success,
      roomId,
      peer,
      routerId,
      leaderBoardArray,
      liveClass,
      rtpCapabilities,
      errMsg,
    } = await createOrJoinRoomFunction(
      mediaSoupworkers,
      data,
      authData,
      socket.id
    );
    if (success === false) {
      callback({ success: false, errMsg }); // No room id/something not supplied
    } else {
      allPeers.set(peer.id, {
        socket,
        roomId,
        routerId,
        classPk: liveClass?.id,
        transports: [],
        producers: [],
        consumers: [],
        peerDetails: peer,
      });

      callback({
        success: true,
        selfDetails: peer,
        leaderBoardData: leaderBoardArray, // Later on send leaderBoardData
        roomId,
        rtpCapabilities,
      });

      socket.to(roomId).emit(SOCKET_EVENTS.NEW_PEER_JOINED, {
        peer: peer,
      });

      // const allPeersInThisRoom = allRooms.has(roomId)
      //   ? allRooms.get(roomId)._getAllPeersInRoomStartWithPeer(peer)
      //   : [];
      // FROM REDIS WE NEED TO GET INITIAL ROOM PEERS DATA INSTEAD OF LOCAL ROOM
      const allPeersInThisRoom = await redisClient.hGetAll(
        `room:${roomId}:peers`
      );

      const allPeersInThisRoomInfo = Object.values(allPeersInThisRoom)
        .map(JSON.parse)
        .map((peer) => peer.peerDetails);
      socket.emit(SOCKET_EVENTS.ROOM_UPDATE, { peers: allPeersInThisRoomInfo });
    }
  } catch (err) {
    console.log("Error in join room hander", err);
  }
};

const addTransportIdInAllPeers = (authId, socketId, transport) => {
  try {
    if (allPeers.has(authId)) {
      const peer = allPeers.get(authId);
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
    const { authData } = socket;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      // Peer found
      const roomId = allPeers.get(authData.id)?.roomId;
      const routerId = allPeers.get(authData.id)?.routerId;
      if (roomId && routerId) {
        const room = allRooms.get(roomId);
        const transport = await room._createWebRtcTransportCreator(
          authData.id,
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
          addTransportIdInAllPeers(authData.id, socketId, transport); // May be not required later on
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
    const { authData } = socket;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const producerList = await room._getProducerList(authData.id, socketId);
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
    const { authData } = socket;
    const { dtlsParameters } = data;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const peerTransportIds = allPeers.get(authData.id)?.transports;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        room._connectWebRtcSendTransport(
          authData.id,
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

const addProducerIdInAllPeers = (authId, socketId, producer) => {
  try {
    if (allPeers.has(authId)) {
      const peer = allPeers.get(authId);
      peer.producers.push(producer.id);
    }
  } catch (err) {
    console.log("Error in adding producer", err);
  }
};

const addConsumerIdInAllPeers = (authId, socketId, consumer) => {
  try {
    if (allPeers.has(authId)) {
      const peer = allPeers.get(authId);
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
    const { authData } = socket;
    const { kind, rtpParameters, appData } = data;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const routerId = allPeers.get(authData.id)?.routerId;
      const peerTransportIds = allPeers.get(authData.id)?.transports;
      const room = allRooms.get(roomId);
      if (roomId && room && routerId) {
        const producer = await room._transportProduce(
          authData.id,
          socketId,
          routerId,
          peerTransportIds,
          kind,
          rtpParameters,
          appData
        );
        // Adding Producer id in allPeers list
        addProducerIdInAllPeers(authData.id, socketId, producer);
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
    const { authData } = socket;
    const socketId = socket.id;
    const { appData, producerId } = data;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
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
    const { authData } = socket;
    const socketId = socket.id;
    const { appData, producerId } = data;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
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
    const { authData } = socket;
    const { dtlsParameters, serverConsumerTransportId } = data;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const peerTransportIds = allPeers.get(authData.id)?.transports;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        await room._connectWebRtcRecvTransport(
          authData.id,
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
    const { authData } = socket;
    const socketId = socket.id;
    const {
      rtpCapabilities,
      remoteProducerId,
      serverConsumerTransportId,
      appData,
    } = data;

    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const routerId = allPeers.get(authData.id)?.routerId;
      const peerTransportIds = allPeers.get(authData.id)?.transports;
      const room = allRooms.get(roomId);
      if (roomId && routerId && room) {
        const consumer = await room._transportConsumer(
          authData.id,
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
          addConsumerIdInAllPeers(authData.id, socketId, consumer);

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
    const { authData } = socket;
    const socketId = socket.id;
    const { serverConsumerId } = data;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
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
    const { authData } = socket;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const { peerCountInRoom, leavingPeer } =
          room._disconnectingOrLeavingPeer(authData.id, socketId);
        // Remove this leaving peer from allPeers global list
        //TODO: stop recording processs
        // allPeers.delete(socketId);
        allPeers.delete(authData.id);
        socket.leave(roomId);
        if (peerCountInRoom === 0) {
          // Delete room as well
          allRooms.delete(roomId);
        }

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
    const { authData } = socket;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const { peerCountInRoom, leavingPeer } =
          room._disconnectingOrLeavingPeer(authData.id, socketId);
        // Remove this leaving peer from allPeers global list
        //TODO: stop recording processs
        // allPeers.delete(socketId);
        allPeers.delete(authData.id);

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
    const { authData } = socket;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;

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

const startRecordingSocketHandler = async (data, socket) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    const { producerScreenShare, producerAudioShare } = data;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const classPk = allPeers.get(authData.id)?.classPk;
      const routerId = allPeers.get(authData.id)?.routerId;
      const room = allRooms.get(roomId);
      if (roomId && routerId && room) {
        const recordData = await room._startRecording(
          authData.id,
          socketId,
          routerId,
          producerScreenShare,
          producerAudioShare
        );
        if (recordData) {
          await LiveClassRoomRecording.create({
            key: recordData?.fileKeyName,
            url: recordData?.url,
            classRoomId: classPk,
          });
        }
      }
    }
  } catch (err) {
    console.log("Error in start recording handler", err);
  }
};

const chatMsgSocketHandler = (data, socket) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const peerDetails = allPeers.get(authData.id)?.peerDetails;
      const peerDetailsWithUUID = { ...peerDetails, id: uuidv4() };

      const { msg } = data;
      // No need for room we can directly pass it from here
      socket.to(roomId).emit(SOCKET_EVENTS.CHAT_MSG_FROM_SERVER, {
        msg: msg,
        peerDetails: peerDetailsWithUUID,
      }); // broadcast message to all
    }
  } catch (err) {
    console.log("Error in chat message", err);
  }
};

const questionMsgSentByStudentSocketHandler = (data, callback, socket, io) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    const { questionMsg } = data;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const peerDetails = allPeers.get(authData.id)?.peerDetails;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const mentors = room._getRoomMentors();
        callback({ success: true, data: { questionMsg, peerDetails } });

        if (mentors.length > 0) {
          mentors.forEach((mentor) => {
            socket
              .to(mentor?.peerDetails?.socketId)
              .emit(SOCKET_EVENTS.QUESTION_MSG_SENT_FROM_SERVER, {
                questionMsg,
                peerDetails,
              });
          });
        } else {
          // MISSED MEANS NO MENTOR IN THIS SERVER PUBLISH TO REDIS
          console.log("publishing no mentor found in this server");
          redisClient.publish(
            "PEER_ACTIVITY",
            JSON.stringify({
              action: "questionMsgToMentor",
              data: { questionMsg, roomId, peerDetails },
            }),
            (err, reply) => {
              if (err) {
                // Handle the error
                console.error("Error publishing message:", err);
              } else {
                // Message published successfully
                console.log("Message published successfully");
              }
            }
          );
        }
      }
    }
  } catch (err) {
    console.log("Error in sending questionto mentor", err);
  }
};

const kickOutFromClassSocketHandler = async (data, socket, io) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    const { peerSocketId, peerId } = data;

    if (authData && allPeers.has(authData.id)) {
      const classPk = allPeers.get(authData.id)?.classPk;
      if (classPk && peerSocketId && peerId) {
        // TODO write in db that this user is kicked out from class
        await LiveClassBlockedPeer.create({
          blockedPersonId: peerId,
          classRoomId: classPk,
          isBlocked: true,
        });
        io.to(peerSocketId).emit(SOCKET_EVENTS.KICK_OUT_FROM_CLASS_FROM_SERVER);
      }
    } else {
      // MISSED IN THIS SERVER, PUBLISH IN REDIS
      redisClient.publish(
        "PEER_ACTIVITY",
        JSON.stringify({
          action: "kickOutFromClass",
          data: { data, authData },
        }),
        (err, reply) => {
          if (err) {
            // Handle the error
            console.error("Error publishing message:", err);
          } else {
            // Message published successfully
            console.log("Message published successfully");
          }
        }
      );
    }
  } catch (err) {
    console.log("Error in kick out", err);
  }
};

const questionsSocketHandler = async (data, callback, socket) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    const qId = uuidv4();
    console.log("question triggerd");
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const classPk = allPeers.get(authData.id)?.classPk;
      const room = allRooms.get(roomId);
      if (roomId && classPk && room) {
        const questionData = room._addTestQuestion(
          authData.id,
          socketId,
          qId,
          data
        );
        // REDIS UPDATE TO ALLOW OTHER PEERS IN OTHER INSTANCE
        redisClient.publish(
          "PEER_ACTIVITY",
          JSON.stringify({
            action: "updatePollQuestion",
            data: { authData, roomId, socketId, qId, data },
          }),
          (err, reply) => {
            if (err) {
              // Handle the error
              console.error("Error publishing message:", err);
            } else {
              // Message published successfully
              console.log("Message published successfully");
            }
          }
        );

        // Seed question log to db
        await LiveClassTestQuestionLog.create({
          logInfo: liveClassTestQuestionLogInfo.NEW_QUESTION_ADDED,
          questionNo: questionData.questionNo,
          questionId: questionData.questionId,
          questionType: questionData.type,
          classRoomId: classPk,
        });
        callback(questionData);

        // there can be polls mcq and qna
        socket.to(roomId).emit(SOCKET_EVENTS.QUESTION_SENT_FROM_SERVER, {
          data: questionData,
        });
      }
    }
  } catch (err) {
    console.log("Error in questions handler", err);
  }
};

const stopProducingSocketHandler = (data, socket) => {
  try {
    const { authData } = socket;
    const { producerId, producerAppData } = data;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const isStopped = room._stopProducing(
          authData.id,
          socketId,
          producerId
        );
        if (isStopped) {
          socket.to(roomId).emit(SOCKET_EVENTS.SOME_PRODUCER_CLOSED, {
            producerId,
            producerAppData,
          });
        }
      }
    }
  } catch (err) {
    console.log("Error in stop producing", err);
  }
};

const uploadFileSocketHandler = async (data, callback, socket) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;

      if (roomId) {
        const getRoom = await LiveClassRoom.findOne({
          where: { roomId: data?.roomId },
        });
        if (!getRoom) {
          throw new Error("Something went wrong");
        }
        const fileUploads = await uploadFilesToS3(
          data?.files,
          `files/roomId_${data?.roomId}`
        );
        let filesResArray = [];
        if (fileUploads) {
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

        socket.to(data?.roomId).emit(SOCKET_EVENTS.UPLOAD_FILE_FROM_SERVER, {
          success: true,
          data: {
            roomType: data?.roomType,
            roomId: data?.roomId,
            files: filesResArray,
          },
        });
      }
    }
  } catch (err) {}
};

const setIsAudioStreamSocketEnabled = (data, socket, io) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const peerDetails = allPeers.get(authData.id)?.peerDetails;

      if (roomId && peerDetails) {
        io.in(roomId).emit(SOCKET_EVENTS.IS_AUDIO_STREAM_ENABLED_FROM_SERVER, {
          ...data,
          peerId: peerDetails?.id,
        });
      }
    }
  } catch (err) {
    console.log("Error in audio stream enabled", err);
  }
};

const blockOrUnblockMicSocketHandler = (data, socket, io) => {
  try {
    const { value, peerSocketId, peerId } = data;
    const socketId = socket.id;

    if (peerId && allPeers.has(peerId)) {
      const roomId = allPeers.get(peerId)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const peer = room._updateMicBlockOrUnblock(peerId, peerSocketId, value);
        if (peer) {
          // Update allPeers
          const aPeer = allPeers.get(peerId);
          aPeer.peerDetails = peer.peerDetails;
          // inform the targetted peer about block or unblock of his mic
          io.to(peerSocketId).emit(
            SOCKET_EVENTS.BLOCK_OR_UNBLOCK_MIC_FROM_SERVER,
            peer.peerDetails
          );
          // inform all the peers along with blocked peer, that this peer has mic blocked by mentor
          io.to(roomId).emit(
            SOCKET_EVENTS.PEER_MIC_BLOCKED_OR_UNBLOCKED_FROM_SERVER,
            peer.peerDetails
          );
        }
      }
    } else {
      // MISSED SO WE NEED TO  PUBLISH
      console.log(
        "Block/Unblock mic Missed in this server publish to redish.."
      );
      redisClient.publish(
        "PEER_ACTIVITY",
        JSON.stringify({ action: "blockOrUnblockMic", data }),
        (err, reply) => {
          if (err) {
            // Handle the error
            console.error("Error publishing message:", err);
          } else {
            // Message published successfully
            console.log("Message published successfully");
          }
        }
      );
    }
  } catch (err) {
    console.log("Error in block or unblock", err);
  }
};

const muteMicCommandByMentorSocketHandler = (data, socket, io) => {
  try {
    const { value, peerSocketId, peerId } = data;

    if (peerId && allPeers.has(peerId)) {
      const roomId = allPeers.get(peerId)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const peer = room._muteMicCommandByMentor(peerId, peerSocketId, value);
        if (peer) {
          const aPeer = allPeers.get(peerId);
          aPeer.peerDetails = peer.peerDetails;
          io.to(peerSocketId).emit(
            SOCKET_EVENTS.MUTE_MIC_COMMAND_BY_MENTOR_FROM_SERVER,
            peer.peerDetails
          );
        }
      }
    } else {
      // MISSED PUBLISH TO REDIS
      console.log("publishing mute unmute mic");
      redisClient.publish(
        "PEER_ACTIVITY",
        JSON.stringify({ action: "muteUnmuteMic", data }),
        (err, reply) => {
          if (err) {
            // Handle the error
            console.error("Error publishing message:", err);
          } else {
            // Message published successfully
            console.log("Message published successfully");
          }
        }
      );
      console.log("published mute unmute mic");
    }
  } catch (err) {
    console.log("Error in mute mic command by mentor", err);
  }
};

const studentTestAnswerResponseSocketHandler = (data, socket, io) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const classPk = allPeers.get(authData.id)?.classPk;
      const room = allRooms.get(roomId);
      if (roomId && room && classPk) {
        const updatedLeaderBoard = room._updateLeaderBoard(
          authData.id,
          socketId,
          classPk,
          data
        );
        if (updatedLeaderBoard) {
          io.in(roomId).emit(SOCKET_EVENTS.LEADERBOARD_FROM_SERVER, {
            leaderBoard: updatedLeaderBoard.slice(0, 10),
          });
        }
      }
    }
  } catch (err) {
    console.log("Error in student test answer repsonse", err);
  }
};

const pollTimeIncreaseSocketHandler = (data, socket) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    const { questionId, timeIncreaseBy } = data;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        room._increasePollTime(questionId, timeIncreaseBy);
        socket
          .to(roomId)
          .emit(SOCKET_EVENTS.POLL_TIME_INCREASE_FROM_SERVER, data);
      }
    }
  } catch (err) {}
};

const stopRecordingSocketHandler = (socket) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        room._stopRecording(authData.id, socketId);
      }
    }
  } catch (err) {
    console.log("Error in stop recording handler", err);
  }
};

const replaceTrackSocketHandler = (data, io, socket) => {
  try {
    const { authData } = socket;
    const socketId = socket.id;
    if (authData && allPeers.has(authData.id)) {
      const roomId = allPeers.get(authData.id)?.roomId;
      const room = allRooms.get(roomId);
      if (roomId && room) {
        const getSocketIDs = room._getSocketIDsOfConsumers();
        for (sid of getSocketIDs) {
          io.to(sId).emit(SOCKET_EVENTS.REPLACED_TRACK, data);
        }
      }
    }
  } catch (err) {
    console.log("Error in RManager in replacing track handler", err);
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
  chatMsgSocketHandler,
  questionMsgSentByStudentSocketHandler,
  kickOutFromClassSocketHandler,
  questionsSocketHandler,
  stopProducingSocketHandler,
  uploadFileSocketHandler,
  setIsAudioStreamSocketEnabled,
  blockOrUnblockMicSocketHandler,
  muteMicCommandByMentorSocketHandler,
  studentTestAnswerResponseSocketHandler,
  pollTimeIncreaseSocketHandler,
  stopRecordingSocketHandler,
  replaceTrackSocketHandler,
};
