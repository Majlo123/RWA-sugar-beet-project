const API_URL = "http://localhost:5000/admin";

export const getAnalytics = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error("Authorization token not found.");
  }

  const response = await fetch(`${API_URL}/analytics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Failed to fetch analytics');
  }

  return await response.json();
};
