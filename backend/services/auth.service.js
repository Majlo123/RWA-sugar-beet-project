const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const User = require('../models/user.model');

const registerUser = async (username, password, ethAddress) => {
  const existingUser = await userRepository.findUserByUsername(username);
  if (existingUser) {
    throw new Error('Username is already taken.'); // <-- IZMENA
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await userRepository.createUser({
    username,
    password: hashedPassword,
    ethAddress,
  });
  return newUser;
};

const loginUser = async (username, password) => {
  const user = await userRepository.findUserByUsername(username);
  if (!user) {
    throw new Error('User not found.'); // <-- IZMENA
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new Error('Incorrect password.'); // <-- IZMENA
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { token };
};

module.exports = { registerUser, loginUser };