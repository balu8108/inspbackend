const { exec } = require("child_process");

function getGStreamerPIDs(parentProcessId) {
  try {
    return new Promise((resolve, reject) => {
      exec(`pgrep -P ${parentProcessId}`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        const pids = stdout
          .trim()
          .split("\n")
          .map((pid) => parseInt(pid));
        resolve(pids);
      });
    });
  } catch (err) {}
}
module.exports = getGStreamerPIDs;
