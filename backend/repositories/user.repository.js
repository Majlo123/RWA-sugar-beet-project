const User = require('../models/user.model');

const findUserByUsername = async (username) => {
  return await User.findOne({ where: { username } });
};

const createUser = async (userData) => {
  return await User.create(userData);
};

module.exports = {
  findUserByUsername,
  createUser,
};