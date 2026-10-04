const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  subject: {
    type: String
  }
});

module.exports = mongoose.model("Teacher", teacherSchema);