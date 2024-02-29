const EventEmitter = require("events");
const allRooms = new Map();
const allPeers = new Map();
const redis = require("redis");
const { getPort } = require("./port");
const { PLATFORM, ENVIRON, REDIS_HOST } = require("../envvar");
const {
  SOCKET_EVENTS,
  mediaCodecs,
  liveClassLogInfo,
  classStatus,
  liveClassTestQuestionLogInfo,
} = require("../constants");

const { generateAWSS3LocationUrl, isObjectValid } = require("../utils");

const { LiveClassRoomRecording, LeaderBoard } = require("../models");

const FFmpeg = require("./ffmpeg");
const Gstreamer = require("./gstreamer");

const RECORD_PROCESS_NAME = "GStreamer";

const config = require("./config");

const ROUTER_SCALE_SIZE = 1;

// Create a Redis client
const redisClient = redis.createClient({ url: REDIS_HOST });
redisClient.connect();

class RoomManager extends EventEmitter {
  constructor({ roomId, mediaSoupRouters, mediaSoupWorkers }) {
    super();
    this._roomId = roomId;
    this._mentors = {}; // For some special cases we have mentors object as well
    this._peers = {}; // initializing with empty peers object
    this._transports = {}; // Transports for this room
    this._producers = {}; // Producers for this room
    this._consumers = {}; // Consumers for this room
    this._testQuestions = {}; // For holding poll questions
    this._testResponses = {}; // this will contains all the test/poll/tf/mcq answers by students
    this._leaderBoard = {}; // will contain the leaderboard of room
    this._mediaSoupWorkers = mediaSoupWorkers;
    this._mediaSoupRouters = mediaSoupRouters;
    this._roomPipeTransports = {}; // store the pipe transport that can consume from remote server
    this._roomProducerPipeTransports = {}; // Store the pipe transport for the producers
  }

  static getLeastLoadedRouter(
    allmediaSoupWorkersOnServer,
    mediaSoupRoutersOfRoom
  ) {
    try {
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
    } catch (err) {
      console.log("Erro in RManager least loaded Router", err);
    }
  }
  static async create({ mediaSoupWorkers, roomId, newPeerDetails }) {
    try {
      const mediaSoupRouters = new Map();
      for (const worker of mediaSoupWorkers.values()) {
        const router = await worker.createRouter({ mediaCodecs });
        mediaSoupRouters.set(router.id, router);
      }
      return new RoomManager({
        roomId,
        mediaSoupRouters,
        mediaSoupWorkers,
      });
    } catch (err) {
      console.log("Error in RManager create", err);
    }
  }

  _isPeerAlreadyExisted(peerDetails) {
    // Getting auth data in peerDetails.id
    return peerDetails.id in this._peers;
  }

  _getAllPeersInRoom() {
    const peerDetailsArray = Object.values(this._peers).map(
      (peer) => peer.peerDetails
    );
    return peerDetailsArray;
  }

  _getSocketIDsOfConsumers() {
    try {
      const socketIds = Object.values(this._consumers).map((cs) => cs.socketId);
      return socketIds;
    } catch (err) {}
  }

  _getAllPeersInRoomStartWithPeer(peer) {
    const peerDetailsArray = Object.values(this._peers)
      .filter((op) => op.peerDetails.id !== peer.id)
      .map((filteredPeer) => filteredPeer.peerDetails);

    return [peer, ...peerDetailsArray];
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
    try {
      const router = this._mediaSoupRouters.get(routerId);

      const peersToPipe = Object.values(this._peers).filter(
        (peer) => peer.routerId !== routerId && peer.routerId !== null
      );
      for (const peer of peersToPipe) {
        const srcRouter = this._mediaSoupRouters.get(peer.routerId);

        for (const producerId of Object.keys(this._producers)) {
          if (router.appData.producers.has(producerId)) {
            // same router do not need piping it automatically put streams to these consumers

            continue;
          }
          // Piping all producers in different routers to this router of current peer

          await srcRouter.pipeToRouter({
            producerId: producerId,
            router: router,
          });
        }
      }
    } catch (err) {
      console.log("Error in RManager pipe producer to Router", err);
    }
  }

  async _consumingInPipeTransport(data) {
    // Tricky part here we want to consume but actuall here we will use produce
    // As when a new producer created on remote server then here in our server we produce those stream to be available in the corressponding router
    try {
      const allPipeTransportsOfProducer =
        this._roomPipeTransports[data?.producerId];
      for (const pipeTransportKey in allPipeTransportsOfProducer) {
      }
    } catch (err) {
      console.log("Error in consuming pipe transport", err);
    }
  }

  async _producingInPipeTransport(data) {
    try {
      // Most tricky part here we want to produce but actually here we will use consume
      // As when a new producer created then its corresponding pipeTransport will consume it first
      // Then in remote end or in others will use there pipeTransport to produce those streams in there router
      const { producerId } = data;
      const sourceProducer = this._producers[producerId]; // Get that producer
      const streamProducers = {};
      if (sourceProducer) {
        // Using this source producer now pipe these streams to make it available for remote stream

        const pipeTransports =
          this._roomProducerPipeTransports[sourceProducer?.producer?.id];
        console.log("room producer pipe", this._roomProducerPipeTransports);
        for (const pipeTransportKey in pipeTransports) {
          const pipeTransport = pipeTransports[pipeTransportKey];
          const pipeConsumer = await pipeTransport?.pipeTransport?.consume({
            producerId: sourceProducer?.producer?.id,
            paused: sourceProducer?.producer?.paused,
            appData: sourceProducer?.producer?.appData,
          });
          streamProducers[pipeConsumer.id] = {
            pipeConsumerProducerId: pipeConsumer?.producerId,
            pipeConsumerKind: pipeConsumer.kind,
            pipeConsumerRtp: pipeConsumer.rtpParameters,
            pipeConsumerAppData: pipeConsumer?.appData,
            pipeConsumerPaused: pipeConsumer.producerPaused,
          };
        }

        redisClient.publish(
          "STREAMING",
          JSON.stringify({
            action: "requestForConsumingPipeTransport",
            data: {
              roomId: this._roomId,
              producerId: data?.producerId,
              sourceRouterId: data?.sourceRouterId, // It is the router id that belongs to other where a producer is created
              pipeProducers: streamProducers,
            },
          }),
          (err, reply) => {
            if (err) {
              // Handle the error
              console.error(
                "Error publishing message of create pipe producer:",
                err
              );
            } else {
              // Message published successfully
              console.log(
                "Message published successfully of create pipe producer"
              );
            }
          }
        );
      }
    } catch (err) {
      console.log("Error in producing pipe transport", err);
    }
  }

  async _createPipeTransports(producerId, sourceRouterId) {
    try {
      // Create pipe Transport for each router for the above remote producerId
      const pipeTransportsData = {};
      const pipeTransports = {};
      for (const router of this._mediaSoupRouters.values()) {
        const pipeTransportOptions = config.pipeTransport;
        const pipeTransport = await router.createPipeTransport(
          pipeTransportOptions
        );

        pipeTransportsData[pipeTransport.id] = {
          routerId: router.id,
          remoteIp: pipeTransport.tuple.localIp,
          remotePort: pipeTransport.tuple.localPort,
        };
        pipeTransports[pipeTransport.id] = {
          routerId: router.id,
          remoteIp: pipeTransport.tuple.localIp,
          remotePort: pipeTransport.tuple.localPort,
          pipeTransport: pipeTransport,
        };
      }
      this._roomPipeTransports[producerId] = pipeTransports;

      redisClient.publish(
        "STREAMING",
        JSON.stringify({
          action: "remotePipeProducerData",
          data: {
            roomId: this._roomId,
            producerId: producerId,
            sourceRouterId: sourceRouterId, // It is the router id that belongs to other where a producer is created
            remoteTransports: pipeTransports,
          },
        }),
        (err, reply) => {
          if (err) {
            // Handle the error
            console.error(
              "Error publishing message of create pipe producer:",
              err
            );
          } else {
            // Message published successfully
            console.log(
              "Message published successfully of create pipe producer"
            );
          }
        }
      );
    } catch (err) {
      console.log("Error in create pipe transports", err);
    }
  }

  async _connectToSourceServer(data) {
    try {
      // Connect the source server pipeTransport

      const roomPipeTransports = this._roomPipeTransports[data?.producerId];

      for (const sourceServerPipeTransportKey in data?.remoteTransports) {
        const sourcePTransport =
          data?.remoteTransports[sourceServerPipeTransportKey];

        const roomPipeTransport =
          roomPipeTransports[sourcePTransport?.connectedToPipeTransportId]; // find to which transport the source pipe transport is connected in this server

        if (roomPipeTransport) {
          await roomPipeTransport?.pipeTransport.connect({
            ip: sourcePTransport?.remoteIp,
            port: sourcePTransport?.remotePort,
          });
        }
      }

      redisClient.publish(
        "STREAMING",
        JSON.stringify({
          action: "requestForProducingPipeTransport",
          data: {
            roomId: this._roomId,
            producerId: data?.producerId,
            sourceRouterId: data?.sourceRouterId, // It is the router id that belongs to other where a producer is created
          },
        }),
        (err, reply) => {
          if (err) {
            // Handle the error
            console.error(
              "Error publishing message of create pipe producer:",
              err
            );
          } else {
            // Message published successfully
            console.log(
              "Message published successfully of create pipe producer"
            );
          }
        }
      );
    } catch (err) {}
  }

  async _createPipeTransportForEveryRemoteServer(data) {
    try {
      // In data we will receiver producer id for which we are creating this pipeProducer
      const router = this._mediaSoupRouters.get(data?.sourceRouterId);
      const pipeTransportForThisProducer = {};
      const pipeTransportForProducerData = {};

      for (const remoteServerPipeProducer in data?.remoteTransports) {
        const pipeTransportOptions = config.pipeTransport;
        const pipeTransport = await router.createPipeTransport(
          pipeTransportOptions
        );
        const remotePipeTransportData =
          data?.remoteTransports[remoteServerPipeProducer];
        await pipeTransport.connect({
          ip: remotePipeTransportData?.remoteIp,
          port: remotePipeTransportData?.remotePort,
        });

        pipeTransportForProducerData[pipeTransport.id] = {
          connectedToPipeTransportId: remoteServerPipeProducer,
          routerId: router.id,
          remoteIp: pipeTransport.tuple.localIp,
          remotePort: pipeTransport.tuple.localPort,
        };
        pipeTransportForThisProducer[pipeTransport.id] = {
          connectedToPipeTransportId: remoteServerPipeProducer,
          routerId: router.id,
          remoteIp: pipeTransport.tuple.localIp,
          remotePort: pipeTransport.tuple.localPort,
          pipeTransport: pipeTransport,
        };
      }
      this._roomProducerPipeTransports[data?.producerId] =
        pipeTransportForThisProducer;

      redisClient.publish(
        "STREAMING",
        JSON.stringify({
          action: "setupPipeTransportConnect",
          data: {
            roomId: this._roomId,
            producerId: data?.producerId,
            sourceRouterId: data?.sourceRouterId, // It is the router id that belongs to other where a producer is created
            remoteTransports: pipeTransportForProducerData,
          },
        }),
        (err, reply) => {
          if (err) {
            // Handle the error
            console.error(
              "Error publishing message of create pipe producer:",
              err
            );
          } else {
            // Message published successfully
            console.log(
              "Message published successfully of create pipe producer"
            );
          }
        }
      );
    } catch (err) {
      console.log(
        "Error in create pipe transport for every remote server",
        err
      );
    }
  }

  async _getRouterId() {
    try {
      const routerId = RoomManager.getLeastLoadedRouter(
        this._mediaSoupWorkers,
        this._mediaSoupRouters
      );

      // later on will do pipeToRouter

      await this._pipeProducersToRouter(routerId);

      return routerId;
    } catch (err) {
      console.log("Error in RManager router id", err);
    }
  }
  _checkPeerCountInRoom() {
    return Object.keys(this._peers).length;
  }

  _getRoomMentors() {
    return Object.values(this._mentors);
  }
  _isMentorsInRoom() {
    return Object.values(this._mentors).length > 0;
  }

  _processLeaderBoardData = (roomId, leaderBoardData) => {
    try {
      let leaderBoardObjects = {};
      for (const record of leaderBoardData) {
        leaderBoardObjects = {
          ...leaderBoardObjects,
          [record?.peerId]: {
            peerDetails: {
              id: record?.peerId,
              name: record?.peerName,
              email: record?.peerEmail,
            },
            correctAnswers: record?.correctAnswers,
            combinedResponseTime: record?.combinedResponseTime,
          },
        };
      }

      if (isObjectValid(leaderBoardObjects)) {
        this._leaderBoard[roomId] = leaderBoardObjects;
      }

      const sortedLeaderBoard = Object.values(leaderBoardObjects).sort(
        (a, b) => {
          // Sort by correct answers in descending order
          if (b.correctAnswers !== a.correctAnswers) {
            return b.correctAnswers - a.correctAnswers;
          }
          // If correct answers are equal, sort by combined response time in ascending order
          return a.combinedResponseTime - b.combinedResponseTime;
        }
      );
      return sortedLeaderBoard;
    } catch (err) {
      console.log("Error in processing leaderboard data", err);
      return;
    }
  };
  async _joinRoomPeerHandler(newPeerDetails, leaderBoardData) {
    try {
      const roomId = this._roomId;
      const leaderBoardArray = this._processLeaderBoardData(
        roomId,
        leaderBoardData
      );

      const routerId = await this._getRouterId(); // get best router to assign this newPeer
      this._peers[newPeerDetails?.id] = {
        routerId,
        peerDetails: newPeerDetails,
      };

      // SETTING NEW PEER IN REDIS TO ALLOW OTHER USER IN ANY SERVER TO GET INFO FROM REDIS
      await redisClient.hSet(
        `room:${roomId}:peers`,
        newPeerDetails?.id,
        JSON.stringify({ routerId, peerDetails: newPeerDetails })
      );

      if (newPeerDetails?.isTeacher) {
        // Add it to mentor object as well
        this._mentors[newPeerDetails?.id] = {
          routerId,
          peerDetails: newPeerDetails,
        };

        await redisClient.hSet(
          `room:${roomId}:mentors`,
          newPeerDetails?.id,
          JSON.stringify({ routerId, peerDetails: newPeerDetails })
        );
      }

      const rtpCapabilities = this._getRouterCapabilities(routerId);
      return {
        peer: newPeerDetails,
        leaderBoardArray,
        routerId,
        rtpCapabilities,
      };
    } catch (err) {
      console.log("Error in RManger join room handler", err);
    }
  }

  async _createWebRtcTransportCreator(authId, routerId, socketId, consumer) {
    try {
      const roomId = this._roomId;
      if (this._mediaSoupRouters.has(routerId)) {
        const webRtcOptions = config.webRtcTransport;
        // const pipeTransportOptions = config.pipeTransport;
        const router = this._mediaSoupRouters.get(routerId);
        // const transport = await router.createPipeTransport(
        //   pipeTransportOptions
        // );
        // console.log("pipe transport", transport);
        const transport = await router.createWebRtcTransport(webRtcOptions);
        const transportWithMeta = {
          userId: authId,
          socketId,
          transport,
          roomId,
          consumer,
        }; // Extra info required
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

        return transport; // No need to return extra info just normal transport is fine
      }
    } catch (err) {
      console.log("Error in RManager in create webrtc transport", err);
    }
  }

  async _getProducerList(authId, socketId) {
    try {
      const producerInRoom = this._getProducersInRoom();
      const producerList = [];
      producerInRoom.forEach((producer) => {
        if (producer.roomId === this._roomId && producer.userId !== authId) {
          let obj = {
            producerId: producer.producer.id,
            appData: producer.producer.appData,
          };
          producerList.push(obj);
        }
      });
      return producerList;
    } catch (err) {
      console.log("Error in RManager in get producer list ", err);
    }
  }

  _getProducerTransport(authId, socketId, peerTransportIds) {
    // Returns the producer transport and connects it with dtlsParamaters
    try {
      if (peerTransportIds.length > 0) {
        for (const id of peerTransportIds) {
          if (id in this._transports) {
            const transportWithMeta = this._transports[id];
            if (
              transportWithMeta?.userId === authId &&
              !transportWithMeta?.consumer
            ) {
              return transportWithMeta?.transport;
            }
          }
        }
      }
    } catch (err) {
      console.log("Error in RManager get producer Transport", err);
    }
  }
  _getConsumerTransport(
    authId,
    socketId,
    serverConsumerTransportId,
    peerTransportIds
  ) {
    try {
      if (peerTransportIds.length > 0) {
        for (const id of peerTransportIds) {
          if (id in this._transports) {
            console.log("id", id);
            const transportWithMeta = this._transports[id];

            if (
              transportWithMeta?.userId === authId &&
              transportWithMeta?.transport?.id === serverConsumerTransportId &&
              transportWithMeta?.consumer
            ) {
              return transportWithMeta?.transport;
            }
          }
        }
      }
    } catch (err) {
      console.log("Error in RManager get Consumer Transport ", err);
    }
  }

  _connectWebRtcSendTransport(
    authId,
    socketId,
    dtlsParameters,
    peerTransportIds
  ) {
    try {
      const producerTransport = this._getProducerTransport(
        authId,
        socketId,
        peerTransportIds
      );

      if (producerTransport) {
        producerTransport.connect({ dtlsParameters });
      }
    } catch (err) {
      console.log("Error in RManager in connecting webrtc send transport", err);
    }
  }

  async _connectWebRtcRecvTransport(
    authId,
    socketId,
    dtlsParameters,
    serverConsumerTransportId,
    peerTransportIds
  ) {
    try {
      const consumerTransport = this._getConsumerTransport(
        authId,
        socketId,
        serverConsumerTransportId,
        peerTransportIds
      );

      if (consumerTransport) {
        await consumerTransport.connect({ dtlsParameters });
      }
    } catch (err) {
      console.log("Error in RManager in connecting webrtc recv transport", err);
    }
  }

  async _transportProduce(
    authId,
    socketId,
    routerId,
    peerTransportIds,
    kind,
    rtpParameters,
    appData
  ) {
    try {
      const roomId = this._roomId;
      const router = this._mediaSoupRouters.get(routerId);
      const producerTransport = this._getProducerTransport(
        authId,
        socketId,
        peerTransportIds
      );
      const producer = await producerTransport.produce({
        kind,
        rtpParameters,
        appData,
      });

      const producerWithMeta = { userId: authId, socketId, producer, roomId }; // Extra meta info required;

      this._producers[producer.id] = producerWithMeta;

      // const allPipeTransports = await this._createPipeTransports(routerId);

      // for (const pipeTransport of allPipeTransports) {
      //   const pipeTransportOptions = config.pipeTransport;
      //   const pipeTransportOfThisRouter = await router.createPipeTransport(
      //     pipeTransportOptions
      //   );
      //   await pipeTransportOfThisRouter.connect({
      //     ip: pipeTransport.tuple.localIp,
      //     port: pipeTransport.tuple.localPort,
      //   });
      //   await pipeTransport.connect({
      //     ip: pipeTransportOfThisRouter.tuple.localIp,
      //     port: pipeTransportOfThisRouter.tuple.localPort,
      //   });
      //   // consume this
      //   const pipeConsumer = await pipeTransportOfThisRouter.consume({
      //     producerId: producer.id,
      //     paused: producer.paused,
      //     appData: producer.appData,
      //   });

      //   const pipeProducer = await pipeTransport.produce({
      //     id: pipeConsumer?.producerId,
      //     kind: pipeConsumer.kind,
      //     rtpParameters: pipeConsumer.rtpParameters,
      //     appData: pipeConsumer?.appData,
      //     paused: pipeConsumer.producerPaused,
      //   });

      //   // Pipe events from the pipe Consumer to the pipe Producer.
      //   pipeConsumer.observer.on("close", () => {
      //     console.log("pipe producer close");
      //     pipeProducer.close();
      //   });
      //   pipeConsumer.observer.on("pause", () => {
      //     console.log("pipe pause");
      //     pipeProducer.pause();
      //   });
      //   pipeConsumer.observer.on("resume", () => {
      //     console.log("pipe resume");
      //     pipeProducer.resume();
      //   });

      //   // Pipe events from the pipe Producer to the pipe Consumer.
      //   pipeProducer.observer.on("close", () => {
      //     console.log("closing pipe consumer");
      //     pipeConsumer.close();
      //   });

      //   console.log("both sides connected successfully");
      // }

      // TODO: Adding close producer
      // Piping the producer to every router of this room to allow other user to get streams

      // const pipeRouters = this._getRoutersToPipeTo(routerId);

      // for (const [routerId, destinationRouter] of this._mediaSoupRouters) {
      //   if (pipeRouters.includes(routerId)) {
      //     await router.pipeToRouter({
      //       producerId: producer.id,
      //       router: destinationRouter,
      //     });
      //   }
      // }

      // STORE PRODUCER TO REDIS SERVER
      await redisClient.hSet(
        `room:${roomId}:producers`,
        producer?.id,
        JSON.stringify(producerWithMeta)
      );

      // PUBLISH TO REDIS SO THAT EVERY SERVER CAN CREATE THE PIPE TRANSPORT FOR THIS NEW PRODUCER TO CONSUME
      redisClient.publish(
        "STREAMING",
        JSON.stringify({
          action: "createPipeProducer",
          data: {
            routerId: router.id,
            producerId: producer.id,
            roomId: this._roomId,
          },
        }),
        (err, reply) => {
          if (err) {
            // Handle the error
            console.error(
              "Error publishing message of create pipe producer:",
              err
            );
          } else {
            // Message published successfully
            console.log(
              "Message published successfully of create pipe producer"
            );
          }
        }
      );

      return producer;
    } catch (err) {
      console.log("Error in RManager in Transport producer", err);
    }
  }

  async _transportConsumer(
    authId,
    socketId,
    routerId,
    peerTransportIds,
    rtpCapabilities,
    remoteProducerId,
    serverConsumerTransportId,
    appData
  ) {
    try {
      const roomId = this._roomId;
      const router = this._mediaSoupRouters.get(routerId);
      const consumerTransport = this._getConsumerTransport(
        authId,
        socketId,
        serverConsumerTransportId,
        peerTransportIds
      );
      if (
        router.canConsume({ producerId: remoteProducerId, rtpCapabilities })
      ) {
        // transport can consume and return a consumer
        const consumer = await consumerTransport.consume({
          producerId: remoteProducerId,
          rtpCapabilities,
          paused: true,
          appData: appData,
        });
        this._consumers[consumer.id] = {
          userId: authId,
          socketId,
          consumer,
          roomId,
        };

        return consumer;
      }
    } catch (err) {
      console.log("Error in RManager in Transport consumer", err);
    }
  }

  _resumingProducer(producerId) {
    try {
      if (producerId in this._producers) {
        const producer = this._producers[producerId];

        producer.producer.resume();
      }
    } catch (err) {
      console.log("Error in RManager Resuming Producer", err);
    }
  }

  _pausingProducer(producerId) {
    try {
      if (producerId in this._producers) {
        const producer = this._producers[producerId];
        producer.producer.pause();
      }
    } catch (err) {
      console.log("Error in RManager in Pausing producer", err);
    }
  }

  _resumingConsumer(serverConsumerId) {
    try {
      if (serverConsumerId in this._consumers) {
        const consumer = this._consumers[serverConsumerId];

        if (consumer) {
          consumer.consumer.resume();
        }
      }
    } catch (err) {
      console.log("Error in RManager in resuming consumer", err);
    }
  }
  _removeItems(type, authId, socketId) {
    try {
      if (type === "consumers") {
        for (let key in this._consumers) {
          const item = this._consumers[key];
          if (item.userId === authId) {
            item?.consumer?.close(); // closing
            delete this._consumers[key];
          }
        }
      } else if (type === "producers") {
        for (let key in this._producers) {
          const item = this._producers[key];
          if (item.userId === authId) {
            item?.producer?.close(); // closing
            delete this._producers[key];
          }
        }
      } else if (type === "transports") {
        for (let key in this._transports) {
          const item = this._transports[key];
          if (item.userId === authId) {
            item?.transport?.close(); // closing
            delete this._transports[key];
          }
        }
      }
    } catch (err) {
      console.log("Error in RManager in remvoing items", err);
    }
  }
  _removePeer(authId, socketId) {
    // check if removing peer is mentor
    if (authId in this._mentors) {
      delete this._mentors[authId];
      redisClient.hDel(`room:${this._roomId}:mentors`, authId, (err, reply) => {
        if (err) {
          console.error("Error:", err);
        } else {
          console.log("Deleted field:", reply);
        }
      });
    }
    delete this._peers[authId];
    // FROM REDIS REMOVE THE PEER
    redisClient.hDel(`room:${this._roomId}:peers`, authId, (err, reply) => {
      if (err) {
        console.error("Error:", err);
      } else {
        console.log("Deleted field:", reply);
      }
    });
  }

  _removeAllRoutersOfRoom() {
    try {
      for (const router of this._mediaSoupRouters.values()) {
        router.close();
        this._mediaSoupRouters.delete(router?.id);
      }
    } catch (err) {
      console.log("Error in RManager in remove all Routers of Room", err);
    }
  }
  _removeLeaderBoardOfRoom() {
    delete this._leaderBoard[this._roomId];
  }
  _disconnectingOrLeavingPeer(authId, socketId) {
    try {
      if (authId in this._peers) {
        // check if both socketId and authId matched
        const leavePeer = this._peers[authId];
        if (
          leavePeer &&
          leavePeer?.peerDetails &&
          leavePeer?.peerDetails?.socketId !== socketId
        ) {
          // Means this user may have tried login from other device but couldn't login and now on disconnecting we want to ensure that it won't trigger the removal of already joined from other device peer
          return;
        }
      }
      this._removeItems("consumers", authId, socketId);
      this._removeItems("producers", authId, socketId);
      this._removeItems("transports", authId, socketId);
      console.log("Removed socket id");
      if (authId in this._peers) {
        const leavingPeer = this._peers[authId];

        if (leavingPeer?.recordProcess) {
          leavingPeer.recordProcess.kill();
          leavingPeer.recordProcess = null;
        }
        this._removePeer(authId, socketId);
        const peerCountInRoom = this._checkPeerCountInRoom();
        // TODO check peer count if 0 then close all router of this room
        if (peerCountInRoom === 0) {
          // Close all routers and delete all routers
          this._removeAllRoutersOfRoom();
          this._removeLeaderBoardOfRoom();
        }
        return { peerCountInRoom, leavingPeer };
      }
    } catch (err) {
      console.log("Error in RManager in disconnecting or leaving peer", err);
    }
  }

  _getProcess = (recordInfo) => {
    switch (RECORD_PROCESS_NAME) {
      case "FFmpeg":
        return new FFmpeg(recordInfo);
      case "GStreamer":
        return new Gstreamer(recordInfo);
      default:
        return new Gstreamer(recordInfo);
    }
  };

  _publishProducerRTPStream = async (
    authId,
    roomId,
    socketId,
    peer,
    producer,
    router
  ) => {
    try {
      const rtpTransportConfig = config.plainRtpTransport;
      const rtpTransport = await router.createPlainTransport(
        rtpTransportConfig
      );
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
      // adding to consumers
      this._consumers[rtpConsumer?.id] = {
        userId: authId,
        socketId,
        consumer: rtpConsumer,
        roomId,
      };

      return {
        remoteRtpPort,
        remoteRtcpPort,
        localRtpPort: rtpTransport.tuple.localPort,
        localRtcpPort: rtpTransport.rtcpTuple
          ? rtpTransport.rtcpTuple.localPort
          : undefined,
        rtpCapabilities,
        rtpParameters: rtpConsumer.rtpParameters,
        rtpConsumerId: rtpConsumer?.id,
      };
    } catch (err) {
      console.log("Error in RManager in Publish Producer RTP", err);
    }
  };
  _startRecord = async (
    authId,
    roomId,
    socketId,
    peer,
    peerProducersList,
    router
  ) => {
    try {
      let recordInfo = {};
      for (const obj of peerProducersList) {
        recordInfo["producerId"] = obj.producer.id;
        recordInfo[obj.producer.kind] = await this._publishProducerRTPStream(
          authId,
          roomId,
          socketId,
          peer,
          obj.producer,
          router
        );
      }

      recordInfo.fileName = `${roomId}-${Date.now().toString()}`;
      let recordProcess = this._getProcess(recordInfo);
      if (recordProcess) {
        let fileKeyName = "";
        let url = "";
        if (PLATFORM === "windows") {
          fileKeyName = `recordfiles/${recordInfo?.fileName}.webm`;
          url = "localhost";
        } else {
          fileKeyName = `liveclassrecordings/${recordInfo?.fileName}.webm`;
          url = generateAWSS3LocationUrl(fileKeyName);
        }
        peer.recordProcess = recordProcess;
        const videoRecordConsumer =
          this._consumers[recordInfo["video"]?.rtpConsumerId];
        const audioRecordConsumer =
          this._consumers[recordInfo["audio"]?.rtpConsumerId];
        if (videoRecordConsumer) {
          setTimeout(async () => {
            if (videoRecordConsumer.userId === authId) {
              await videoRecordConsumer.consumer.resume();

              await videoRecordConsumer.consumer.requestKeyFrame();
            }
          }, 1000);
        }

        if (audioRecordConsumer) {
          setTimeout(async () => {
            if (audioRecordConsumer.userId === authId) {
              await audioRecordConsumer.consumer.resume();

              await audioRecordConsumer.consumer.requestKeyFrame();
            }
          }, 1000);
        }

        // setTimeout(async () => {
        //   for (const key in this._consumers) {
        //     const consumer = this._consumers[key];

        //     if (consumer.userId === authId) {
        //       await consumer.consumer.resume();

        //       await consumer.consumer.requestKeyFrame();
        //     }
        //   }
        // }, 1000);

        return { fileKeyName, url };
      }
    } catch (err) {
      console.log("Error in RManager in Start record", err);
    }
  };

  async _startRecording(
    authId,
    socketId,
    routerId,
    producerScreenShare,
    producerAudioShare
  ) {
    try {
      if (authId in this._peers && this._mediaSoupRouters.has(routerId)) {
        const roomId = this._roomId;
        const peer = this._peers[authId];
        const router = this._mediaSoupRouters.get(routerId);

        if (peer?.recordProcess) {
          peer.recordProcess.kill();
          return;
        }
        let peerProducersList = [];
        if (producerScreenShare?._id in this._producers) {
          peerProducersList.push(this._producers[producerScreenShare?._id]);
        }
        if (producerAudioShare?._id in this._producers) {
          peerProducersList.push(this._producers[producerAudioShare?._id]);
        }

        if (peerProducersList.length > 0) {
          const recordData = await this._startRecord(
            authId,
            roomId,
            socketId,
            peer,
            peerProducersList,
            router
          );

          return recordData;
        }
      }
    } catch (err) {
      console.log("Error in RManager in Start recoridng", err);
    }
  }

  _addTestQuestion(authId, socketId, qId, data) {
    try {
      const questionData = { ...data, questionId: qId };
      this._testQuestions[qId] = questionData;
      return questionData;
    } catch (err) {
      console.log("Error in RManager in add test question ", err);
    }
  }

  _stopProducing(authId, socketId, producerId) {
    try {
      if (producerId in this._producers) {
        // close this producer
        const producer = this._producers[producerId];
        producer.producer.close();
        // TODO after close remove it from this._producers object and also from allPeers
        return true;
      }
      return false;
    } catch (err) {
      console.log("Error in RManager in stop producing", err);
    }
  }

  _updateMicBlockOrUnblock(peerId, peerSocketId, value) {
    try {
      if (peerId in this._peers) {
        const peer = this._peers[peerId];
        if (peer && peer?.peerDetails) {
          peer.peerDetails.isAudioBlocked = value;
          if (value === true) {
            peer.peerDetails.isAudioEnabled = !value;
          }

          return peer;
        }
      }
    } catch (err) {
      console.log("Error in RManager updating mic block or unblock", err);
    }
  }

  _muteMicCommandByMentor(peerId, peerSocketId, value) {
    try {
      if (peerId in this._peers) {
        const peer = this._peers[peerId];
        if (peer && peer?.peerDetails) {
          if (value === false) {
            // mostly mute command given by a mentor to student
            // so make isAudioEnabled false

            peer.peerDetails.isAudioEnabled = value;
          }
          return peer;
        }
      }
    } catch (err) {
      console.log("Error in RManager in mute mic command", err);
    }
  }
  _increasePollTime(questionId, timeIncreaseBy) {
    try {
      if (questionId in this._testQuestions) {
        const question = this._testQuestions[questionId];
        question.time = question.time + timeIncreaseBy;
      }
    } catch (err) {
      console.log("Error in RManager Increase Poll time", err);
    }
  }

  _stopRecording(authId, socketId) {
    try {
      if (authId in this._peers) {
        const peer = this._peers[authId];
        if (peer?.recordProcess) {
          peer.recordProcess.kill();
          peer.recordProcess = null;
        }
      }
    } catch (err) {
      console.log("Error in RManager in stop recording", err);
    }
  }

  // Leaderboard DB FUNCTION START
  _createOrUpdateLeaderBoard = async (classPk, roomId, leaderBoardData) => {
    try {
      const findStudentInLeaderBoard = await LeaderBoard.findOne({
        where: {
          classRoomId: classPk,
          peerId: leaderBoardData?.peerDetails?.id,
        },
      });
      if (findStudentInLeaderBoard) {
        // update there scorecard for this class or test
        await findStudentInLeaderBoard.update({
          correctAnswers: leaderBoardData.correctAnswers,
          combinedResponseTime: leaderBoardData.combinedResponseTime,
        });
      } else {
        await LeaderBoard.create({
          peerId: leaderBoardData?.peerDetails?.id,
          peerName: leaderBoardData?.peerDetails?.name,
          peerEmail: leaderBoardData?.peerDetails?.email || "test@gmail.com",
          correctAnswers: leaderBoardData.correctAnswers,
          combinedResponseTime: leaderBoardData.combinedResponseTime,
          classRoomId: classPk,
        });
      }
    } catch (err) {
      console.log("err in creating leaderboard", err.message);
    }
  };
  // DB FUNCTION ENDS

  _compareFrequencyCounts = (freqCount1, freqCount2) => {
    if (freqCount1.size !== freqCount2.size) {
      return false;
    }

    for (const [item, freq] of freqCount1) {
      if (freqCount2.get(item) !== freq) {
        return false;
      }
    }

    return true;
  };

  _getFrequencyCount = (arr) => {
    const freqCount = new Map();

    for (const item of arr) {
      freqCount.set(item, (freqCount.get(item) || 0) + 1);
    }

    return freqCount;
  };

  _checkAnswerCorrectness = (correctAnswer, studentAnswer) => {
    if (correctAnswer.length !== studentAnswer.length) {
      return false;
    }
    const freqCount1 = this._getFrequencyCount(correctAnswer);
    const freqCount2 = this._getFrequencyCount(studentAnswer);
    return this._compareFrequencyCounts(freqCount1, freqCount2);
  };

  _checkIsAnswersCorrect(roomId, response) {
    if (!Object.keys(this._testQuestions).length) {
      return false;
    }
    const roomQuestions = Object.values(this._testQuestions);

    if (roomQuestions.length > 0) {
      const findQuestion = roomQuestions.find(
        (question) => question.questionId === response.questionId
      );
      if (findQuestion) {
        const isCorrectAns = this._checkAnswerCorrectness(
          findQuestion.correctAnswers,
          response.answers
        );
        return isCorrectAns;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  _updateLeaderBoard(authId, socketId, classPk, response) {
    try {
      const roomId = this._roomId;
      const peerDetails = this._peers[authId]?.peerDetails;
      if (peerDetails) {
        if (!this._leaderBoard[roomId]) {
          this._leaderBoard[roomId] = {};
        }
        const isAnswersCorrect = this._checkIsAnswersCorrect(roomId, response);
        if (!this._leaderBoard[roomId][peerDetails.id]) {
          this._leaderBoard[roomId][peerDetails.id] = {
            peerDetails,
            correctAnswers: isAnswersCorrect ? 1 : 0,
            combinedResponseTime: response.responseTimeInSeconds,
          };

          // seed data to db
          this._createOrUpdateLeaderBoard(
            classPk,
            roomId,
            this._leaderBoard[roomId][peerDetails.id]
          );
        } else {
          this._leaderBoard[roomId][peerDetails.id].correctAnswers +=
            isAnswersCorrect ? 1 : 0;
          this._leaderBoard[roomId][peerDetails.id].combinedResponseTime +=
            response.responseTimeInSeconds;

          // seed data to db
          this._createOrUpdateLeaderBoard(
            classPk,
            roomId,
            this._leaderBoard[roomId][peerDetails.id]
          );
        }

        const roomLeaderBoard = this._leaderBoard[roomId];

        const sortedLeaderBoard = Object.values(roomLeaderBoard).sort(
          (a, b) => {
            if (b.correctAnswers !== a.correctAnswers) {
              return b.correctAnswers - a.correctAnswers;
            }
            return a.combinedResponseTime - b.combinedResponseTime;
          }
        );
        return sortedLeaderBoard;
      }
    } catch (err) {
      console.log("Error in RManager updating _updateLeaderboard", err);
    }
  }
  close() {
    console.log("Emitting close");
    this.emit("close");
  }
}

module.exports = { allRooms, allPeers, RoomManager };
