let rooms = {}; // { roomName1: { Router, peers: [ sicketId1, ... ] }, ...}
let peers = {}; // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
let transports = []; // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = []; // [ { socketId1, roomName1, producer, }, ... ] // contains all producers across rooms
let consumers = []; // [ { socketId1, roomName1, consumer, }, ... ] // contains all consumers across rooms
let testQuestions = {}; // this will contain all the test poll/tf/mcq questions during a live class under a room id
let testResponses = {}; // this will contains all the test/poll/tf/mcq answers by students
let leaderBoard = {}; // will contain the leaderboard of a particular room
module.exports = {
  rooms,
  peers,
  transports,
  producers,
  consumers,
  testQuestions,
  testResponses,
  leaderBoard,
};
