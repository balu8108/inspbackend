const notificationType = {
  EMAIL: "EMAIL",
  SMS: "SMS",
  EMAIL_AND_SMS: "EMAIL+SMS",
};
const classStatus = {
  SCHEDULED: "SCHEDULED",
  ONGOING: "ONGOING",
  NOT_STARTED: "NOT_STARTED",
  FINISHED: "FINISHED",
  NOT_CONDUCTED: "NOT_CONDUCTED",
};
const liveClassLogInfo = {
  TEACHER_JOINED: "TEACHER_JOINED",
  TEACHER_DISCONNECTED: "TEACHER_DISCONNECTED",
  TEACHER_END_MEET: "TEACHER_END_MEET",
};

const liveClassTestQuestionLogInfo = {
  NEW_QUESTION_ADDED: "NEW_QUESTION_ADDED",
};
module.exports = {
  notificationType,
  classStatus,
  liveClassLogInfo,
  liveClassTestQuestionLogInfo,
};
