# SybilDrop — Sybil-Resistant Airdrop Platform

A fair token distribution platform built on **Base** using **Billions Network** (Privado ID) for zero-knowledge Proof of Humanity verification. Each verified human can claim tokens exactly once — no bots, no multi-wallets.

## Architecture

```
User (Billions App)
  |
  | 1. Verify identity (passport + phone)
  v
Privado ID Issuer Chain
  |
  | 2. ZK Proof generated
  v
UniversalVerifier (Base) ─── 0xfcc86A79fCb057A8e55C6B853dff9479C3cf607c
  |
  | 3. Proof status stored on-chain
  v
ZKAirdrop Contract (Base)
  |
  | 4. Checks verification, mints tokens
  v
User receives SDROP tokens
```

## Tech Stack

- **Smart Contract**: Solidity 0.8.20 + OpenZeppelin + Privado ID UniversalVerifier
- **Frontend**: React 18 + Vite + ethers.js v6
- **Network**: Base (Sepolia testnet / Mainnet)
- **Identity**: Billions Network / Privado ID (ZK Proof of Humanity)

---

## Setup Instructions (Windows + VS Code)

### Prerequisites

1. Install **Node.js** (v18+): https://nodejs.org
2. Install **Git**: https://git-scm.com
3. Install **MetaMask** browser extension
4. Get Base Sepolia ETH from: https://www.alchemy.com/faucets/base-sepolia

### Step 1: Open the project

Open VS Code, then open the `sybil-airdrop` folder.

Open a terminal in VS Code (Ctrl + `).

### Step 2: Install smart contract dependencies

```bash
npm install
```

### Step 3: Configure environment

```bash
copy .env.example .env
```

Edit `.env` and add your values:

```
PRIVATE_KEY=your_metamask_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

To get your private key from MetaMask:
- Open MetaMask > click the three dots > Account Details > Show Private Key

### Step 4: Compile the smart contract

```bash
npx hardhat compile
```

### Step 5: Deploy to Base Sepolia

```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

Save the deployed contract address from the console output.

### Step 6: Update frontend config

Open `frontend/src/contract.js` and replace the `CONTRACT_ADDRESS` with your deployed address:

```javascript
export const CONTRACT_ADDRESS = "0xYourDeployedAddress";
```

### Step 7: Set up the ZKP request (optional — for production)

This step configures the Proof of Humanity query on the UniversalVerifier. In production you would run:

```bash
npx hardhat run scripts/setup-request.js --network baseSepolia
```

Note: The UniversalVerifier requires a whitelisted validator. For testnet development, you may need to use the Privado ID demo issuer and existing request IDs. Check https://docs.privado.id for the latest setup.

### Step 8: Install and run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## User Flow

1. **Install Billions App** — Download from https://signup.billions.network
2. **Verify Identity** — Scan passport with NFC + liveness check
3. **Get PoH Credential** — Billions issues a Proof of Humanity credential
4. **Submit ZK Proof** — User submits proof to UniversalVerifier on Base
5. **Connect Wallet** — Connect MetaMask to the SybilDrop frontend
6. **Claim Tokens** — The contract checks UniversalVerifier and mints tokens

## Smart Contract Details

### ZKAirdrop.sol

| Function | Description |
|----------|-------------|
| `claim()` | Claim airdrop tokens (requires verification) |
| `isEligible(address)` | Check if address is verified, unclaimed, and airdrop active |
| `remainingTokens()` | Tokens left in the airdrop pool |
| `recoverUnclaimed()` | Owner recovers unclaimed tokens after deadline |

### Key Addresses (Unified across all networks)

| Contract | Address |
|----------|---------|
| UniversalVerifier | `0xfcc86A79fCb057A8e55C6B853dff9479C3cf607c` |
| State | `0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896` |
| Validator SIG V2 | `0x59B347f0D3dd4B98cc2E056Ee6C53ABF14F8581b` |
| Validator MTP V2 | `0x27bDFFCeC5478a648f89764E22fE415486A42Ede` |
| Validator V3 | `0xd179f29d00Cd0E8978eb6eB847CaCF9E2A956336` |

## Switching to Base Mainnet

1. Update `.env`:
   ```
   BASE_MAINNET_RPC_URL=https://mainnet.base.org
   ```

2. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network baseMainnet
   ```

3. Update `frontend/src/contract.js`:
   - Change `CONTRACT_ADDRESS` to your mainnet deployment
   - Change `CHAIN_CONFIG.chainId` to `"0x2105"` (8453)
   - Change `CHAIN_CONFIG.chainName` to `"Base"`
   - Change `rpcUrls` to `["https://mainnet.base.org"]`
   - Change `blockExplorerUrls` to `["https://basescan.org"]`

## Resources

- Billions Network: https://billions.network
- Privado ID Docs: https://docs.privado.id
- Privado ID Smart Contracts: https://github.com/iden3/contracts
- Base Docs: https://docs.base.org
- Cross-chain Verification Tutorial: https://docs.privado.id/docs/verifier/on-chain-verification/cross-chain
