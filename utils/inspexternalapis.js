const { externalApiEndpoints } = require("../constants");
const { INSP_EXTERNAL_WEBSITE_SECRET_KEY } = require("../envvar");
const fetchAllStudentsFromInspApi = async (presentClass) => {
  try {
    const body = {
      secret_key: INSP_EXTERNAL_WEBSITE_SECRET_KEY,
      present_class: presentClass,
    };
    const requestOptions = {
      method: "POST",
      body: JSON.stringify(body),
    };
    const response = await fetch(
      externalApiEndpoints.allStudentNotification,
      requestOptions
    );
    const data = await response.json();
    if (data.status) {
      return data.result;
    }
  } catch (err) {
    console.log("Error in fetching students", err);
    throw new Error("Something went wrong!!");
  }
};

module.exports = { fetchAllStudentsFromInspApi };
