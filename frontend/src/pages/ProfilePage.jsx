import { useEffect, useState } from 'react';
import { getProfile } from '../services/userService';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await getProfile();
        setUser(profileData);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchProfile();
  }, []); // Prazan niz [] znači da će se ovo izvršiti samo jednom, kada se komponenta prvi put učita

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!user) {
    return <div>Loading profile...</div>;
  }

  return (
    <div>
      <h1>User Profile</h1>
      <p><strong>Username:</strong> {user.username}</p>
      <p><strong>Ethereum Address:</strong> {user.ethAddress}</p>
      <p><strong>Role:</strong> {user.role}</p>
    </div>
  );
}

export default ProfilePage;