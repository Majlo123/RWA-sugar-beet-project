const API_URL = "http://localhost:5000/users";

export const getProfile = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch(`${API_URL}/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Šaljemo token u Authorization hederu
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return await response.json();
};