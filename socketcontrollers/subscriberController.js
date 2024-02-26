const redis = require("redis");
const { REDIS_HOST } = require("../envvar");
const {
  LiveClassRoomFile,
  LiveClassRoom,
  LiveClassLog,
  LiveClassTestQuestionLog,
  LiveClassBlockedPeer,
  LiveClassRoomRecording,
  LeaderBoard,
} = require("../models");
const { SOCKET_EVENTS } = require("../constants");
const redisSubscriber = redis.createClient({ url: REDIS_HOST });
const { allRooms, allPeers } = require("./RoomManager");
async function runSubscribers(io) {
  await redisSubscriber.connect();

  await redisSubscriber.subscribe("PEER_ACTIVITY", async (message) => {
    const { action, data } = JSON.parse(message);

    if (action === "blockOrUnblockMic") {
      try {
        const { value, peerSocketId, peerId } = data;
        if (peerId && allPeers.has(peerId)) {
          const roomId = allPeers.get(peerId)?.roomId;
          const room = allRooms.get(roomId);
          if (roomId && room) {
            const peer = room._updateMicBlockOrUnblock(
              peerId,
              peerSocketId,
              value
            );
            if (peer) {
              console.log("udpating peer");
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
        }
      } catch (err) {
        console.log("Error in RedisSubscirber  ", err);
      }
    } else if (action === "kickOutFromClass") {
      try {
        const { data: eventData, authData } = data; // authdata and eventData coming from redis only
        const { peerSocketId, peerId } = eventData;
        if (authData && allPeers.has(authData.id)) {
          const classPk = allPeers.get(authData.id)?.classPk;
          if (classPk && peerSocketId && peerId) {
            // TODO write in db that this user is kicked out from class
            await LiveClassBlockedPeer.create({
              blockedPersonId: peerId,
              classRoomId: classPk,
              isBlocked: true,
            });
            io.to(peerSocketId).emit(
              SOCKET_EVENTS.KICK_OUT_FROM_CLASS_FROM_SERVER
            );
          }
        }
      } catch (err) {
        console.log("Error in kick out from class ", err);
      }
    } else if (action === "muteUnmuteMic") {
      try {
        const { value, peerSocketId, peerId } = data;
        if (peerId && allPeers.has(peerId)) {
          const roomId = allPeers.get(peerId)?.roomId;
          const room = allRooms.get(roomId);
          if (roomId && room) {
            const peer = room._muteMicCommandByMentor(
              peerId,
              peerSocketId,
              value
            );
            if (peer) {
              const aPeer = allPeers.get(peerId);
              aPeer.peerDetails = peer.peerDetails;
              io.to(peerSocketId).emit(
                SOCKET_EVENTS.MUTE_MIC_COMMAND_BY_MENTOR_FROM_SERVER,
                peer.peerDetails
              );
            }
          }
        }
      } catch (err) {
        console.log("Error in kick out from class ", err);
      }
    } else if (action === "questionMsgToMentor") {
      try {
        const { questionMsg, roomId, peerDetails } = data;
        if (roomId) {
          const room = allRooms.get(roomId);
          if (room) {
            const mentors = room._getRoomMentors();
            if (mentors.length > 0) {
              mentors.forEach((mentor) => {
                io.to(mentor?.peerDetails?.socketId).emit(
                  SOCKET_EVENTS.QUESTION_MSG_SENT_FROM_SERVER,
                  {
                    questionMsg,
                    peerDetails,
                  }
                );
              });
            }
          }
        }
      } catch (err) {
        console.log("Error in question msg to mentor", err);
      }
    }
  });
}

module.exports = runSubscribers;
