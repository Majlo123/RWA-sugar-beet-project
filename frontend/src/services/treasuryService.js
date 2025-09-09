const API_URL = "http://localhost:5000";

export const recordInvestment = async (investmentData) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error("Authorization token not found.");
  }

  const response = await fetch(`${API_URL}/record-investment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // Neophodno za buduće zaštićene admin rute
    },
    body: JSON.stringify(investmentData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to record investment');
  }

  return await response.json();
};