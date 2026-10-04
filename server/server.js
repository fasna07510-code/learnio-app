const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

require("dotenv").config({ path: __dirname + "/.env" });

const Student = require("./models/Student");
const Teacher = require("./models/Teacher");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== MONGODB CONNECTION ====================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error.message);
  });

// ==================== HOME ====================

app.get("/", (req, res) => {
  res.send("Learnio Backend is running!");
});

// ==================== STUDENT REGISTRATION ====================

app.post("/students", async (req, res) => {
  try {
    const { name, email, password, course } = req.body;

    const student = await Student.create({
      name,
      email,
      password,
      course
    });

   res.status(201).json({
  message: "Student registered successfully!",
  student: {
    _id: student._id,
    name: student.name,
    email: student.email,
    course: student.course
  }
});
  } catch (error) {
    res.status(500).json({
      message: "Student registration failed",
      error: error.message
    });
  }
});

// ==================== TEACHER REGISTRATION ====================

app.post("/teachers", async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;

    const teacher = await Teacher.create({
      name,
      email,
      password,
      subject
    });

   res.status(201).json({
  message: "Teacher registered successfully!",
  teacher: {
    _id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    subject: teacher.subject
  }
});
  } catch (error) {
    res.status(500).json({
      message: "Teacher registration failed",
      error: error.message
    });
  }
});

// ==================== STUDENT LOGIN ====================

app.post("/student-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    if (student.password !== password) {
      return res.status(401).json({
        message: "Invalid password"
      });
    }

    res.json({
      message: "Student login successful!",
      student
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message
    });
  }
});

// ==================== TEACHER LOGIN ====================

app.post("/teacher-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found"
      });
    }

    if (teacher.password !== password) {
      return res.status(401).json({
        message: "Invalid password"
      });
    }

    res.json({
      message: "Teacher login successful!",
      teacher
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message
    });
  }
});

// ==================== TEST PAGES ====================

app.get("/register-test", (req, res) => {
  res.send(`
    <h2>Learnio - Student Registration</h2>

    <form method="POST" action="/students">
      <input name="name" placeholder="Name" required />
      <br><br>

      <input name="email" type="email" placeholder="Email" required />
      <br><br>

      <input name="password" type="password" placeholder="Password" required />
      <br><br>

      <input name="course" placeholder="Course" />
      <br><br>

      <button type="submit">Register Student</button>
    </form>
  `);
});

app.get("/teacher-register-test", (req, res) => {
  res.send(`
    <h2>Learnio - Teacher Registration</h2>

    <form method="POST" action="/teachers">
      <input name="name" placeholder="Name" required />
      <br><br>

      <input name="email" type="email" placeholder="Email" required />
      <br><br>

      <input name="password" type="password" placeholder="Password" required />
      <br><br>

      <input name="subject" placeholder="Subject" />
      <br><br>

      <button type="submit">Register Teacher</button>
    </form>
  `);
});

// ==================== SERVER ====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});


