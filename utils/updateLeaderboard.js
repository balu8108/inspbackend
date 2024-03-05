const { leaderBoard } = require("../socketcontrollers/socketglobalvariables");
const { testQuestions } = require("../socketcontrollers/socketglobalvariables");
const { LeaderBoard } = require("../models");

// DB FUNCTION START
const createOrUpdateLeaderBoard = async (classPk, roomId, leaderBoardData) => {
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

const compareFrequencyCounts = (freqCount1, freqCount2) => {
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

const getFrequencyCount = (arr) => {
  const freqCount = new Map();

  for (const item of arr) {
    freqCount.set(item, (freqCount.get(item) || 0) + 1);
  }

  return freqCount;
};

const checkAnswerCorrectness = (correctAnswer, studentAnswer) => {
  if (correctAnswer.length !== studentAnswer.length) {
    return false;
  }
  const freqCount1 = getFrequencyCount(correctAnswer);
  const freqCount2 = getFrequencyCount(studentAnswer);
  return compareFrequencyCounts(freqCount1, freqCount2);
};

const checkIsAnswersCorrect = (roomId, response) => {
  if (!testQuestions[roomId]) {
    return false;
  } else {
    const roomQuestions = testQuestions[roomId];

    if (roomQuestions.length > 0) {
      const findQuestion = roomQuestions.find(
        (question) => question.questionId === response.questionId
      );
      if (findQuestion) {
        const isCorrectAns = checkAnswerCorrectness(
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
};

const updateLeaderboard = (classPk, roomId, peerDetails, response) => {
  if (!leaderBoard[roomId]) {
    leaderBoard[roomId] = {};
  }
  const isAnswersCorrect = checkIsAnswersCorrect(roomId, response);
  if (!leaderBoard[roomId][peerDetails.id]) {
    leaderBoard[roomId][peerDetails.id] = {
      peerDetails,
      correctAnswers: isAnswersCorrect ? 1 : 0,
      combinedResponseTime: response.responseTimeInSeconds,
    };

    // seed data to db
    createOrUpdateLeaderBoard(
      classPk,
      roomId,
      leaderBoard[roomId][peerDetails.id]
    );
  } else {
    leaderBoard[roomId][peerDetails.id].correctAnswers += isAnswersCorrect
      ? 1
      : 0;
    leaderBoard[roomId][peerDetails.id].combinedResponseTime +=
      response.responseTimeInSeconds;

    // seed data to db
    createOrUpdateLeaderBoard(
      classPk,
      roomId,
      leaderBoard[roomId][peerDetails.id]
    );
  }

  const roomLeaderBoard = leaderBoard[roomId];

  const sortedLeaderBoard = Object.values(roomLeaderBoard).sort((a, b) => {
    if (b.correctAnswers !== a.correctAnswers) {
      return b.correctAnswers - a.correctAnswers;
    }
    return a.combinedResponseTime - b.combinedResponseTime;
  });

  return sortedLeaderBoard;
};

module.exports = updateLeaderboard;
