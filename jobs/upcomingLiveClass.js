const { Op, Sequelize } = require("sequelize");
const {
  LiveClassRoom,
  LiveClassRoomDetail,
  Notification,
  LiveClassNotificationStatus,
} = require("../models");
const tempUsers = require("../tempUsers/tempUsers");
const { dbObjectConverter } = require("../utils");
const { notificationType } = require("../constants");
const {
  generateNotificationText,
  NOTF_TEMPLATE_NAME,
} = require("../notificationstext");

const createNotificationObjects = async (item, notificationReceivers) => {
  try {
    const isNotificationAlreadyScheduled =
      await LiveClassNotificationStatus.findOne({
        where: { classRoomId: item.id },
      });
    // if not then create and create individual notification
    if (!isNotificationAlreadyScheduled) {
      const createLiveClassNotfStatus =
        await LiveClassNotificationStatus.create({
          classRoomId: item.id,
        });
      if (createLiveClassNotfStatus) {
        Notification.bulkCreate(notificationReceivers)
          .then((res) => console.log("created notification...", res))
          .catch((err) => console.log("Err in creating notification object"));
      }
      createLiveClassNotfStatus.liveClassNotificationStatus = "SENT";
      createLiveClassNotfStatus.save();
    }
  } catch (err) {
    console.log("Error in creating notification objects", err);
  }
};
const upcomingLiveClass = async () => {
  try {
    // Get all upcoming live classes that has 15 minutes left to start
    const today = new Date();
    const currentDate = Sequelize.literal("CURRENT_DATE");
    const fifteenMinutesFromNow = new Date(today);
    fifteenMinutesFromNow.setMinutes(fifteenMinutesFromNow.getMinutes() + 15);
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
      include: { model: LiveClassRoomDetail },
    });

    const convertedDbObjects = dbObjectConverter(getTodaysUpcomingClass);

    console.log(convertedDbObjects);

    convertedDbObjects.forEach((item) => {
      // Todo later on Optimize this code as it is like O(n^2)
      const notificationReceivers = tempUsers.map((user) => {
        const { emailText, smsText } = generateNotificationText(
          notificationType.EMAIL_AND_SMS,
          NOTF_TEMPLATE_NAME.UPCOMING_LIVE_CLASS,
          [user.name, item.LiveClassRoomDetail.topicName]
        );

        return {
          notificationReceiverName: user.name,
          notificationReceiverEmail: user.email,
          notificationReceiverMobile: user.mobile,
          notificationEmailText: emailText,
          notificationSMSText: smsText,
          notificationSubject: "Meeting Reminder",
          notificationMetaInfo: JSON.stringify({ RoomId: item.roomId }),
        };
      });
      createNotificationObjects(item, notificationReceivers);
    });
  } catch (err) {
    console.log("Error in upcoming class scheduler");
  }
};
module.exports = upcomingLiveClass;
