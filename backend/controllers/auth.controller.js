const authService = require('../services/auth.service');

const register = async (req, res) => {
  try {
    const { username, password, ethAddress } = req.body;
    if (!username || !password || !ethAddress) {
      return res.status(400).json({ message: 'All fields are required.' }); // <-- IZMENA
    }

    const user = await authService.registerUser(username, password, ethAddress);

    res.status(201).json({
      message: 'User registered successfully.', // <-- IZMENA
      user: {
        id: user.id,
        username: user.username,
        ethAddress: user.ethAddress,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' }); // <-- IZMENA
    }
    const result = await authService.loginUser(username, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { register, login };