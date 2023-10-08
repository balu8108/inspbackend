const {
  SoloClassRoom,
  soloClassRoomFiles,
  SoloClassRoomRecording,
} = require("../../models");
const { uploadFilesToS3 } = require("../../utils/awsFunctions");




exports.createSoloClassRoom = async (req, res) => {
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
    const { subjectId,topicId, topic, agenda, description } = req.body;

    // Save solo lecture  information in the  SoloClassRoom model
    const soloclassroomlecture = await SoloClassRoom.create({
      subjectId,
      topicId,
      topic,
      mentorName: plainAuthData.name,
      agenda,
      description,
    });

    // Upload files to S3 or your desired storage
    const filesUploading = await uploadFilesToS3(
      addFilesInArray,
      "soloclassroomfiles"
    );

    // Create Files records for each uploaded file
    const soloLectureFiles = await Promise.all(
      filesUploading.map(async (file) => {
        const { key, url } = file;

        // Create a new sololectureFiles record
        const sololectureFile = await soloClassRoomFiles.create({
          key,
          url,
          isDownloadable: true,
          isShareable: true,
          soloClassRoomId: soloclassroomlecture.id, // Assign the assignment ID to the file
        });

        return sololectureFile;
      })
    );
    res.status(201).json({
      message: "Solo classroom created and files uploaded successfully",
      soloLectureFiles,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ error: "An error occurred while uploading files" });
  }
};



// this is the api for where mentor will record the lecture and stored in aws ..
exports.uploadSoloClassRoomRecordings = async (req, res) => {
  try {
    const { files } = req;
    // const { soloClassRoomId } = req.query; 

    if (!files?.files) {
      return res.status(400).json({ message: "No files were uploaded." });
    }

    let addFilesInArray = [];

    if (files) {
      addFilesInArray = Array.isArray(files?.files)
        ? files?.files
        : [files?.files];
    }

    // Upload files to S3 or your desired storage
    const filesUploading = await uploadFilesToS3(
      addFilesInArray,
      "soloclassroom-recordings"
    );

    // Create AssignmentFiles records for each uploaded file
    const solorecordings = await Promise.all(
      filesUploading.map(async (file) => {
        const { url } = file;

        // Create a new AssignmentFiles record
        const soloClassRoomFile = await SoloClassRoomRecording.create({
          url,
          soloClassRoomId:SoloClassRoom.id, // Set the soloClassRoomId to the one that was passed in the request query
        });

        return soloClassRoomFile;
      })
    );

    res.status(201).json({
      message: " files uploaded successfully",
      solorecordings,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ error: "An error occurred while uploading files" });
  }
};










exports.getTopicDetails = async (req, res) => {
  try {
    const { topic } = req.query;

    const assignments = await SoloClassRoom.findAll({
      where: { topic },
      attributes: ["description", "agenda"], // Include only 'description' and 'agenda' from SoloClassRoom
      include: [
        {
          model: soloClassRoomFiles,
          attributes: ["key", "url"], // Include only 'url' from soloClassRoomFiles
        },
        {
          model: SoloClassRoomRecording, // Include the SoloClassRoomRecording model
          attributes: ["url"], // Include only 'url' from SoloClassRoomRecording
        },
      ],
    });

    res.status(200).json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching assignments" });
  }
};


exports.getLatestSoloclassroom = async (req, res) => {
  try {
    // Fetch the latest two solo class room records
    const latestSoloClassRooms = await SoloClassRoom.findAll({
      order: [["createdAt", "DESC"]],
      limit: 2,
    });

    res.status(200).json({ data: latestSoloClassRooms });
  } catch (error) {
    console.error("Error fetching latest solo class rooms:", error);
    res.status(500).json({
      error: "An error occurred while fetching the latest solo class rooms",
    });
  }
};
