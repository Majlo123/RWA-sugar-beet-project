const API_URL = "http://localhost:5000";

const authHeader = () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error("Authorization token not found.");
  return { Authorization: `Bearer ${token}` };
};

const parseError = async (response, fallback) => {
  const data = await response.json().catch(() => ({}));
  return data.error || data.message || fallback;
};

export const initiatePayment = async ({ amountUSD, paymentMethod }) => {
  const response = await fetch(`${API_URL}/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ amountUSD, paymentMethod }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to initiate payment'));
  }
  return await response.json();
};

export const getPaymentById = async (paymentId) => {
  const response = await fetch(`${API_URL}/payments/${paymentId}`, {
    headers: { ...authHeader() },
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Payment not found'));
  }
  return await response.json();
};

export const confirmPayment = async (paymentId) => {
  const response = await fetch(`${API_URL}/payments/${paymentId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to confirm payment'));
  }
  return await response.json();
};

export const getPaymentHistory = async () => {
  const response = await fetch(`${API_URL}/payments/history`, {
    headers: { ...authHeader() },
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load payment history'));
  }
  const data = await response.json();
  return data.payments ?? [];
};

// Simulated payment methods (PayPal/Crypto/QR) call the BEET backend, which
// proxies to the PSP. Keeps PSP off the public origin, eliminates CORS.
export const simulatePayment = async (paymentId, status, reason = null) => {
  const response = await fetch(`${API_URL}/payments/${paymentId}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ status, reason }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Payment simulation failed'));
  }
  return await response.json();
};

// capturePayPal is called after the user is redirected back from PayPal
// sandbox approval. The PayPal token (order id) and PayerID query params
// arrive on the redirect URL; we forward them plus our merchantOrderId
// to the BEET backend which captures via paypal-service.
export const capturePayPal = async ({ merchantOrderId, paypalOrderId, payerId }) => {
  const response = await fetch(`${API_URL}/payments/paypal/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ merchantOrderId, paypalOrderId, payerId }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'PayPal capture failed'));
  }
  return await response.json();
};

export const cancelPayPal = async (merchantOrderId) => {
  const response = await fetch(`${API_URL}/payments/paypal/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ merchantOrderId }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'PayPal cancel failed'));
  }
  return await response.json();
};

// Bank/card payments also go through the BEET backend; the backend proxies
// the card data to bank-service and returns the resulting payment status.
export const submitBankPayment = async (paymentId, { pan, cvv, expiryDate, cardHolder }) => {
  const response = await fetch(`${API_URL}/payments/${paymentId}/submit-card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({
      pan: pan.replace(/\s+/g, ''),
      cvv,
      expiryDate,
      cardHolder,
    }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Bank payment failed'));
  }
  return await response.json();
};
