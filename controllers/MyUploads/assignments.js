const { Assignment } = require("../../models");
const { uploadFilesToS3 } = require("../../utils/awsFunctions");
const { isObjectValid } = require("../../utils");
const { AssignmentFiles } = require("../../models");
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
      message: "Assignment created successfully and saved ",
      assignment,
    });
  } catch (error) {
    console.error("Error creating assignment:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the assignment" });
  }
};




exports.allAssignmentsWithFiles = async (req, res) => {
  try {
    const assignmentsWithFiles = await Assignment.findAll({
      include: AssignmentFiles, // Include associated AssignmentFiles
    });

    res.status(200).json(assignmentsWithFiles);
  } catch (error) {
    console.error('Error fetching assignments with files:', error);
    res.status(500).json({ error: 'An error occurred while fetching assignments with files' });
  }
};


// all assignments files for particular id 
exports.allAssignmentsbytopicid = async (req, res) => {
  try {
    const { topicId } = req.query; 

    const assignments = await Assignment.findAll({
      where: { topicId }, 
      include: [{ model: AssignmentFiles }], 
    });

    res.status(200).json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ error: "An error occurred while fetching assignments" });
  }
};



exports.deleteAssignment = async (req, res) => {
  try {
    const { id} = req.params;
    const assignment = await Assignment.findByPk(id);

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


// this is the controller  for student home page where  only 1 recent assignment will be show ..
exports.recentOneAssignments = async (req, res) => {
  try {
    const latestAssignments = await Assignment.findAll({
      order: [["createdAt", "DESC"]],
      limit: 1,
    });

    res.status(200).json({ data: latestAssignments });
  } catch (error) {
    console.error("Error fetching latest assignments:", error);
    res.status(500).json({
      error: "An error occurred while fetching the latest assignments",
    });
  }
};



// this is the controller where  assignement will be created.
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

    // Extract other data from the request
    const { plainAuthData } = req;
    console.log("AuthData", req.plainAuthData);
    const { topicName, topicId, description} = req.body;

    // Save assignment information in the Assignment model
    const assignment = await Assignment.create({
      topicName,
      topicId,
      description,
      instructorName: plainAuthData.name,
    });

    // Upload files to S3 or your desired storage
    const filesUploading = await uploadFilesToS3(addFilesInArray, "assignments");

    // Create AssignmentFiles records for each uploaded file
    const assignmentFiles = await Promise.all(
      filesUploading.map(async (file) => {
        const { key, url } = file;

        // Create a new AssignmentFiles record
        const assignmentFile = await AssignmentFiles.create({
          key,
          url,
          isDownloadable: true,
          isShareable: true,
          assignmentId: assignment.id, // Assign the assignment ID to the file
        });

        return assignmentFile;
      })
    );

    res.status(201).json({
      message: "Assignment and files uploaded successfully",
      assignmentFiles,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ error: "An error occurred while uploading files" });
  }
};

