const { Course } = require("../../models");
exports.myCourses = async (req, res) => {
  const { title, description } = req.body;
  try {
    const courses = await Course.create({ title, description });
    res.status(201).json(courses);
  } catch (error) {
    console.log("Error in creating  courses:", error);
    res.status(500).json({ error: "Internal Server error" });
  }
};
