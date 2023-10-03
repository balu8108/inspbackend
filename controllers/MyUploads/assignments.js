const { Assignment } = require("../../models");
const { uploadFilesToS3 } = require("../../utils/awsFunctions");
const { isObjectValid } = require("../../utils");
exports.createAssignment = async (req, res) => {
  try {
    const { topicName, instructorName, description } = req.body;
    console.log("topicname",topicName)
    const assignment = await Assignment.create({
      topicName: topicName,
      instructorName: instructorName,
      description: description,
      key:"sample.txt",
      url:"sample.txt"
    });
    console.log("assignment",assignment)
    res.status(201).json({
      message: "Assignment created successfully",
      assignment,
    });
  } catch (error) {
    console.error("Error creating assignment:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the assignment" });
  }
};

exports.allAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.findAll();

    // Respond with the list of assignments
    res.status(200).json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching assignments" });
  }
};
exports.deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params; // Assuming you have a route parameter for the assignment ID

    // Find the assignment by ID
    const assignment = await Assignment.findByPk(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Delete the assignment
    await assignment.destroy();

    // Respond with a success message
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting assignment:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the assignment" });
  }
};
exports.latestAssignments = async (req, res) => {
  try {
    // Fetch the latest four assignment records
    const latestAssignments = await Assignment.findAll({
      order: [["createdAt", "DESC"]],
      limit: 4,
    });

    res.status(200).json({ data: latestAssignments });
  } catch (error) {
    console.error("Error fetching latest assignments:", error);
    res.status(500).json({
      error: "An error occurred while fetching the latest assignments",
    });
  }
};

exports.uploadAssignment = async (req, res) => {
  try {
    const { files } = req;

    if (!files?.files) {
      return res.status(400).json({ message: "No files were uploaded." });
    }
    let addFilesInArray = [];

    if (files) {
      addFilesInArray = Array.isArray(files?.files)
        ? files?.files
        : [files?.files];
    }

    //   for (const key of Object.keys(files)) {
    //     const file = files[key];
    //     const folderPath = 'assignments';
    //     const fileName = file.name;

    //     await uploadFilesToS3(folderPath, fileName, file.data);
    //   }
    const filesUploading = await uploadFilesToS3(
      addFilesInArray,
      "assignments"
    );
    console.log("Files",filesUploading);
    res.status(201).json({ message: "Files uploaded successfully" });
   
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ error: "An error occurred while uploading files" });
  }
};
