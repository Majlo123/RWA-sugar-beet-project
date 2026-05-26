# Cryptocurrency Payment Integration - MULTI-CHAIN TESTNET

## ⚡ **ETHEREUM SEPOLIA** (Recommended - 12 Second Confirmations!)

We now support **Ethereum Sepolia testnet** alongside Bitcoin for much faster testing:

### Why Ethereum Sepolia?
- ⚡ **~12 seconds** per block (vs 10-15 minutes for Bitcoin)
- 🔄 **Reliable faucets** that actually work
- 💰 **MetaMask compatible** - pay directly from browser
- ✅ **Better dev/demo experience**

### Get Sepolia ETH (FREE & FAST)
1. **https://sepoliafaucet.com/** ✅ Most reliable
2. **https://www.alchemy.com/faucets/ethereum-sepolia** ✅ Alchemy faucet (requires login)
3. **https://sepolia-faucet.pk910.de/** ✅ PoW faucet (mine testnet ETH)
4. **https://faucet.quicknode.com/ethereum/sepolia** ✅ QuickNode

### How to Use
When creating payment, specify:
```json
{
  "cryptoType": "ETH"  // For Ethereum Sepolia (recommended)
}
```

Or leave empty (defaults to ETH).

---

## 🐢 **BITCOIN TESTNET** (Slower - 10-15 Minute Confirmations)

### Get Testnet Bitcoin

⚠️ **WARNING: Most Bitcoin testnet faucets are unreliable or down**

**Working Faucets (Check Status First):**
1. **https://coinfaucet.eu/en/btc-testnet/** (Most reliable when working)
2. **https://testnet.help/en/btcfaucet/testnet**
3. **https://bitcoinfaucet.uo1.net/** (Often down)

### How to Use
When creating payment, specify:
```json
{
  "cryptoType": "BTC"  // For Bitcoin testnet
}
```

---

## 🎯 RECOMMENDED WORKFLOW

**For Development/Testing:**
1. Use **Ethereum Sepolia** (cryptoType: "ETH")
2. Get free ETH from faucets above
3. Confirmations in ~12 seconds
4. Much better testing experience

**For Production Demo:**
- Show both BTC and ETH options
- Let users choose based on preference
- Ethereum = speed, Bitcoin = traditional crypto

---

## View Transactions

### Ethereum Sepolia
- **https://sepolia.etherscan.io/**
- Search by address or tx hash

### Bitcoin Testnet
- **https://mempool.space/testnet/**
- Search by address or tx hash

---

## Payment Flow

1. **User selects crypto type** (ETH or BTC)
2. **System generates address** and shows QR code
3. **User sends crypto** from wallet or faucet
4. **System polls blockchain** every 10 seconds:
   - **ETH**: Confirmed in ~12 seconds (1 block)
   - **BTC**: Confirmed in ~10-15 minutes (1 block)
5. **Auto-redirects** to success page on confirmation

---

## Comparison

| Feature | Ethereum Sepolia | Bitcoin Testnet |
|---------|------------------|-----------------|
| **Confirmation Time** | ~12 seconds | ~10-15 minutes |
| **Faucet Reliability** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐ Poor |
| **MetaMask Support** | ✅ Yes | ❌ No |
| **Dev Experience** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐ Frustrating |
| **Address Format** | 0x... (42 chars) | m.../n... (Base58) |

**🎯 Use Ethereum Sepolia for fast testing!**

