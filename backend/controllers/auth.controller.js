const authService = require('../services/auth.service');

const register = async (req, res) => {
  try {
    const { username, password, ethAddress } = req.body;
    if (!username || !password || !ethAddress) {
      return res.status(400).json({ message: 'Sva polja su obavezna.' });
    }

    const user = await authService.registerUser(username, password, ethAddress);

    // Ne vraćamo lozinku u odgovoru
    res.status(201).json({
      message: 'Korisnik uspešno registrovan.',
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

module.exports = { register };