const validateCreationOfLiveClass = (data) => {
  return (
    data.chapter &&
    data.topic &&
    data.scheduledDate &&
    data.scheduledStartTime &&
    data.scheduledEndTime &&
    data.agenda &&
    data.description
  );
};

const validateCreateFeedBack = (data) => {
  return data.topicId && data.rating && data.feedback;
};
module.exports = {
  validateCreationOfLiveClass,
  validateCreateFeedBack,
};
