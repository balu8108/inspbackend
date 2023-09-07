const { Op, Sequelize } = require("sequelize");
const {
  LiveClassRoom,
  Notification,
  LiveClassNotificationStatus,
} = require("../models");
const tempUsers = require("../tempUsers/tempUsers");
const upcomingLiveClass = async () => {
  try {
    // Get all upcoming live classes that has 15 minutes left to start
    const today = new Date();
    const currentDate = Sequelize.literal("CURRENT_DATE");
    const fifteenMinutesFromNow = new Date(today);
    fifteenMinutesFromNow.setMinutes(fifteenMinutesFromNow.getMinutes() + 30);
    const currentTime = today.toTimeString().slice(0, 8);
    const fifteenMinutesFromNowTime = fifteenMinutesFromNow
      .toTimeString()
      .slice(0, 8);

    const getTodaysUpcomingClass = await LiveClassRoom.findAll({
      where: {
        scheduledDate: {
          [Op.eq]: currentDate,
        },
        scheduledStartTime: {
          [Op.gte]: currentTime,
          [Op.lte]: fifteenMinutesFromNowTime,
        },
      },
    });
    const convertedFormat = JSON.parse(
      JSON.stringify(getTodaysUpcomingClass, null, 2)
    );
    const notificationReceivers = tempUsers.map((user) => {
      return {
        notificationReceiverName: user.name,
        notificationReceiverEmail: user.email,
        notificationReceiverMobile: user.mobile,
      };
    });
    console.log(convertedFormat);

    convertedFormat.forEach(async (liveClass) => {
      // check if for this class theere is already a notification object in notfication status
      const isNotificationAlreadyScheduled =
        await LiveClassNotificationStatus.findOne({
          where: { classRoomId: liveClass.id },
        });
      // if not then create and create individual notification
      if (!isNotificationAlreadyScheduled) {
        const createLiveClassNotfStatus =
          await LiveClassNotificationStatus.create({
            classRoomId: liveClass.id,
          });
        if (createLiveClassNotfStatus) {
          Notification.bulkCreate(notificationReceivers)
            .then((res) => console.log("created notification...", res))
            .catch((err) => console.log("Err in creating notification object"));
        }
        createLiveClassNotfStatus.liveClassNotificationStatus = "SENT";
      }
    });
  } catch (err) {
    console.log("Error in upcoming class scheduler");
  }
};
module.exports = upcomingLiveClass;
