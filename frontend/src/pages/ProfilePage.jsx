import { useEffect, useState } from 'react';
import { getProfile } from '../services/userService';
import { ethers } from 'ethers';

// Uvozimo ABI-je
import treasuryAbi from '../treasuryAbi.json';
import beetAbi from '../beetAbi.json';

// Adrese Vaših deploy-ovanih ugovora
const treasuryAddress = "ADRESA_VAŠEG_TREASURY_UGOVORA"; // Zamenite sa pravom adresom
const beetAddress = "ADRESA_VAŠEG_BEET_TOKENA"; // Zamenite sa pravom adresom

function ProfilePage() {
  const [user, setUser] = useState(null); // Podaci iz naše baze
  const [tokenBalance, setTokenBalance] = useState('0'); // Stanje BEET tokena
  const [investments, setInvestments] = useState([]); // Lista investicija
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. Dohvatamo podatke o korisniku sa našeg backend-a
        const profileData = await getProfile();
        setUser(profileData);

        // 2. Povezujemo se na blockchain preko MetaMask-a za čitanje podataka
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const beetContract = new ethers.Contract(beetAddress, beetAbi, provider);
          const treasuryContract = new ethers.Contract(treasuryAddress, treasuryAbi, provider);

          // 3. Dohvatamo stanje BEET tokena
          const balance = await beetContract.balanceOf(profileData.ethAddress);
          setTokenBalance(ethers.formatUnits(balance, 18)); // Pretvaramo iz wei u ETH format

          // 4. Dohvatamo investicije korisnika
          const investmentIds = await treasuryContract.getInvestmentIdsForInvestor(profileData.ethAddress);
          const investmentDetails = await Promise.all(
            investmentIds.map(id => treasuryContract.investments(id))
          );
          setInvestments(investmentDetails);

        } else {
          throw new Error("MetaMask nije instaliran.");
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchAllData();
  }, []); // Prazan niz [] znači da će se ovo izvršiti samo jednom

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!user) {
    return <div>Loading profile...</div>;
  }

  return (
    <div>
      <h1>User Dashboard</h1>
      
      <div className="profile-section">
        <h3>User Info</h3>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Ethereum Address:</strong> {user.ethAddress}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>

      <div className="profile-section">
        <h3>Token Balance</h3>
        <p>You own: <strong>{tokenBalance} BEET</strong> tokens.</p>
      </div>

      <div className="profile-section">
        <h3>My Investments</h3>
        {investments.length > 0 ? (
          <ul>
            {investments.map((inv, index) => (
              <li key={index}>
                Investment of <strong>{inv.amountUSD.toString()} USD</strong> made on{" "}
                {new Date(Number(inv.startTime) * 1000).toLocaleDateString()}.
                Matures on: {new Date(Number(inv.maturesOn) * 1000).toLocaleDateString()}.
                Claimed: {inv.isClaimed ? 'Yes' : 'No'}.
              </li>
            ))}
          </ul>
        ) : (
          <p>You have no investments yet.</p>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;