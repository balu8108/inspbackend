const routesConstants = Object.freeze({
  SCHEDULE_LIVE_CLASS: "/schedule-live-class",
  CREATE_LIVE_CLASS: "/create",
  GET_ALL_LIVE_CLASSES: "/get-all",
  GET_LIVE_CLASS_DETAILS: "/get-details",
  GET_UPCOMING_CLASS: "/get-upcoming-class",
  GENERIC_API: "/generic",
  GET_ALL_SUBJECTS: "/get-all-subjects",
  GENERATE_GET_PRESIGNED_URL: "/generate-get-presigned-url",
  CREATE_FEEDBACK: "/create-feedback",
  LATEST_FEEDBACK: "/latest-feedback",
  LATEST_COMPLETEDCLASSROOM: "/latest-completed-live-classroom",
  TOPIC_FEEDBACK_RATING_DETAILS: "/topic-feedback-rating-details",
  OPEN_FILE: "/open-file",
  IMAGE_TO_DOC: "/image-to-doc",
  CREATE_LIVE_CLASS_NOTES: "/create-live-class-notes",
  SOLO: "/solo-lecture",
  SOLO_CLASSROOM: "/create-room",
  LATEST_CLASSROOM: "/latest-room",
  SOLO_CLASSROOM_RECORDINGS: "/solo-classroom-recording",
  SOLO_TOPIC_DETAILS_FILES_RECORDINGS: "/get-topic-details",
  SOLO_CLASSROOM_PRESIGNED_URL: "/generate-url",
  SOLOCLASSROOM_FILES: "/open-file/solo-files",
  SOLOCLASSROOM_DETAILS: "/get-details-data-for-class",
  TOPIC_ASSIGNMENTS: "/assignment",
  CREATE_ASSIGNMENT: "/create",
  GET_ASSIGNMENT_TOPIC_ID: "/get-all-assignments-topic-id",
  DELETE_ASSIGNMENT: "/delete-assignment",
  LATEST_ASSIGNMENT: "/latest-assignment",
  RECENT_ONE_ASSIGNMENT: "/recent-assignment", // for student home page.
  ALL_ASSIGNMENT_WITH_FILES: "/all-assignment-with-files",
  UPLOAD_ASSIGNMENT: "/upload-assignments",
  GET_ASSIGNMENTS_BY_SUBJECTS: "/get-assignment-by-subject-id",
  GET_ASSIGNMENT_BY_SUBJECTNAME: "/get-assignment-by-subject-name",
  AUTH: "/auth",
  LOGIN: "/login",
  LOGIN_WITH_IP: "/login_with_ip",
  RECORDING: "/recording",
  ALL_LIVE_RECORDINGS: "/all-live-recordings",
  GET_SINGLE_RECORDING: "/get-single-recording",
  GET_RECORDING_BY_TOPIC_ONLY: "/get-recording-by-topic", // This is for INSP external website not for video portal at the moment
  UPDATE_RECORDING_DATA: "/update-recording-data",
  VIEW_RECORDING: "/view-recording",
  PLAY_RECORDING: "/play-recording",
  GET_LECTURE_NO: "/get-lecture-no",
  CRASH_COURSE: "/crash-course",
  GET_ALL_CRASH_COURSE_LECTURE: "/get-all-lecture",
  GET_LECTURE_BY_ID: "/get-lecture-by-id/:roomId",
  STUDENT_FEEDBACK:'/student-feedback',
  CREATE_STUDENT_FEEDBACK: "/create-student-feedback",
  GET_ALL_STUDENT_FEEDBACK: "/get-all-student-feedback",
  DELETE_STUDENT_FEEDBACK: "/delete-student-feedback/:id",
});

module.exports = routesConstants;
