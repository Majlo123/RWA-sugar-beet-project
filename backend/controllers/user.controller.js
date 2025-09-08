const userRepository = require('../repositories/user.repository');

const getProfile = async (req, res) => {
  try {
    // req.user je postavljen od strane authMiddleware-a
    const userId = req.user.id; 
    const user = await userRepository.findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "Korisnik nije pronađen." });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru." });
  }
};

module.exports = { getProfile };