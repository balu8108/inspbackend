const getAllSubjects = async (req, res) => {
  //   try {
  //     const subjects = await Subject.findAll();
  //     return res.status(200).json({ data: subjects });
  //   } catch (err) {
  //     return res.status(500).json({ error: err.message });
  //   }
  return res.status(200).json({ data: "No Subjects" });
};

module.exports = { getAllSubjects };
