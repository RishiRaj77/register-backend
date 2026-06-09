const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

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

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Create and save new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationToken,
    });

    await newUser.save();

    // Send verification email
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;
    const message = `Please verify your email by clicking: \n\n ${verifyUrl}`;

    try {
      await sendEmail({
        email: newUser.email,
        subject: 'Email Verification',
        message,
      });

      res.status(201).json({ message: "User registered! Please check your email to verify your account." });
    } catch (error) {
      console.log(error);
      newUser.verificationToken = undefined;
      await newUser.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during email verification" });
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

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email before logging in" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Create payload and sign JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({ 
          message: "Login successful!", 
          name: user.name,
          token 
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during login" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ message: "There is no user with that email" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message,
      });

      res.status(200).json({ message: "Email sent" });
    } catch (error) {
      console.log(error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during forgot password" });
  }
};

const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid token or token has expired" });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during password reset" });
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
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getUsers,
  updateUser,
  deleteUser
};
