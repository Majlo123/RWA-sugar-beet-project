const API_URL = "http://localhost:5000";

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

export const getMyKYC = async () => {
  const response = await fetch(`${API_URL}/users/kyc`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleJson(response);
};

export const submitKYC = async ({ fullName, documentType, documentNumber, dateOfBirth, country, document }) => {
  const formData = new FormData();
  formData.append("fullName", fullName);
  formData.append("documentType", documentType);
  formData.append("documentNumber", documentNumber);
  formData.append("dateOfBirth", dateOfBirth);
  formData.append("country", country);
  formData.append("document", document);

  const response = await fetch(`${API_URL}/users/kyc/submit`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  return handleJson(response);
};
