const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Ova ruta je zaštićena. Prvo se izvršava authMiddleware, pa tek onda getProfile.
router.get('/profile', authMiddleware, userController.getProfile);

module.exports = router;