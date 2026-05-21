const API_URL = "http://localhost:5000/admin";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Authorization token not found.");
  }
  return { Authorization: `Bearer ${token}` };
};

const handleJson = async (response) => {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }
  return response.json();
};

export const getAnalytics = async () => {
  const response = await fetch(`${API_URL}/analytics`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleJson(response);
};

export const listKYCSubmissions = async (status) => {
  const url = new URL(`${API_URL}/kyc`);
  if (status) url.searchParams.set("status", status);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleJson(response);
};

export const approveKYC = async (userId) => {
  const response = await fetch(`${API_URL}/kyc/${userId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleJson(response);
};

export const rejectKYC = async (userId, reason) => {
  const response = await fetch(`${API_URL}/kyc/${userId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ reason }),
  });
  return handleJson(response);
};

export const getKYCDocumentURL = (userId) => {
  const token = localStorage.getItem("token");
  return {
    url: `${API_URL}/kyc/${userId}/document`,
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const downloadKYCDocument = async (userId) => {
  const response = await fetch(`${API_URL}/kyc/${userId}/document`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Document fetch failed (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
