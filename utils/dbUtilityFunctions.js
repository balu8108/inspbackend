const { Rating, LiveClassRoom, LiveClassRoomDetail } = require("../models");
const isObjectValid = require("./objectValidation");
// The below function is to check whether the feedback is provided by the student or not
const isFeedbackProvided = async (peerDetails, roomId) => {
  try {
    if (!isObjectValid(peerDetails) || !roomId) {
      throw new Error("Peer details or roomId is not provided");
    }
    const liveClassRoom = await LiveClassRoom.findOne({
      where: { roomId: roomId },
      include: [LiveClassRoomDetail],
    });
    console.log("peerdetials", peerDetails?.id);
    console.log("topicid", liveClassRoom?.LiveClassRoomDetail?.topicId);

    const isFeedbackExists = await Rating.findOne({
      where: {
        raterId: peerDetails?.id,
        topicId: liveClassRoom?.LiveClassRoomDetail?.topicId,
      },
    });
    console.log("is feedback exist", isFeedbackExists);
    if (!isFeedbackExists) {
      return {
        success: true,
        isFeedback: false,
        feedBackTopicId: liveClassRoom?.LiveClassRoomDetail?.topicId,
      };
    } else {
      return { success: true, isFeedback: true };
    }
  } catch (err) {
    console.log("Error in isFeedbackProvided function", err);
    return { success: false, isFeedback: false };
  }
};

module.exports = { isFeedbackProvided };
