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
module.exports = {
  validateCreationOfLiveClass,
};
