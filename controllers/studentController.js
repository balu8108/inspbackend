const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Student = require("../models/studentModel");
const Feedback=require("../models/feedbackModel");

const blacklistedTokens = new Set();
 

exports.routechecking=async(req,res)=> {
res.send('Route is working fine !!')
}

exports.registerStudent = async (req, res) => {
  
  const { name, email, password, mobileNo } = req.body;
 

  try {
    const existingStudent = await Student.findOne({
      where: { email },
      attributes: ['id'], // Only fetch the id column to check if the student already exists with the provided email
    });

    if (existingStudent) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Check if mobileNo is provided and not already registered
    if (mobileNo) {
      const existingMobile = await Student.findOne({
        where: { mobileNo },
        attributes: ['id'], // Only fetch the id column to check if the student already exists with the provided mobile number
      });

      if (existingMobile) {
        return res.status(400).json({ message: "Mobile number already registered" });
      }
    }

    const hashedPassword = await bcrypt.hash(password,10);
    const newStudent = await Student.create({ 
      name, 
      email, 
      password:hashedPassword, 
      mobileNo });
    return res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.log("Error registering student:", error);
    return res.status(500).json({ message: "Registration failed" });
  }
};

// login---->
exports.loginStudent = async (req, res) => {
  const { email, password } = req.body;

  try {
    const student = await Student.findOne({ where: { email } });

    if (!student) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const isPasswordValid = await bcrypt.compare(password, student.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const token = jwt.sign({ studentId: student.id }, 'your-secret-key', { expiresIn: '1h' });

    res.json({ token, message: 'Authentication successful' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};


// logout--->
exports.logoutStudent = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; 
  if (token) {
    blacklistedTokens.add(token); 
    return res.status(200).json({ message: 'Logout successful' });
  } else {
    return res.status(400).json({ message: 'No token provided' });
  }
};


// feedback 
exports.submitFeedback = async (req, res) => {
  try {
    const { class_id, feedback, rating } = req.body;

    // Create a new feedback entry
    const newFeedback = await Feedback.create({
      class_id: class_id,
      feedback: feedback,
      rating: rating
    });

    console.log('Feedback submitted:', newFeedback);

    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'An error occurred while submitting feedback' });
  }
};

