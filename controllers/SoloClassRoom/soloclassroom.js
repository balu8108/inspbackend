const { SoloClassRoom } = require("../../models");
exports.createSoloClassRoom = async (req, res) => {
  try {
    const { selectedSubject, topic, agenda, mentor, description } = req.body;
    const createsoloroom = await SoloClassRoom.create({
      subjectId: selectedSubject,

      topic: topic,
      agenda: agenda,
      mentorName: mentor,
      description: description,
    });

    res
      .status(201)
      .json({
        message: "Solo-classroom created  successfully",
        data: createsoloroom,
      });
  } catch (error) {
    console.error("Error creating the solo-classroom record:", error);
    res
      .status(500)
      .json({ error: "An error occurred while  creating  the solo-classroom" });
  }
};
exports.getLatestSoloclassroom=async(req,res)=>{
  try {
    // Fetch the latest two solo class room records
    const latestSoloClassRooms = await SoloClassRoom.findAll({
      order: [['createdAt', 'DESC']], // Order by createdAt in descending order
      limit: 2, // Limit the results to 2 records
    });

    res.status(200).json({ data: latestSoloClassRooms });
  } catch (error) {
    console.error('Error fetching latest solo class rooms:', error);
    res.status(500).json({ error: 'An error occurred while fetching the latest solo class rooms' });
  }
}
