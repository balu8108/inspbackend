let {
  rooms,
  peers,
  transports,
  producers,
  consumers,
} = require("./socketglobalvariables");

const uuidv4 = require("uuid").v4;

const { SOCKET_EVENTS, mediaCodecs } = require("../constants");

const createOrJoinRoomFunction = async (data, socketId, worker) => {
  // check if create room have this id or not
  let router1;
  let peers = [];
  if ("roomId" in data) {
    // means room exist then add this peer to given room
    let roomId = data.roomId;
    let newPeerDetails = {
      id: Math.floor(Math.random() * (100000 - 1 + 1)) + 1,
      name: "Test" + Math.floor(Math.random() * (10000 - 1 + 1)) + 1,
      isAdmin: false, // Is this Peer the Admin?
    };

    // search within rooms object whether this roomId exists or not?
    // if exists then send roomId and router back
    // if not exists then check in db whether that room exists or not?
    // if exists then create the new room
    // if not exists then send false,false
    if (roomId in rooms) {
      router1 = rooms[roomId].router;
      peers = rooms[roomId].peers || [];
      rooms[roomId] = {
        router: router1,
        peers: [...peers, newPeerDetails],
      };

      return { roomId, router1, newPeerDetails };
    } else {
      // TODO Check in db and then create room if it exists otherwise don't create and send false,false
      // Right now we will create using uuid
      // let generateRoomId = uuidv4();
      router1 = await worker.createRouter({ mediaCodecs });

      rooms[roomId] = {
        router: router1,
        peers: [...peers, newPeerDetails],
      };
      return { roomId, router1, newPeerDetails };
    }
  } else {
    // no room Id supplied then send false,false
    return { roomId: false, router1: false };
  }
};

// rooms contains temporarily the rooms that are currently active means there is at least one peer in the room

const joinRoomPreviewHandler = (data, callback, socket, io) => {
  const { roomId } = data;
  if (roomId) {
    // check from existing rooms if it exist if not exis then go to below step
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
};

const joinRoomHandler = async (data, callback, socket, io, worker) => {
  const { roomId, router1, newPeerDetails } = await createOrJoinRoomFunction(
    data,
    socket.id,
    worker
  );
  if (roomId === false && router1 === false) {
    callback({ success: false }); // No room id supplied
  } else {
    peers[socket.id] = {
      socket,
      roomId,
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
};

const createWebRtcTransport = async (router) => {
  return new Promise(async (resolve, reject) => {
    try {
      const webRtcOptions = {
        listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      };

      let transport = await router.createWebRtcTransport(webRtcOptions);
      transport.on(SOCKET_EVENTS.DTLS_STATE_CHANGE, (dtlsState) => {
        if (dtlsState === "closed") {
          transport.close();
        }
      });

      transport.on(SOCKET_EVENTS.CLOSE, () => {
        console.log("transport closed");
      });
      resolve(transport);
    } catch (err) {
      reject(err);
    }
  });
};

const addTransport = (transport, roomId, consumer, socket) => {
  transports = [
    ...transports,
    { socketId: socket.id, transport, roomId, consumer },
  ];
  peers[socket.id] = {
    ...peers[socket.id],
    transports: [...peers[socket.id].transports, transport.id],
  };
};

const createWebRtcTransportHandler = (data, callback, socket, io, worker) => {
  const { consumer } = data;
  const roomId = peers[socket.id].roomId;
  const router = rooms[roomId].router;

  createWebRtcTransport(router).then((transport) => {
    callback({
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      },
    });

    addTransport(transport, roomId, consumer, socket);
  }).catch = (err) => {
    console.log(err);
  };
};

const getTransport = (socketId) => {
  const [producerTransport] = transports.filter(
    (transport) => transport.socketId === socketId && !transport.consumer
  );
  return producerTransport.transport;
};

const connectWebRTCTransportSendHandler = (data, socket, worker) => {
  // this is for connecting the producer transport
  const { dtlsParameters } = data;
  getTransport(socket.id).connect({ dtlsParameters });
};

const addProducer = (producer, roomId, socket) => {
  producers = [...producers, { socketId: socket.id, producer, roomId }];

  peers[socket.id] = {
    ...peers[socket.id],
    producers: [...peers[socket.id].producers, producer.id],
  };
};

const transportProduceHandler = async (data, callback, socket, worker) => {
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
};
const getProducersHandler = (callback, socket, worker) => {
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
};

const connectWebRTCTransportRecvHandler = async (data, socket, worker) => {
  const { dtlsParameters, serverConsumerTransportId } = data;
  // find the transport and check if that transport is consumer type
  const consumerTransport = transports.find(
    (transportData) =>
      transportData.consumer &&
      transportData.transport.id == serverConsumerTransportId
  ).transport;
  await consumerTransport.connect({ dtlsParameters });
};

const addConsumer = (consumer, roomId, socket) => {
  consumers = [...consumers, { socketId: socket.id, consumer, roomId }];
  peers[socket.id] = {
    ...peers[socket.id],
    consumers: [...peers[socket.id].consumers, consumer.id],
  };
};

const consumeHandler = async (data, callback, socket, worker) => {
  const { rtpCapabilities, remoteProducerId, serverConsumerTransportId } = data;

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
  const { serverConsumerId } = data;
  const { consumer } = consumers.find(
    (consumer) => consumer.consumer.id === serverConsumerId
  );
  await consumer.resume();
};

const removeItems = (items, socketId, type) => {
  items.forEach((item) => {
    if (item.socketId === socketId) {
      item[type].close();
    }
  });
  items = items.filter((item) => item.socketId !== socketId);
  return items;
};

const chatMsgHandler = (data, socket) => {
  const { roomId, peerDetails } = peers[socket.id];
  const { msg } = data;
  socket.broadcast.to(roomId).emit(SOCKET_EVENTS.CHAT_MSG_FROM_SERVER, {
    msg: msg,
    peerDetails: peerDetails,
  }); // broadcast message to all
};

const disconnectHandler = (socket, worker, io) => {
  consumers = removeItems(consumers, socket.id, "consumer");
  producers = removeItems(producers, socket.id, "producer");
  transports = removeItems(transports, socket.id, "transport");
  if (socket.id in peers) {
    const { roomId } = peers[socket.id];
    const leavingPeer = peers[socket.id];
    delete peers[socket.id];

    rooms[roomId] = {
      router: rooms[roomId].router,
      peers: rooms[roomId].peers.filter(
        (peer) => peer.id !== leavingPeer.peerDetails.id
      ),
    };
    if (rooms[roomId].peers.length === 0) {
      delete rooms[roomId];
      socket.leave(roomId);
    } else {
      socket.leave(roomId);
      io.to(roomId).emit(SOCKET_EVENTS.PEER_LEAVED, {
        peerLeaved: leavingPeer.peerDetails,
      });
    }
  }
};

const questionsHandler = (data, socket) => {
  const { roomId } = peers[socket.id];
  // there can be polls mcq and qna
  socket.broadcast
    .to(roomId)
    .emit(SOCKET_EVENTS.QUESTION_SENT_FROM_SERVER, { data });
};

const stopProducingHandler = (data, socket) => {
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
};

const raiseHandHandler = (data, socket) => {
  const { isHandRaised } = data;
  const { roomId, peerDetails } = peers[socket.id];
  socket.broadcast
    .to(roomId)
    .emit(SOCKET_EVENTS.RAISE_HAND_FROM_SERVER, { isHandRaised, peerDetails });
};

const uploadFileHandler = (data, socket) => {
  console.log("data file", data);
  // will receive array of files and then broadcast to all
  const { roomId } = peers[socket.id];
  socket.broadcast.to(roomId).emit(SOCKET_EVENTS.UPLOAD_FILE_FROM_SERVER, data);
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
  questionsHandler,
  stopProducingHandler,
  raiseHandHandler,
  uploadFileHandler,
};
