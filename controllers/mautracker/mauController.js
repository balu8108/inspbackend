const { MauTracker } = require("../../models");

const createMauTracker = async (req, res) => {
  try {
    const { studentId, studentName, deviceId, deviceName, browserName } =
      req.body;

    if (!studentId || !deviceId || !browserName)
      return res.status(400).json({ error: "details is required" });

    const isMauUserActive = await MauTracker.findOne({
      where: {
        studentId: studentId,
        deviceId: deviceId,
        browserName: browserName,
      },
    });

    if (isMauUserActive)
      return res.status(400).json({ error: "User Already exist" });

    const mautracker = await MauTracker.create({
      studentId: studentId,
      studentName: studentName,
      deviceId: deviceId,
      deviceName: deviceName,
      browserName: browserName,
    });

    return res.status(200).json({
      message: "MAU tracker created",
      data: {
        mautracker,
      },
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

module.exports = {
  createMauTracker,
};
