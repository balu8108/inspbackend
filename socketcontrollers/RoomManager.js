const EventEmitter = require("events");
const allRooms = new Map();
const allPeers = new Map();

const {
  SOCKET_EVENTS,
  mediaCodecs,
  liveClassLogInfo,
  classStatus,
  liveClassTestQuestionLogInfo,
} = require("../constants");

const ROUTER_SCALE_SIZE = 40;
class RoomManager extends EventEmitter {
  constructor({ roomId, mediaSoupRouters, mediaSoupWorkers }) {
    super();
    this._roomId = roomId;
    this._peers = {}; // initializing with empty peers object
    this._transports = {}; // Transports for this room
    this._producers = {}; // Producers for this room
    this._consumers = {}; // Consumers for this room
    this._mediaSoupWorkers = mediaSoupWorkers;
    this._mediaSoupRouters = mediaSoupRouters;
  }

  static async getLeastLoadedRouter(
    allmediaSoupWorkersOnServer,
    mediaSoupRoutersOfRoom
  ) {
    const routerLoads = new Map();
    const workerLoads = new Map();
    const pipedRoutersIds = new Set();
    for (const peer of allPeers.values()) {
      const routerId = peer.routerId;

      if (routerId) {
        // checking which routers of this room are piped
        if (mediaSoupRoutersOfRoom.has(routerId)) {
          pipedRoutersIds.add(routerId);
        }

        // calculating the routers loads of all routers in use by peers
        if (routerLoads.has(routerId)) {
          routerLoads.set(routerId, routerLoads.get(routerId) + 1);
        } else {
          routerLoads.set(routerId, 1);
        }
      }
    }

    // calculating the worker loads of all workers based on router loads
    for (const worker of allmediaSoupWorkersOnServer.values()) {
      for (const routerId of worker.appData.routers.keys()) {
        if (workerLoads.has(worker.pid)) {
          workerLoads.set(
            worker.pid,
            workerLoads.get(worker.pid) +
              (routerLoads.has(routerId) ? routerLoads.get(routerId) : 0)
          );
        } else {
          workerLoads.set(
            worker.pid,
            routerLoads.has(routerId) ? routerLoads.get(routerId) : 0
          );
        }
      }
    }

    const sortedWorkerLoads = new Map(
      [...workerLoads.entries()].sort((a, b) => a[1] - b[1])
    );

    // we don't care if router is piped, just choose the least loaded worker
    if (
      pipedRoutersIds.size === 0 ||
      pipedRoutersIds.size === mediaSoupRoutersOfRoom.size
    ) {
      const workerId = sortedWorkerLoads.keys().next().value;
      const worker = allmediaSoupWorkersOnServer.get(workerId);

      for (const routerId of worker.appData.routers.keys()) {
        if (mediaSoupRoutersOfRoom.has(routerId)) {
          return routerId;
        }
      }
    } else {
      // find if there is a piped router that is on a worker that is below limit
      for (const [workerId, workerLoad] of sortedWorkerLoads.entries()) {
        const worker = allmediaSoupWorkersOnServer.get(workerId);

        for (const routerId of worker.appData.routers.keys()) {
          // we check if there is a piped router
          // on a worker with its load below the limit,
          if (
            mediaSoupRoutersOfRoom.has(routerId) &&
            pipedRoutersIds.has(routerId) &&
            workerLoad < ROUTER_SCALE_SIZE
          ) {
            return routerId;
          }
        }
      }

      // no piped router found, we need to return the router
      // from least loaded worker
      const workerId = sortedWorkerLoads.keys().next().value;
      const worker = allmediaSoupWorkersOnServer.get(workerId);

      for (const routerId of worker.appData.routers.keys()) {
        if (mediaSoupRoutersOfRoom.has(routerId)) {
          return routerId;
        }
      }
    }

    console.log("router Loads", routerLoads);
    console.log("piped router ids", pipedRoutersIds);
  }
  static async create({ mediaSoupWorkers, roomId, newPeerDetails }) {
    const mediaSoupRouters = new Map();
    for (const worker of mediaSoupWorkers.values()) {
      const router = await worker.createRouter({ mediaCodecs });

      mediaSoupRouters.set(router.id, router);
    }
    console.log("mediasoup routers", mediaSoupRouters);
    return new RoomManager({ roomId, mediaSoupRouters, mediaSoupWorkers });
  }

  _isPeerAlreadyExisted(peerDetails) {
    return peerDetails.socketId in this._peers;
  }

  _getAllPeersInRoom() {
    return Object.values(this._peers);
  }

  async _getRouterCapabilities(routerId) {
    return this._mediaSoupRouters.get(routerId)?.rtpCapabilities;
  }

  async _getRouterId() {
    const routerId = RoomManager.getLeastLoadedRouter(
      this._mediaSoupWorkers,
      this._mediaSoupRouters
    );

    // later on will do pipeToRouter

    return routerId;
  }
  async _joinRoomPeerHandler(newPeerDetails) {
    const routerId = await this._getRouterId(); // get best router to assign this newPeer
    newPeerDetails.routerId = routerId;
    this._peers[newPeerDetails?.socketId] = newPeerDetails;
    const peer = this._peers[newPeerDetails?.socketId];
    const rtpCapabilities = this._getRouterCapabilities(routerId);
    return { peer, rtpCapabilities };
  }
  close() {
    console.log("Emitting close");
    this.emit("close");
  }
}

module.exports = { allRooms, allPeers, RoomManager };
