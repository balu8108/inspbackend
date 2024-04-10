const {
  LiveClassRoom,
  LiveClassRoomDetail,
  LiveClassNotificationStatus,
} = require("../models");
const {
  notificationType,
  classTypeTypes,
  classLevelType,
} = require("../constants");
const { sendEmail } = require("../services");
const { fetchAllStudentsFromInspApi } = require("../utils");
const moment = require("moment-timezone");
const { Op, Sequelize } = require("sequelize");
// Set default timezone
moment.tz.setDefault("Asia/Kolkata");

const notificationSender = async () => {
  try {
    const currentTime = moment().format("YYYY-MM-DDTHH:mm:ssZ");
    const notificationsObj = await LiveClassNotificationStatus.findAll({
      where: {
        liveClassNotificationStatus: "PENDING",
        notificationSendingTime: currentTime,
      },
      include: [
        {
          model: LiveClassRoom,
          include: [
            {
              model: LiveClassRoomDetail,
              attributes: ["topicname"],
            },
          ],
        },
      ],
    });

    if (notificationsObj && notificationsObj.length > 0) {
      const fetchNotfRecUsersMap = new Map(); // Map to store fetchNotfRecUsers by classLevel
      fetchNotfRecUsersMap.set(classTypeTypes.CRASHCOURSE, []);
      fetchNotfRecUsersMap.set(classLevelType.Class_11, []);
      fetchNotfRecUsersMap.set(classLevelType.Class_12, []);
      fetchNotfRecUsersMap.set(classLevelType.Foundation_Olympiad, []);

      // Batch fetching fetchNotfRecUsers based on classLevel
      for (const notification of notificationsObj) {
        if (
          notification?.LiveClassRoom?.classType === classTypeTypes.REGULARCLASS
        ) {
          const classLevel = notification?.LiveClassRoom?.classLevel;
          if (fetchNotfRecUsersMap.has(classLevel)) {
            const presentClass = getClassLevelString(classLevel);
            const selectedClassStudents = await fetchAllStudentsFromInspApi(
              presentClass
            );
            fetchNotfRecUsersMap.get(classLevel).push(...selectedClassStudents);
          }
        }
        if (
          notification?.LiveClassRoom?.classType === classTypeTypes.CRASHCOURSE
        ) {
          if (fetchNotfRecUsersMap.has(classTypeTypes.CRASHCOURSE)) {
            const presentClass = getClassLevelString(
              classTypeTypes.CRASHCOURSE
            );
            const selectedClassStudents = await fetchAllStudentsFromInspApi(
              presentClass
            );
            if (selectedClassStudents) {
              const filterCrashStudent = selectedClassStudents.filter(
                (item) => item.crash_course === 1
              );
              fetchNotfRecUsersMap
                .get(classTypeTypes.CRASHCOURSE)
                .push(...filterCrashStudent);
            }
          }
        }
      }

      // Sending notifications
      for (const notification of notificationsObj) {
        if (notification.notificationType === notificationType.EMAIL_AND_SMS) {
          if (
            notification?.LiveClassRoom?.classType ===
            classTypeTypes.REGULARCLASS
          ) {
            const classLevel = notification?.LiveClassRoom?.classLevel;
            const fetchNotfRecUsers = fetchNotfRecUsersMap.get(classLevel);
            if (fetchNotfRecUsers && fetchNotfRecUsers.length > 0) {
              for (const user of fetchNotfRecUsers) {
                const item = {
                  receivername: user?.name,
                  receiverEmail: user?.email,
                  subjectName:
                    notification?.LiveClassRoom?.LiveClassRoomDetail?.dataValues
                      ?.topicname,
                };
                sendEmail(item);
              }
            }
          }
          if (
            notification?.LiveClassRoom?.classType ===
            classTypeTypes.CRASHCOURSE
          ) {
            const fetchNotfRecUsers = fetchNotfRecUsersMap.get(
              classTypeTypes.CRASHCOURSE
            );
            if (fetchNotfRecUsers && fetchNotfRecUsers.length > 0) {
              for (const user of fetchNotfRecUsers) {
                const item = {
                  receivername: user?.name,
                  receiverEmail: user?.email,
                  subjectName:
                    notification?.LiveClassRoom?.LiveClassRoomDetail?.dataValues
                      ?.topicname,
                };
                sendEmail(item);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.log("Error in notification sender", err);
  }
};

// Helper function to convert classLevel to string
function getClassLevelString(classLevel) {
  switch (classLevel) {
    case classLevelType.Class_11:
      return "11";
    case classLevelType.Class_12:
      return "12";
    case classLevelType.Foundation_Olympiad:
      return "9,10";
    case classTypeTypes.CRASHCOURSE:
      return "11,12,13";
    default:
      return "";
  }
}

module.exports = notificationSender;
