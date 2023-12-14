const {
  SoloClassRoom,
  SoloClassRoomFiles,
  SoloClassRoomRecording,
} = require("../../models");
const {
  uploadFilesToS3,
  generatePresignedUrls,
} = require("../../utils/awsFunctions");

exports.createSoloClassRoom = async (req, res) => {
  try {
    const { files } = req;

    let addFilesInArray = [];

    if (files) {
      addFilesInArray = Array.isArray(files?.files)
        ? files?.files
        : [files?.files];
    }

    // Extract other data from the request
    const { plainAuthData } = req;

    const { subjectId, topicId, topic, agenda, description } = req.body;

    // Save solo lecture  information in the  SoloClassRoom model
    const soloclassroomlecture = await SoloClassRoom.create({
      subjectId: subjectId,
      topicId: topicId,
      topic: topic,
      mentorName: plainAuthData.name,
      agenda: agenda,
      description: description,
    });

    const soloClassRoomId = soloclassroomlecture.id;
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
        const sololectureFile = await SoloClassRoomFiles.create({
          key: key,
          url: url,
          isDownloadable: true,
          isShareable: true,
          soloClassRoomId: soloclassroomlecture.id,
        });

        return sololectureFile;
      })
    );
    res.status(201).json({
      message: "Solo classroom created and files uploaded successfully",
      soloLectureFiles,
      soloClassRoomId,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// this is the api for where mentor will record the lecture and stored in aws ..

exports.uploadSoloClassRoomRecordings = async (req, res) => {
  try {
    const { files } = req;
    const { soloClassRoomId } = req.params;
    console.log("record files", files);

    if (!files?.files) {
      return res.status(400).json({ message: "No files were uploaded." });
    }

    let addFilesInArray = [];

    if (files) {
      addFilesInArray = Array.isArray(files?.files)
        ? files?.files
        : [files?.files];
    }
    console.log("fies in array", addFilesInArray);

    // Upload files to S3 or your desired storage
    const filesUploading = await uploadFilesToS3(
      addFilesInArray,
      "soloclassroom-recordings"
    );
    console.log("file uploaded?", filesUploading);

    // Create  records for each uploaded file
    const solorecordings = await Promise.all(
      filesUploading.map(async (file) => {
        const { key, url } = file;

        // Create a new solo lecture record
        const soloClassRoomFile = await SoloClassRoomRecording.create({
          key: key,
          url: url,
          soloClassRoomId: soloClassRoomId,
        });

        return soloClassRoomFile;
      })
    );
    console.log("solo recordings", solorecordings);

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
    const { topicId } = req.params;

    const soloClassroomDetails = await SoloClassRoom.findAll({
      where: { topicId },
      attributes: ["description", "agenda"],
      include: [
        {
          model: SoloClassRoomFiles,
        },
        {
          model: SoloClassRoomRecording,
        },
      ],
    });

    if (soloClassroomDetails.length === 0) {
      res.status(201).json({ message: "No data available for this topic" });
    } else {
      res.status(200).json(soloClassroomDetails);
    }
  } catch (error) {
    console.error("Error fetching details:", error);
    res.status(500).json({ error: "An error occurred while fetching details" });
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

// this is the api for  getting desc, agenda , files --- for soloclassroomid
exports.getSoloClassroomDetails = async (req, res) => {
  try {
    const { soloClassRoomId } = req.params;

    // Use Sequelize to query the 'soloclassrooms' table to retrieve topic, description, and agenda.
    const soloClassroomDetails = await SoloClassRoom.findByPk(soloClassRoomId);

    if (!soloClassroomDetails) {
      return res.status(404).json({ error: "Solo classroom not found" });
    }

    // Use Sequelize to query the 'soloclassroomfiles' table to retrieve related files.
    const soloClassRoomFile = await SoloClassRoomFiles.findAll({
      where: { soloClassRoomId: soloClassRoomId },
    });

    // Combine the data into a single JSON response.
    const response = {
      soloClassroomDetails,
      soloClassRoomFile,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching solo classroom details:", error);
    res.status(500).json({
      error: "An error occurred while fetching solo classroom details",
    });
  }
};

exports.generateGetSoloLecturePresignedUrl = async (req, res) => {
  try {
    const { s3_key } = req.body;

    if (!s3_key) {
      throw new Error("s3 url is required");
    }
    const presignedUrls = await generatePresignedUrls(s3_key);
    return res
      .status(200)
      .json({ status: true, data: { getUrl: presignedUrls } });
  } catch (err) {
    return res.status(400).json({ status: false, data: err.message });
  }
};

exports.openSoloLetureFile = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "File id is required" });
  }
  // All files uploaded to S3 so we need to generate presigned urls
  try {
    const file = await SoloClassRoomRecording.findOne({ where: { id: id } });
    if (!file) {
      throw new Error("No file found with this id");
    } else {
      const presignedUrls = await generatePresignedUrls(file.key);
      return res
        .status(200)
        .json({ status: true, data: { getUrl: presignedUrls } });
    }
  } catch (err) {
    return res.status(400).json({ status: false, data: err.message });
  }
};
