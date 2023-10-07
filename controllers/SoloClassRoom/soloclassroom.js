const { SoloClassRoom,soloClassRoomFiles } = require("../../models");
const { uploadFilesToS3 } = require("../../utils/awsFunctions");

// exports.createSoloClassRoom11 = async (req, res) => {
//   try {
//     const { selectedSubject, topic, agenda, description } = req.body;
//     const { plainAuthData } = req;
//     console.log("AuthData", req.plainAuthData);
//     const createsoloroom = await SoloClassRoom.create({
//       subjectId: selectedSubject,
//       topic: topic,
//       agenda: agenda,
//       mentorName: plainAuthData.name,
//       description: description,
//     });
//     res.status(201).json({
//       message: "Solo-classroom created  successfully",
//       data: createsoloroom,
//     });
//   } catch (error) {
//     console.error("Error creating the solo-classroom record:", error);
//     res
//       .status(500)
//       .json({ error: "An error occurred while  creating  the solo-classroom" });
//   }
// };
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
    const { subjectId,topic, agenda, description} = req.body;

    // Save solo lecture  information in the  SoloClassRoom model
    const soloclassroomlecture = await SoloClassRoom.create({
      subjectId,
      topic,
      mentorName: plainAuthData.name,
      agenda,
      description,
      
    });

    // Upload files to S3 or your desired storage
    const filesUploading = await uploadFilesToS3(addFilesInArray, "soloclassroomfiles");

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

        return  sololectureFile;
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


