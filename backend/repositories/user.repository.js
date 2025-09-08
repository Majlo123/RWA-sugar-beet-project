const User = require('../models/user.model');

const findUserByUsername = async (username) => {
  return await User.findOne({ where: { username } });
};
const findUserById = async (id) => {
  return await User.findByPk(id, {
    // Izbacujemo lozinku iz rezultata
    attributes: { exclude: ['password'] }
  });
};
const createUser = async (userData) => {
  return await User.create(userData);
};

module.exports = {
  findUserByUsername,
  createUser,
  findUserById
};