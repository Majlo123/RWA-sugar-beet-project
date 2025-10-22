import { useEffect, useState } from 'react';
import { getProfile } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { ethers } from 'ethers';
import treasuryAbi from '../treasuryAbi.json';
import beetAbi from '../beetAbi.json';

const treasuryAddress = "0x0aE63859cCb63c6c031d1Ab93CE9Ba8a2AD41c83";
const beetAddress = "0x9d00209F07042cF2F337570ea4c87c860525a638";

function ProfilePage() {
  const [userProfile, setUserProfile] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [investments, setInvestments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { account } = useAuth();

  const fetchAllData = async () => {
  try {
    setLoading(true);
    const profileData = await getProfile();
    setUserProfile(profileData);

    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const beetContract = new ethers.Contract(beetAddress, beetAbi, provider);
      const treasuryContract = new ethers.Contract(treasuryAddress, treasuryAbi, provider);

      console.log("Fetching data for address:", profileData.ethAddress);

      const balance = await beetContract.balanceOf(profileData.ethAddress);
      setTokenBalance(ethers.formatUnits(balance, 18));

      const investmentIds = await treasuryContract.getInvestmentIdsForInvestor(profileData.ethAddress);
      console.log("Fetched investment IDs:", investmentIds);

      const investmentDetails = await Promise.all(
        investmentIds.map(id => treasuryContract.investments(id))
      );
      console.log("Fetched investment details:", investmentDetails);

      const formattedInvestments = investmentDetails.map((inv, index) => ({
        id: investmentIds[index],
        investor: inv[0],
        amountUSD: inv[1],
        startTime: inv[2],
        maturesOn: inv[3],
        isClaimed: inv[4],
      }));

      setInvestments(formattedInvestments);
    } else {
      throw new Error("MetaMask is not installed.");
    }
  } catch (err) {
    console.error("Error fetching data:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    fetchAllData();
  }, []);

  const handleClaim = async (investmentId) => {
    setError('');
    setMessage('');
    setLoading(true);

    if (!account) {
      alert("Please connect your wallet first.");
      setLoading(false);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const treasuryContractWithSigner = new ethers.Contract(treasuryAddress, treasuryAbi, signer);

      console.log(`Claiming yield for investment ID: ${investmentId}`);
      const tx = await treasuryContractWithSigner.claimYield(investmentId);
      await tx.wait();

      setMessage(`Yield claimed successfully! Transaction Hash: ${tx.hash}`);
      fetchAllData();
    } catch (err) {
      console.error(err);
      setError(err.reason || "Failed to claim yield.");
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile && loading) {
    return <div>Loading profile...</div>;
  }
  
  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  const isAddressMismatch = account && userProfile && userProfile.ethAddress.toLowerCase() !== account.toLowerCase();

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
        {userProfile ? (
          <>
            <p><strong>Username:</strong> {userProfile.username}</p>
            <p><strong>Registered Ethereum Address:</strong> {userProfile.ethAddress}</p>
            <p><strong>Role:</strong> {userProfile.role}</p>
          </>
        ) : <p>Loading user info...</p>}
      </div>

      <div className="profile-section">
        <h3>Token Balance</h3>
        <p>You own: <strong>{tokenBalance} BEET</strong> tokens.</p>
      </div>

      <div className="profile-section">
        <h3>My Investments</h3>
        {message && <p className="success-message">{message}</p>}
        {investments.length > 0 ? (
          <ul>
            {investments.map((inv, index) => {
              const now = Math.floor(Date.now() / 1000);
              const isMatured = now >= Number(inv.maturesOn);
              
              if (!inv || typeof inv.amountUSD === 'undefined') return null;

              return (
                <li key={`${index}-${inv.startTime.toString()}`} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      Investment of <strong>{inv.amountUSD.toString()} USD</strong> made on{" "}
                      {new Date(Number(inv.startTime) * 1000).toLocaleString()}.
                      Claimed: {inv.isClaimed ? 'Yes' : 'No'}.
                    </span>
                    
                    {isMatured && !inv.isClaimed && (
                      <button 
                        onClick={() => handleClaim(inv.id)} 
                        disabled={loading}
                        style={{width: '120px', marginLeft: '20px'}}
                      >
                        {loading ? 'Claiming...' : 'Claim Yield'}
                      </button>
                    )}
                  </div>

                 
                </li>
              );
            })}
          </ul>
        ) : (
          <p>You have no investments yet.</p>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;