# Cryptocurrency Payment Integration — Polygon + Bitcoin

## ⚡ **POLYGON (POL)** — Recommended (~2 Second Blocks!)

The crypto rail pays in **POL** on the **Polygon PoS network** alongside Bitcoin, for fast, cheap confirmations.

### Why Polygon?
- ⚡ **~2 seconds** per block (vs 10-15 minutes for Bitcoin)
- 💸 **Very low fees** (~$0.001–0.05 per transaction)
- 💰 **MetaMask compatible** — pay directly from the browser
- ✅ **Same EVM address format** as Ethereum (`0x...`)
- 🔗 **Consistent with the BEET token**, which is also deployed on Polygon

### How to Use
When creating a payment, specify:
```json
{
  "cryptoType": "POL"  // For Polygon (recommended)
}
```

Or leave it empty (defaults to POL).

> **Diploma demo note:** the BEET frontend *simulates* the on-chain confirmation
> (the "I've sent it" button), so no real POL is required to complete the demo
> purchase flow. The service still generates a valid Polygon address and computes
> the POL amount from the live CoinGecko rate.

---

## 🐢 **BITCOIN TESTNET** (Slower — 10-15 Minute Confirmations)

### Get Testnet Bitcoin

⚠️ **WARNING: Most Bitcoin testnet faucets are unreliable or down**

**Working Faucets (Check Status First):**
1. **https://coinfaucet.eu/en/btc-testnet/** (Most reliable when working)
2. **https://testnet.help/en/btcfaucet/testnet**
3. **https://bitcoinfaucet.uo1.net/** (Often down)

### How to Use
When creating a payment, specify:
```json
{
  "cryptoType": "BTC"  // For Bitcoin testnet
}
```

---

## 🎯 RECOMMENDED WORKFLOW

**For Development/Testing:**
1. Use **Polygon** (cryptoType: "POL")
2. Confirmations in ~2 seconds
3. Low fees and a much better testing experience

**For Production Demo:**
- Show both BTC and POL options
- Let users choose based on preference
- Polygon = speed + low cost, Bitcoin = traditional crypto

---

## View Transactions

### Polygon
- **https://polygonscan.com/**
- Search by address or tx hash

### Bitcoin Testnet
- **https://mempool.space/testnet/**
- Search by address or tx hash

---

## Payment Flow

1. **User selects crypto type** (POL or BTC)
2. **System generates address** and shows QR code
3. **User sends crypto** from wallet (or the demo simulates confirmation)
4. **System checks the transaction:**
   - **POL**: Confirmed in ~2 seconds (Polygon block time)
   - **BTC**: Confirmed in ~10-15 minutes (1 block)
5. **Auto-redirects** to the success page on confirmation

---

## Comparison

| Feature | Polygon (POL) | Bitcoin Testnet |
|---------|---------------|-----------------|
| **Confirmation Time** | ~2 seconds | ~10-15 minutes |
| **Transaction Fee** | ~$0.001–0.05 | Free (testnet) |
| **MetaMask Support** | ✅ Yes | ❌ No |
| **Dev Experience** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐ Frustrating |
| **Address Format** | 0x... (42 chars) | m.../n... (Base58) |

**🎯 Use Polygon for fast, cheap confirmations!**
