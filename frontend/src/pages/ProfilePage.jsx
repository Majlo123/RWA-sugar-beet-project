import { useEffect, useState } from 'react';
import { getProfile } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { ethers } from 'ethers';
import treasuryAbi from '../treasuryAbi.json';
import beetAbi from '../beetAbi.json';

const treasuryAddress = "0x20C9F172583F02202c6E17E08f64cefa8A4dc20c"; // Zamenite Vašom adresom
const beetAddress = "0x8c9DAb0fd2368A5c60e0dE9eCFb445226E675D79"; // Zamenite Vašom adresom

function ProfilePage() {
  const [userProfile, setUserProfile] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [investments, setInvestments] = useState([]);
  const [error, setError] = useState('');
  const { account } = useAuth(); // Uzimamo povezan nalog iz konteksta

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const profileData = await getProfile();
        setUserProfile(profileData);

        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const beetContract = new ethers.Contract(beetAddress, beetAbi, provider);
          const treasuryContract = new ethers.Contract(treasuryAddress, treasuryAbi, provider);

          const balance = await beetContract.balanceOf(profileData.ethAddress);
          setTokenBalance(ethers.formatUnits(balance, 18));

          const investmentIds = await treasuryContract.getInvestmentIdsForInvestor(profileData.ethAddress);
          const investmentDetails = await Promise.all(
            investmentIds.map(id => treasuryContract.investments(id))
          );
          setInvestments(investmentDetails);
        } else {
          throw new Error("MetaMask is not installed.");
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchAllData();
  }, []);

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!userProfile) {
    return <div>Loading profile...</div>;
  }

  const isAddressMismatch = account && userProfile.ethAddress.toLowerCase() !== account.toLowerCase();

  return (
    <div>
      {isAddressMismatch && (
        <div className="error-message" style={{textAlign: 'center', marginBottom: '20px'}}>
          Warning: The connected MetaMask account ({`${account.substring(0, 6)}...`}) does not match the address registered with this profile.
        </div>
      )}

      <h1>User Dashboard</h1>
      
      <div className="profile-section">
        <h3>User Info</h3>
        <p><strong>Username:</strong> {userProfile.username}</p>
        <p><strong>Registered Ethereum Address:</strong> {userProfile.ethAddress}</p>
        <p><strong>Role:</strong> {userProfile.role}</p>
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