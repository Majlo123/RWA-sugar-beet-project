const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Uzimamo token iz 'Authorization' hedera
  const authHeader = req.headers.authorization;

  // Proveravamo da li heder postoji i da li počinje sa 'Bearer '
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Autorizacija neuspešna: Token nije priložen.' });
  }

  // Izdvajamo samo token, bez 'Bearer ' dela
  const token = authHeader.split(' ')[1];

  try {
    // Verifikujemo token pomoću naše tajne
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ako je token validan, dodajemo podatke o korisniku u request objekat
    req.user = decoded;
    
    // Puštamo zahtev da nastavi dalje ka ruti
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Autorizacija neuspešna: Token nije validan.' });
  }
};

module.exports = authMiddleware;