const validateCreationOfLiveClass = (data) => {
  return (
    data.chapter &&
    data.topic &&
    data.scheduledDate &&
    data.scheduledStartTime &&
    data.scheduledEndTime &&
    data.agenda &&
    data.description &&
    data.subjectId
  );
};
module.exports = {
  validateCreationOfLiveClass,
};
