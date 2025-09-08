const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const User = require('../models/user.model');

const registerUser = async (username, password, ethAddress) => {
  const existingUser = await userRepository.findUserByUsername(username);
  if (existingUser) {
    throw new Error('Korisničko ime je zauzeto.');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await userRepository.createUser({
    username,
    password: hashedPassword,
    ethAddress,
  });
  return newUser;
};

// --- NOVA FUNKCIJA ---
const loginUser = async (username, password) => {
  // 1. Pronađi korisnika u bazi
  const user = await userRepository.findUserByUsername(username);
  if (!user) {
    throw new Error('Korisnik nije pronađen.');
  }

  // 2. Proveri da li se lozinke poklapaju
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new Error('Pogrešna lozinka.');
  }

  // 3. Ako je sve u redu, generiši JWT token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' } // Token traje 1 sat
  );

  return { token };
};

module.exports = { registerUser, loginUser };