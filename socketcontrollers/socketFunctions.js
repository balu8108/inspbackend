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
        callback({ success: true, peers: allRooms.get(roomId)?.peers ?? [] });
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
        const { peer, rtpCapabilities } = await room._joinRoomPeerHandler(
          newPeerDetails
        );
        return { success: true, roomId, peer, liveClass, rtpCapabilities };
      } else {
        // Already existed so join room, add this new peer to room

        const { peer, rtpCapabilities } = await room._joinRoomPeerHandler(
          newPeerDetails
        );
        return { success: true, roomId, peer, liveClass, rtpCapabilities };
      }
    } else {
      return {
        success: false,
        roomId: null,
        peer: null,
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
    const { success, roomId, peer, liveClass, rtpCapabilities, errMsg } =
      await createOrJoinRoomFunction(
        mediaSoupworkers,
        data,
        authData,
        socket.id
      );
    if (success === false) {
      callback({ success: false, errMsg }); // No room id/something not supplied
    } else {
      allPeers.set(socket.id, {
        socket,
        roomId,
        classPk: liveClass?.id,
        transports: [],
        producers: [],
        consumers: [],
        peerDetails: peer,
      });
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

const createWebRtcTransportSocketHandler = async (
  data,
  callback,
  socket,
  io,
  mediaSoupworkers
) => {
  try {
  } catch (err) {
    console.log("Error in creating webRtc Transport", err);
  }
};

module.exports = {
  joinRoomPreviewSocketHandler,
  joinRoomSocketHandler,
  createWebRtcTransportSocketHandler,
};
