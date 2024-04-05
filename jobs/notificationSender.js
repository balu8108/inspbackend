const { LiveClassRoom, LiveClassNotificationStatus } = require("../models");
const { notificationType } = require("../constants");
const { sendEmail } = require("../services");
const { fetchAllStudentsFromInspApi } = require("../utils");
const moment = require("moment-timezone");
// Set default timezone
moment.tz.setDefault("Asia/Kolkata");

const sendNotification = async (item) => {
  try {
    // need to check type of notification
    // If Email then send only email
    // If SMS then send only SMS
    // If EMAIL+SMS then send both
    if (item.notificationType === notificationType.EMAIL) {
      // send entire notification db instance
      sendEmail(item);
    } else if (item.notificationType === notificationType.SMS) {
    } else if (item.notificationType === notificationType.EMAIL_AND_SMS) {
      sendEmail(item);
    }
  } catch (err) {
    console.log("Error in sending notification", err);
  }
};

const notificationSender = async () => {
  try {
    const currentTime = moment().format("YYYY-MM-DDTHH:mm:ssZ");
    const notificationsObj = await LiveClassNotificationStatus.findAll({
      where: {
        liveClassNotificationStatus: "PENDING",
        notificationSendingTime: currentTime,
      },
      include: [{ model: LiveClassRoom }],
    });

    console.log(JSON.stringify(notificationsObj));
    [
      {
        id: 2,
        liveClassNotificationStatus: "PENDING",
        classRoomId: 10,
        notificationType: "EMAIL+SMS",
        notificationSubject: "Meeting Reminder",
        notificationSendingTime: "2024-04-04T23:51:00+05:30",
        createdAt: "2024-04-04T17:45:31.000Z",
        updatedAt: "2024-04-04T23:50:07.000Z",
        LiveClassRoom: {
          id: 10,
          roomId: "zIyw72CwOW",
          scheduledDate: "2024-04-05T00:00:00.000Z",
          scheduledStartTime: "00:02:00",
          scheduledEndTime: "03:00:00",
          mentorId: "1",
          mentorName: "santosh",
          mentorEmail: "santoshkumarfwds@gmail.com",
          mentorMobile: "7799238136",
          muteAllStudents: true,
          blockStudentsCamera: false,
          subjectId: "1",
          subjectName: "PHYSICS",
          classStatus: "SCHEDULED",
          classType: "CRASHCOURSE",
          classLevel: "Class_12",
          createdAt: "2024-04-04T17:45:31.000Z",
          updatedAt: "2024-04-04T17:45:31.000Z",
        },
      },
    ];
    if (notificationsObj && notificationsObj.length > 0) {
      const fetchNotfRecUsers = await fetchAllStudentsFromInspApi();
      const filterUser = fetchNotfRecUsers.filter(
        (user) => user?.present_class === "12"
      );
      filterUser.forEach(sendNotification);
    }
  } catch (err) {
    console.log("Error in notification sender", err);
  }
};
module.exports = notificationSender;
