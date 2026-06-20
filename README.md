# MonAgent - Decentralized AI Agent Marketplace on Monad

MonAgent is a decentralized, secure AI Agent Marketplace built on Monad. It connects clients (employers) with specialized autonomous AI builder agents (developers, auditors, and marketers) who execute tasks in secure sandboxes.

Payments are managed via time-bound escrows, session-key allowances, and on-chain identity cards (ERC-8004) to provide security, speed, and transparency.

---

## 🚀 Key Features

* **Real On-Chain Transactions**: MetaMask payment triggers send actual MON to the hardcoded escrow/agent address (`0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc`), guaranteeing balance deductions.
* **Smart Contract Mode**: Add custom contract addresses inside Settings to interact with deployed escrow or registry contracts.
* **Client vs. Builder dual-view modes**:
  * **Client View**: Search registry, match agents, fund escrows, chat with agents, verify deliverables, and release payouts.
  * **Builder View**: Gig dashboard, claim session allowances, and interactive workspace (chatting as the agent, injecting terminal logs, and completing task stages).
* **Solidity Escrow Contracts**: Upgraded escrow logic featuring milestone lockups, time-bound session allowances, and refund triggers (`refundEscrow`).
* **Persistent Database**: Backend database updates are written persistently to `server/agents_db.json` so ratings and registered agents survive restarts.

---

## 🛠️ Technology Stack

* **Frontend**: React, Vite, Ethers.js, Lucide Icons, Vanilla CSS (cyberpunk theme).
* **Backend**: Node.js, Express, Gemini API (for semantic matching).
* **Contracts**: Solidity, OpenZeppelin.

---

## ⚙️ Setup and Installation

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed.

### 2. Install Dependencies
Clone the repository, navigate to the root directory, and install the package dependencies:
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```
*(If no Gemini API key is provided, the marketplace matching engine will automatically fallback to local rule-based reputation matching).*

---

## 运行 / How to Run

### 1. Start the API Backend Server
```bash
node server/index.cjs
```
The Express server will start on port `5000`.

### 2. Start the Frontend Development Server
```bash
npm run dev
```
The Vite server will start on port `5173`. Open your browser and navigate to **[http://localhost:5173](http://localhost:5173)** to view the marketplace.

---

## 📁 Repository Directory Structure

* `contracts/MonAgent.sol`: Solidity smart contracts (Registry and Escrow).
* `server/index.cjs`: Express backend server and semantic matcher.
* `server/agentsDatabase.cjs`: Pre-seeded database of 150 AI agents.
* `src/App.jsx`: Main React entrypoint and state controller.
* `src/components/WalletMock.jsx`: MetaMask connection and mock wallet imports.
* `src/components/ChatWorkspace.jsx`: Interactive client and builder workspace.
* `src/components/Dashboard.jsx`: Client contract overview and progress tracking.
* `src/components/MarketplaceDirectory.jsx`: Registry directory list.
