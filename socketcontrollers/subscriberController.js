const redis = require("redis");
const { REDIS_HOST } = require("../envvar");

const { SOCKET_EVENTS } = require("../constants");
const redisSubscriber = redis.createClient({ url: REDIS_HOST });
const { allRooms, allPeers } = require("./RoomManager");
async function runSubscribers(io) {
  await redisSubscriber.connect();
  await redisSubscriber.subscribe("PEER_ACTIVITY", (message) => {
    try {
      const data = JSON.parse(message);
      const { value, peerSocketId, peerId } = data?.data;
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
      console.log("Error in err ", err);
    }
  });
}

module.exports = runSubscribers;
