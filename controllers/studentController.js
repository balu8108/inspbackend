const Student = require("../models/studentModel");

 

exports.routechecking=async(req,res)=> {
res.send('Route is working fine !!')
}


// Register Student


// exports.registerStudent = async (req, res) => {
//   const {name, email, password} = req.body;
//   try {
//     const existingStudent = await Student.findOne({ where: { email } });
//     if (existingStudent) {
//       return res.status(400).json({ message: "Email already registered" });
//     }
//     const newStudent = await Student.create({ name,email, password });
//     return res.status(201).json({ message: "Registration successful" });
//   } catch (error) {
//     console.log("Error registering student:", error);
//     return res.status(500).json({ message: "Registration failed" });
//   }
// };

// controllers/studentController.js

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

    const newStudent = await Student.create({ name, email, password, mobileNo });
    return res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.log("Error registering student:", error);
    return res.status(500).json({ message: "Registration failed" });
  }
};