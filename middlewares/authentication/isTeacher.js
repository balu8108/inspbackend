const { encryptData } = require("../../utils");
const isTeacher = async (req, res, next) => {
  const { authData } = req;
  if (!authData) {
    return res.status(400).json({ status: false, data: "No data found..." });
  }
  const { user_type } = authData;
  if (user_type === 1) {
    // Means a teacher or paid student
    req.authData = await encryptData(authData);
    next();
  } else {
    return res
      .status(400)
      .json({ status: false, data: "Not allowed to access these resources" });
  }
};
module.exports = isTeacher;
