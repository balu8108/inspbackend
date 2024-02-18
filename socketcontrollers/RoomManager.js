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

const config = require("./config");

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

  static getLeastLoadedRouter(
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
  }
  static async create({ mediaSoupWorkers, roomId, newPeerDetails }) {
    const mediaSoupRouters = new Map();
    for (const worker of mediaSoupWorkers.values()) {
      const router = await worker.createRouter({ mediaCodecs });

      mediaSoupRouters.set(router.id, router);
    }

    return new RoomManager({ roomId, mediaSoupRouters, mediaSoupWorkers });
  }

  _isPeerAlreadyExisted(peerDetails) {
    return peerDetails.socketId in this._peers;
  }

  _getAllPeersInRoom() {
    const peerDetailsArray = Object.values(this._peers).map(
      (peer) => peer.peerDetails
    );
    return peerDetailsArray;
  }

  _getRouterCapabilities(routerId) {
    return this._mediaSoupRouters.get(routerId)?.rtpCapabilities;
  }

  _getProducersInRoom() {
    return Object.values(this._producers);
  }

  _getRoutersToPipeTo(originRouterId) {
    return Object.values(this._peers)
      .map((peer) => peer.routerId)
      .filter(
        (routerId, index, self) =>
          routerId !== originRouterId && self.indexOf(routerId) === index
      );
  }

  async _pipeProducersToRouter(routerId) {
    const router = this._mediaSoupRouters.get(routerId);
    console.log("router in piping", router);
    console.log("router app data ", router?.appData);
    const peersToPipe = Object.values(this._peers).filter(
      (peer) => peer.routerId !== routerId && peer.routerId !== null
    );
    for (const peer of peersToPipe) {
      const srcRouter = this._mediaSoupRouters.get(peer.routerId);

      for (const producerId of Object.keys(this._producers)) {
        if (router.appData.producers.has(producerId)) {
          // same router do not need piping it automatically put streams to these consumers
          console.log("same router");
          continue;
        }
        // Piping all producers in different routers to this router of current peer
        console.log("different router");
        await srcRouter.pipeToRouter({
          producerId: producerId,
          router: router,
        });
      }
    }
  }

  async _getRouterId() {
    const routerId = RoomManager.getLeastLoadedRouter(
      this._mediaSoupWorkers,
      this._mediaSoupRouters
    );

    // later on will do pipeToRouter
    console.log("router id assigned", routerId);
    await this._pipeProducersToRouter(routerId);

    return routerId;
  }
  _checkPeerCountInRoom() {
    return Object.keys(this._peers).length;
  }
  async _joinRoomPeerHandler(newPeerDetails) {
    const routerId = await this._getRouterId(); // get best router to assign this newPeer
    this._peers[newPeerDetails?.socketId] = {
      routerId,
      peerDetails: newPeerDetails,
    };
    const rtpCapabilities = this._getRouterCapabilities(routerId);
    return { peer: newPeerDetails, routerId, rtpCapabilities };
  }

  async _createWebRtcTransportCreator(routerId, socketId, consumer) {
    const roomId = this._roomId;
    if (this._mediaSoupRouters.has(routerId)) {
      const webRtcOptions = config.webRtcTransport;
      const router = this._mediaSoupRouters.get(routerId);
      const transport = await router.createWebRtcTransport(webRtcOptions);
      const transportWithMeta = { socketId, transport, roomId, consumer }; // Extra info required
      console.log("this transports in creating", this._transports);
      transport.on(SOCKET_EVENTS.DTLS_STATE_CHANGE, (dtlsState) => {
        if (dtlsState === "closed") {
          transport.close();
          // TODO(DONE): Require removal of transport from the room
          this._removeItem("transports", socketId);
        }
      });

      transport.on(SOCKET_EVENTS.CLOSE, () => {
        console.log("transport closed");
        // TODO: Require removal of transport from the room
      });
      this._transports[transport?.id] = transportWithMeta;
      console.log("this transport", this._transports);

      return transport; // No need to return extra info just normal transport is fine
    }
  }

  async _getProducerList(socketId) {
    const producerInRoom = this._getProducersInRoom();
    const producerList = [];
    producerInRoom.forEach((producer) => {
      if (producer.roomId === this._roomId && producer.socketId !== socketId) {
        let obj = {
          producerId: producer.producer.id,
          appData: producer.producer.appData,
        };
        producerList.push(obj);
      }
    });
    return producerList;
  }

  _getProducerTransport(socketId, peerTransportIds) {
    // Returns the producer transport and connects it with dtlsParamaters

    if (peerTransportIds.length > 0) {
      for (const id of peerTransportIds) {
        if (id in this._transports) {
          console.log("id", id);
          const transportWithMeta = this._transports[id];

          if (
            transportWithMeta?.socketId === socketId &&
            !transportWithMeta?.consumer
          ) {
            return transportWithMeta?.transport;
          }
        }
      }
    }
  }
  _getConsumerTransport(socketId, serverConsumerTransportId, peerTransportIds) {
    if (peerTransportIds.length > 0) {
      for (const id of peerTransportIds) {
        if (id in this._transports) {
          console.log("id", id);
          const transportWithMeta = this._transports[id];

          if (
            transportWithMeta?.socketId === socketId &&
            transportWithMeta?.transport?.id === serverConsumerTransportId &&
            transportWithMeta?.consumer
          ) {
            return transportWithMeta?.transport;
          }
        }
      }
    }
  }

  _connectWebRtcSendTransport(socketId, dtlsParameters, peerTransportIds) {
    const producerTransport = this._getProducerTransport(
      socketId,
      peerTransportIds
    );

    if (producerTransport) {
      producerTransport.connect({ dtlsParameters });
    }
  }

  async _connectWebRtcRecvTransport(
    socketId,
    dtlsParameters,
    serverConsumerTransportId,
    peerTransportIds
  ) {
    const consumerTransport = this._getConsumerTransport(
      socketId,
      serverConsumerTransportId,
      peerTransportIds
    );
    console.log("got the consumer Transport", consumerTransport);
    if (consumerTransport) {
      await consumerTransport.connect({ dtlsParameters });
    }
  }

  async _transportProduce(
    socketId,
    routerId,
    peerTransportIds,
    kind,
    rtpParameters,
    appData
  ) {
    const roomId = this._roomId;
    const router = this._mediaSoupRouters.get(routerId);
    const producerTransport = this._getProducerTransport(
      socketId,
      peerTransportIds
    );
    const producer = await producerTransport.produce({
      kind,
      rtpParameters,
      appData,
    });

    const producerWithMeta = { socketId, producer, roomId }; // Extra meta info required;

    this._producers[producer.id] = producerWithMeta;
    // TODO: Adding close producer
    // Piping the producer to every router of this room to allow other user to get streams
    console.log("this.peers", this._peers);
    const pipeRouters = this._getRoutersToPipeTo(routerId);
    console.log("pipeRouters", pipeRouters);
    for (const [routerId, destinationRouter] of this._mediaSoupRouters) {
      if (pipeRouters.includes(routerId)) {
        await router.pipeToRouter({
          producerId: producer.id,
          router: destinationRouter,
        });
      }
    }
    return producer;
  }

  async _transportConsumer(
    socketId,
    routerId,
    peerTransportIds,
    rtpCapabilities,
    remoteProducerId,
    serverConsumerTransportId,
    appData
  ) {
    const roomId = this._roomId;
    const router = this._mediaSoupRouters.get(routerId);
    const consumerTransport = this._getConsumerTransport(
      socketId,
      serverConsumerTransportId,
      peerTransportIds
    );
    if (router.canConsume({ producerId: remoteProducerId, rtpCapabilities })) {
      // transport can consume and return a consumer
      const consumer = await consumerTransport.consume({
        producerId: remoteProducerId,
        rtpCapabilities,
        paused: true,
        appData: appData,
      });
      // consumer.on(SOCKET_EVENTS.PRODUCERPAUSE, () => {
      //   console.log("Producer paused hence consumer paused");
      // });
      // consumer.on(SOCKET_EVENTS.PRODUCERRESUME, () => {
      //   consoole.log("Producer resume hence consumer");
      // });

      // consumer.on(SOCKET_EVENTS.TRANSPORT_CLOSE, () => {
      //   console.log("producer transport closed");
      // });
      // consumer.on(SOCKET_EVENTS.PRODUCERCLOSE, () => {
      //   console.log("producer closed kindly close consumer");
      // });

      this._consumers[consumer.id] = { socketId, consumer, roomId };
      console.log("consumers created", this._consumers);
      return consumer;
    }
  }

  _resumingProducer(producerId) {
    if (producerId in this._producers) {
      const producer = this._producers[producerId];
      console.log("producer resumeing", producer);
      producer.producer.resume();
    }
  }

  _pausingProducer(producerId) {
    if (producerId in this._producers) {
      const producer = this._producers[producerId];
      producer.producer.pause();
    }
  }

  _resumingConsumer(serverConsumerId) {
    if (serverConsumerId in this._consumers) {
      const consumer = this._consumers[serverConsumerId];
      console.log("consumer resuming", consumer);
      if (consumer) {
        consumer.consumer.resume();
      }
    }
  }
  _removeItems(type, socketId) {
    console.log("remove item socketId", type, socketId);
    if (type === "consumers") {
      for (let key in this._consumers) {
        const item = this._consumers[key];

        if (item.socketId === socketId) {
          console.log("trying deleting consumer");
          item?.consumer?.close(); // closing
          delete this._consumers[key];
        }
      }
      console.log("After deleting consumer", this._consumers);
    } else if (type === "producers") {
      for (let key in this._producers) {
        const item = this._producers[key];
        if (item.socketId === socketId) {
          console.log("trying deleting producer");
          item?.producer?.close(); // closing
          delete this._producers[key];
        }
      }
      console.log("After deleting producer", this._producers);
    } else if (type === "transports") {
      for (let key in this._transports) {
        const item = this._transports[key];
        if (item.socketId === socketId) {
          console.log("trying deleting transport");
          item?.transport?.close(); // closing
          delete this._transports[key];
        }
      }
      console.log("transport after delete", this._transports);
    }
  }
  _removePeer(socketId) {
    delete this._peers[socketId];
  }

  _removeAllRoutersOfRoom() {
    for (const router of this._mediaSoupRouters.values()) {
      router.close();
      this._mediaSoupRouters.delete(router?.id);
    }
  }
  _disconnectingOrLeavingPeer(socketId) {
    this._removeItems("consumers", socketId);
    this._removeItems("producers", socketId);
    this._removeItems("transports", socketId);
    if (socketId in this._peers) {
      const leavingPeer = this._peers[socketId];
      this._removePeer(socketId);
      const peerCountInRoom = this._checkPeerCountInRoom();
      // TODO check peer count if 0 then close all router of this room
      if (peerCountInRoom === 0) {
        // Close all routers and delete all routers
        this._removeAllRoutersOfRoom();
      }
      return { peerCountInRoom, leavingPeer };
    }
  }

  _startRecording(socketId, producerScreenShare, producerAudioShare) {
    if (socketId in this._peers) {
      const peer = this._peers[socketId];
      if (peer?.recordProcess) {
        peer.recordProcess.kill();
        return;
      }
      let peerProducerList = [];
      if (producerScreenShare?._id in this._producers) {
        peerProducerList.push(this._producers[producerScreenShare?._id]);
      }
      if (producerAudioShare?._id in this._producers) {
        peerProducerList.push(this._producers[producerAudioShare?._id]);
      }
      console.log("peer producer list", peerProducerList);
    }
  }
  close() {
    console.log("Emitting close");
    this.emit("close");
  }
}

module.exports = { allRooms, allPeers, RoomManager };
