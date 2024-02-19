const EventEmitter = require("events");
const allRooms = new Map();
const allPeers = new Map();

const { getPort } = require("./port");
const { PLATFORM, ENVIRON } = require("../envvar");
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

const ROUTER_SCALE_SIZE = 50;
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

      return new RoomManager({ roomId, mediaSoupRouters, mediaSoupWorkers });
    } catch (err) {
      console.log("Error in RManager create", err);
    }
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
    } catch (err) {
      console.log("Error in RManager pipe producer to Router", err);
    }
  }

  async _getRouterId() {
    try {
      const routerId = RoomManager.getLeastLoadedRouter(
        this._mediaSoupWorkers,
        this._mediaSoupRouters
      );

      // later on will do pipeToRouter
      console.log("router id assigned", routerId);
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
      // console.log("main leader board object", leaderBoard);

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
      this._peers[newPeerDetails?.socketId] = {
        routerId,
        peerDetails: newPeerDetails,
      };

      if (newPeerDetails?.isTeacher) {
        // Add it to mentor object as well
        this._mentors[newPeerDetails?.socketId] = {
          routerId,
          peerDetails: newPeerDetails,
        };
      }

      console.log("this.peers druign join", this._peers);
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

  async _createWebRtcTransportCreator(routerId, socketId, consumer) {
    try {
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
    } catch (err) {
      console.log("Error in RManager in create webrtc transport", err);
    }
  }

  async _getProducerList(socketId) {
    try {
      const producerInRoom = this._getProducersInRoom();
      const producerList = [];
      producerInRoom.forEach((producer) => {
        if (
          producer.roomId === this._roomId &&
          producer.socketId !== socketId
        ) {
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

  _getProducerTransport(socketId, peerTransportIds) {
    // Returns the producer transport and connects it with dtlsParamaters
    try {
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
    } catch (err) {
      console.log("Error in RManager get producer Transport", err);
    }
  }
  _getConsumerTransport(socketId, serverConsumerTransportId, peerTransportIds) {
    try {
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
    } catch (err) {
      console.log("Error in RManager get Consumer Transport ", err);
    }
  }

  _connectWebRtcSendTransport(socketId, dtlsParameters, peerTransportIds) {
    try {
      const producerTransport = this._getProducerTransport(
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
    socketId,
    dtlsParameters,
    serverConsumerTransportId,
    peerTransportIds
  ) {
    try {
      const consumerTransport = this._getConsumerTransport(
        socketId,
        serverConsumerTransportId,
        peerTransportIds
      );
      console.log("got the consumer Transport", consumerTransport);
      if (consumerTransport) {
        await consumerTransport.connect({ dtlsParameters });
      }
    } catch (err) {
      console.log("Error in RManager in connecting webrtc recv transport", err);
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
    try {
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

      const pipeRouters = this._getRoutersToPipeTo(routerId);

      for (const [routerId, destinationRouter] of this._mediaSoupRouters) {
        if (pipeRouters.includes(routerId)) {
          await router.pipeToRouter({
            producerId: producer.id,
            router: destinationRouter,
          });
        }
      }
      return producer;
    } catch (err) {
      console.log("Error in RManager in Transport producer", err);
    }
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
    try {
      const roomId = this._roomId;
      const router = this._mediaSoupRouters.get(routerId);
      const consumerTransport = this._getConsumerTransport(
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
        this._consumers[consumer.id] = { socketId, consumer, roomId };

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
  _removeItems(type, socketId) {
    try {
      if (type === "consumers") {
        for (let key in this._consumers) {
          const item = this._consumers[key];

          if (item.socketId === socketId) {
            item?.consumer?.close(); // closing
            delete this._consumers[key];
          }
        }
      } else if (type === "producers") {
        for (let key in this._producers) {
          const item = this._producers[key];
          if (item.socketId === socketId) {
            item?.producer?.close(); // closing
            delete this._producers[key];
          }
        }
      } else if (type === "transports") {
        for (let key in this._transports) {
          const item = this._transports[key];
          if (item.socketId === socketId) {
            item?.transport?.close(); // closing
            delete this._transports[key];
          }
        }
      }
    } catch (err) {
      console.log("Error in RManager in remvoing items", err);
    }
  }
  _removePeer(socketId) {
    // check if removing peer is mentor
    if (this._mentors[socketId]) {
      delete this._mentors[socketId];
    }
    delete this._peers[socketId];
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
  _disconnectingOrLeavingPeer(socketId) {
    try {
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
      };
    } catch (err) {
      console.log("Error in RManager in Publish Producer RTP", err);
    }
  };
  _startRecord = async (roomId, socketId, peer, peerProducersList, router) => {
    try {
      let recordInfo = {};
      for (const obj of peerProducersList) {
        recordInfo["producerId"] = obj.producer.id;
        recordInfo[obj.producer.kind] = await this._publishProducerRTPStream(
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

        setTimeout(async () => {
          for (const key in this._consumers) {
            const consumer = this._consumers[key];

            if (consumer.socketId === socketId) {
              await consumer.consumer.resume();

              await consumer.consumer.requestKeyFrame();
            }
          }
        }, 1000);

        return { fileKeyName, url };
      }
    } catch (err) {
      console.log("Error in RManager in Start record", err);
    }
  };

  async _startRecording(
    socketId,
    routerId,
    producerScreenShare,
    producerAudioShare
  ) {
    try {
      if (socketId in this._peers && this._mediaSoupRouters.has(routerId)) {
        const roomId = this._roomId;
        const peer = this._peers[socketId];
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

  _addTestQuestion(socketId, qId, data) {
    try {
      const questionData = { ...data, questionId: qId };
      this._testQuestions[qId] = questionData;
      return questionData;
    } catch (err) {
      console.log("Error in RManager in add test question ", err);
    }
  }

  _stopProducing(socketId, producerId) {
    try {
      if (producerId in this._producers) {
        // close this producer
        const producer = this._producers[producerId];
        producer.producer.close();
        return true;
      }
      return false;
    } catch (err) {
      console.log("Error in RManager in stop producing", err);
    }
  }

  _updateMicBlockOrUnblock(peerSocketId, value) {
    try {
      if (peerSocketId in this._peers) {
        const peer = this._peers[peerSocketId];
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

  _muteMicCommandByMentor(peerSocketId, value) {
    try {
      if (peerSocketId in this._peers) {
        const peer = this._peers[peerSocketId];
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

  _stopRecording(socketId) {
    try {
      if (socketId in this._peers) {
        const peer = this._peers[socketId];
        if (peer.recordProcess !== null) {
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
        where: { classRoomId: classPk, peerId: leaderBoardData.peerDetails.id },
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

  _updateLeaderBoard(socketId, classPk, response) {
    try {
      const roomId = this._roomId;
      const peerDetails = this._peers[socketId]?.peerDetails;
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
