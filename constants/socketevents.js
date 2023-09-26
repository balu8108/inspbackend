const SOCKET_EVENTS = Object.freeze({
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  JOIN_ROOM_PREVIEW: "join_room_preview",
  JOIN_ROOM: "join_room",
  NEW_PEER_JOINED: "new_peer_joined",
  ROOM_UPDATE: "room_update",
  CREATE_WEB_RTC_TRANSPORT: "create_webrtc_transport",
  TRANSPORT_SEND_CONNECT: "transport_send_connect",
  TRANSPORT_RECV_CONNECT: "transport-recv-connect",
  TRANSPORT_PRODUCE: "transport_produce",
  NEW_PRODUCER: "new_producer",
  GET_PRODUCERS: "get_producers",
  CONSUME: "consume",
  CONSUMER_RESUME: "consumer-resume",
  DTLS_STATE_CHANGE: "dtlsstatechange",
  CLOSE: "close",
  TRANSPORT_CLOSE: "transportclose",
  PRODUCERCLOSE: "producerclose",
  PRODUCERPAUSE: "producerpause",
  PRODUCERRESUME: "producerresume",
  PRODUCER_CLOSED: "producer-closed",
  CHAT_MSG_TO_SERVER: "chat_msg_to_server",
  CHAT_MSG_FROM_SERVER: "chat_msg_from_server",
  QUESTION_POSTED: "question_posted",
  QUESTION_SENT: "question_sent",
  PEER_LEAVED: "peer_leave",
  STOP_PRODUCING: "stop_producing",
  SOME_PRODUCER_CLOSED: "some_producer_closed",
  RAISE_HAND_TO_SERVER: "raise_hand_to_server",
  RAISE_HAND_FROM_SERVER: "raise_hand_from_server",
  UPLOAD_FILE_TO_SERVER: "upload_file_to_server",
  UPLOAD_FILE_FROM_SERVER: "upload_file_from_server",
  QUESTION_SENT_TO_SERVER: "question_sent_to_server",
  QUESTION_SENT_FROM_SERVER: "question_sent_from_server",
  ANSWER_SENT_TO_SERVER: "answer_sent_to_server",
  IS_AUDIO_STREAM_ENABLED_TO_SERVER: "is_audio_stream_enabled_to_server",
  IS_AUDIO_STREAM_ENABLED_FROM_SERVER: "is_audio_stream_enabled_from_server",
  START_RECORDING: "start_recording",
  STOP_RECORDING: "stop_recording",
  PRODUCER_PAUSE: "producer_pause", // for pausing producer if from frontend it is paused
  PRODUCER_RESUME: "producer_resume",
  PRODUCER_PAUSED: "producer_paused", // for emitting producer_paused event to pause all the associated consumers in frontend
  PRODUCER_RESUMED: "producer_resumed",
  LEAVE_ROOM: "leave_room",
  END_MEET_TO_SERVER: "END_MEET_TO_SERVER",
  END_MEET_FROM_SERVER: "END_MEET_FROM_SERVER",
  LEADERBOARD_FROM_SERVER: "leaderboard_from_server",
  MIRO_BOARD_DATA_TO_SERVER: "miro_board_data_to_server",
  MIRO_BOARD_DATA_FROM_SERVER: "miro_board_data_from_server",
});

module.exports = SOCKET_EVENTS;
