const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const User = require('../models/user.model');

const registerUser = async (username, password, ethAddress) => {
  // Provera da li korisnik već postoji
  const existingUser = await userRepository.findUserByUsername(username);
  if (existingUser) {
    throw new Error('Korisničko ime je zauzeto.');
  }

  // Heširanje lozinke
  const hashedPassword = await bcrypt.hash(password, 10); // 10 je "salt rounds"

  // Kreiranje novog korisnika
  const newUser = await userRepository.createUser({
    username,
    password: hashedPassword,
    ethAddress,
  });

  return newUser;
};

module.exports = { registerUser };