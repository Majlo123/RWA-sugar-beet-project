const { DataTypes } = require('sequelize');
const db = require('../config/database');

const User = db.define('User', {
  // Model atributi su definisani ovde
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Korisničko ime mora biti jedinstveno
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false, // Čuvaćemo heširanu lozinku
  },
  ethAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Ethereum adresa mora biti jedinstvena
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user', // Podrazumevana uloga je 'user', može biti i 'admin'
  },
});

module.exports = User;