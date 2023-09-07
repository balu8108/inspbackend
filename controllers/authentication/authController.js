const loginHandler = async (req, res) => {
  try {
    // we are expecting authData within request through middleware
    // if auth data present then we can assume a valid user otherwise send status as false
    const { authData } = req;
    const { secret_token } = req.params;
    if (!authData) {
      return res
        .status(400)
        .json({ status: false, data: "Invalid or No User" });
    }
    // res.cookie("secret_token", secret_token, { httpOnly: false }); // send http cookie to frontend for further communication
    return res
      .status(200)
      .json({ status: true, data: { authData, secret_token } });
  } catch (err) {
    return res
      .status(400)
      .json({ status: false, data: "Something went wrong" });
  }
};
module.exports = { loginHandler };
