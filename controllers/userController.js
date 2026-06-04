const bcrypt = require("bcrypt");
const User = require("../models/User");

// --- AUTHENTICATION ---

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Login successful
    res.status(200).json({ message: "Login successful!", name: user.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// --- ADMIN CRUD ---

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude passwords from response
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching users" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      { name, email },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating user" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting user" });
  }
};

module.exports = {
  signup,
  login,
  getUsers,
  updateUser,
  deleteUser
};
