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

const validateUpdateScheduleLiveClass = (data) => {
  return (
    data.classId &&
    data.chapter &&
    data.topic &&
    data.subject &&
    data.agenda &&
    data.classType &&
    data.classLevel &&
    data.description &&
    data.scheduledDate &&
    data.scheduledStartTime &&
    data.scheduledEndTime
  );
};

const validateCreateFeedBack = (data) => {
  return data.topicId && data.rating && data.feedback;
};
module.exports = {
  validateCreationOfLiveClass,
  validateCreateFeedBack,
  validateUpdateScheduleLiveClass,
};
