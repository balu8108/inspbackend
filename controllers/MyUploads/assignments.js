const { Assignment } = require("../../models");
const { uploadFilesToS3 } = require("../../utils/awsFunctions");
const { isObjectValid } = require("../../utils");
exports.createAssignment = async (req, res) => {
  try {
    const { topicName, instructorName, description, key, url } = req.body;
    const assignment = await Assignment.create({
      topicName: topicName,
      instructorName: instructorName,
      description: description,
      key: key,
      url: url,
    });
    console.log("assignment", assignment);
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
    const { assignmentId } = req.params; 
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

    const latestAssignments = await Assignment.findAll({
      order: [["createdAt", "DESC"]],
      limit: 2,
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

    const filesUploading = await uploadFilesToS3(
      addFilesInArray,
      "assignments"
    );
    console.log("Files", filesUploading);
    res
      .status(201)
      .json({
        message: "Files uploaded successfully",
        fileKey: filesUploading.key,
        fileUrl: filesUploading.url,
      });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ error: "An error occurred while uploading files" });
  }
};
