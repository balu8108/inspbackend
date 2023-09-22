const Sequelize = require("sequelize");
const { Op } = Sequelize;
const { LiveClassRoom, LiveClassLog } = require("../models");
const { classStatus, liveClassLogInfo } = require("../constants");
const { rooms } = require("../socketcontrollers/socketglobalvariables");
const { isObjectValid } = require("../utils");
const moment = require("moment-timezone");

// IN below function we are using this logic
// -> Get all the scheduled classes of all below categories
// -> On Getting these classes determine
//    NOT_STARTED:-
//    1 - if the class is not started even after 10 minutes after scheduled Start Time then change status to Not_started

//    FINISHED:-
//    1 - Either Teacher End the class then change status to FINISHED
//    2 - If teacher forgets to end class and just closed the tab then two thing we can take
//    3 - if scheduled end time is passed and there is no teacher in the rooms (because can be possible the room is still there as some of the students are there but teacher is not there after end time  ) and there is atleast one entity of class joined by teacher in logs then we can assume that indeed the class conducted and mark it as FINISHED after time lapsed.

//    NOT_CONDUCTED:-
//    1 - If no logs found

const findLiveClassLog = async (element, logInfoType) => {
  try {
    const liveClassLogs = await LiveClassLog.findAndCountAll({
      where: {
        classRoomId: element.id,
        logInfo: logInfoType,
      },
    });
    return liveClassLogs;
  } catch (err) {
    console.log("Error in find live class log", err);
  }
};

const checkRoom = async (element) => {
  // this check if there is an active room with a teacher in the class room
  try {
    const room = rooms[element?.roomId];
    if (isObjectValid(room)) {
      room?.peers?.forEach((peer) => {
        if (peer?.isTeacher) {
          return { isRoomFound: true, isTeacherFound: true };
        }
      });
      return { isRoomFound: true, isTeacherFound: false };
    } else {
      return { isRoomFound: false, isTeacherFound: false };
    }
  } catch (err) {
    console.log("Error in check room", err);
  }
};

const changeClassStatus = async (element, currentTime) => {
  try {
    const scheduledStartTimeMoment = moment(
      element.scheduledStartTime,
      "HH:mm:ss"
    );
    const scheduledEndTimeMoment = moment(element.scheduledEndTime, "HH:mm:ss");

    const scheduledEndTime = scheduledEndTimeMoment.format("HH:mm:ss");
    const scheduledStartTimeAfterTenMinutes = scheduledStartTimeMoment
      .add(10, "minutes")
      .format("HH:mm:ss");

    if (currentTime >= scheduledEndTime) {
      // check logs if teacher not joined and already time has passed then we can conclude that class is not conducted
      const liveClassLogs = await findLiveClassLog(
        element,
        liveClassLogInfo.TEACHER_JOINED
      );
      if (liveClassLogs?.count === 0) {
        element.classStatus = classStatus.NOT_CONDUCTED;
        await element.save();
      }

      // For finished first we need to check there is no room along with a teacher in there at the moment as there can be a possibility teh class stretches to 10-15 minutes then we don't want tp change status till teacher is there
      const { isRoomFound, isTeacherFound } = await checkRoom(element);
      // If room and teacher not found in socket rooms then check logs and status change to finished if teacher joined the class previously as per logs record
      // if room and teacher found then don't change status , let it be ONGOING, once teacher end/leave class the next cron job will update the status
      if (!isRoomFound || (isRoomFound && !isTeacherFound)) {
        const liveClassLogs = await findLiveClassLog(
          element,
          liveClassLogInfo?.TEACHER_JOINED
        );

        if (liveClassLogs?.count > 0) {
          element.classStatus = classStatus.FINISHED;
          await element.save();
        }
      }
    } else if (
      currentTime >= scheduledStartTimeAfterTenMinutes &&
      currentTime <= scheduledEndTime
    ) {
      const liveClassLogs = await findLiveClassLog(
        element,
        liveClassLogInfo.TEACHER_JOINED
      );

      if (liveClassLogs?.count === 0) {
        element.classStatus = classStatus.NOT_STARTED;
        await element.save();
      }
    }
  } catch (err) {
    console.log("Error in class status change scheduler", err);
  }
};
const classStatusChange = async () => {
  try {
    const asof = moment();

    const currentTime = asof.format("HH:mm:ss");
    //  Get scheduled classes but if current date === scheduled Date and current time >=scheduledStartTime+10
    const scheduledClasses = await LiveClassRoom.findAll({
      where: {
        classStatus: {
          [Op.or]: [
            classStatus.SCHEDULED,
            classStatus.ONGOING,
            classStatus.NOT_STARTED,
          ],
        },
      },
    });
    console.log("scheduledClasses", scheduledClasses);
    scheduledClasses.forEach((element) =>
      changeClassStatus(element, currentTime)
    );
  } catch (err) {
    console.log("Error in class status change scheduler", err);
  }
};

module.exports = classStatusChange;
