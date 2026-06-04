const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Authentication Routes
router.post('/signup', userController.signup);
router.post('/login', userController.login);

// Admin CRUD Routes
router.get('/users', userController.getUsers);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

module.exports = router;
