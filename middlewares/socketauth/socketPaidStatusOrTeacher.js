const socketPaidStatusOrTeacher = async (socket, next) => {
  try {
    const { authData } = socket;
    if (!authData) {
      const err = new Error("Not Authorized or not a valid user");
      next(err);
    }

    const { paid_status, user_type } = authData;
    if (user_type === 1 || paid_status === 1) {
      // Means a teacher or paid student

      next();
    } else {
      const err = new Error("Not allowed to access these resources");
      next(err);
    }
  } catch (err) {
    console.log("Error in Authentication", err);
    next(err);
  }
};

module.exports = socketPaidStatusOrTeacher;
