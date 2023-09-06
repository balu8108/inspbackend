const checkPaidStatusOrTeacher = async (req, res, next) => {
  const { authData } = req;
  if (!authData) {
    return res.status(400).json({ status: false, data: "No data found..." });
  }
  const { paid_status, user_type } = authData;
  if (user_type === 1) {
    // Means a teacher
    next();
  } else if (paid_status === 1) {
    // Means a student and paid
    next();
  } else {
    return res
      .status(400)
      .json({ status: false, data: "Not allowed to access these resources" });
  }
};
module.exports = checkPaidStatusOrTeacher;
