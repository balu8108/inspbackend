const Sequelize = require("sequelize");
const { Op } = Sequelize;
const {
    StudentFeedback
} = require("../../models");

const createStudentFeedback = async (req, res) => {
    try {
        const { studentName, studentEmail, feedback } = req.body;

        if (!studentName || !studentEmail || !feedback) return res.status(400).json({ error: "All fields are required" });

        const studentFeedback = await StudentFeedback.create({
            studentName,
            studentEmail,
            feedback
        });

        return res.status(200).json({ message: "Student feedback created successfully", data: studentFeedback });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
}

const getAllStudentFeedback = async (req, res) => {
    try {

        const { page, limit, search } = req.body;
        if (!page || !limit) return res.status(400).json({ error: "Page and limit are required" });
        const offset = (page - 1) * limit;
        
        const whereClause = {};
        if (search) {
            whereClause.studentName = { [Sequelize.Op.like]: `%${search}%` }; // Adjust based on your search criteria
        }

        // Find all student feedback with pagination and search
        const studentFeedback = await StudentFeedback.findAndCountAll({
            where: whereClause, // Apply search condition
            limit: parseInt(limit), // Convert limit to integer
            offset: offset, // Offset based on page and limit
        });

        // Calculate total number of pages
        const totalPages = Math.ceil(studentFeedback.count / limit);
        // Return response with paginated and searched data
        return res.status(200).json({ message: "Student feedback successfully", data: studentFeedback.rows, page: page, total: studentFeedback.count, totalPages });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
}


const deleteFeedbackById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Id is required" });
        const studentFeedback = await StudentFeedback.destroy({
            where: {
                id: id
            }
        });
        return res.status(200).json({ message: "Student feedback deleted successfully" });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }

}

module.exports = {
    createStudentFeedback,
    getAllStudentFeedback,
    deleteFeedbackById
}