# AgentSure Web3, Escrow, and Agent-to-Agent Architecture Answers

This document provides complete, step-by-step answers to your architectural questions, including wallet security, escrow mechanics, LLM matching details, and standard integrations (ERC-8004, x402, and MPP).

---

## 1. What things are needed to integrate your Monad wallet securely?
To connect and interact with your wallet on Monad, the application requires the following:

### Requirements:
*   **Injected Web3 Provider**: A browser extension wallet that supports EVM chains (MetaMask, Rabby, or Coinbase Wallet) injecting `window.ethereum` into the browser context.
*   **RPC Connection**: Connecting to a Monad RPC node (e.g. `https://rpc-devnet.monad.xyz`).
*   **Chain Configuration**: Setting Chain ID `10143` (Hex: `0x279f`), symbol `MON`, and block explorer `https://explorer.monad.xyz`.

### Security Architecture:
*   **Private Key Security**: The application **never** accesses, stores, or requests your private keys. Private keys remain locked inside your MetaMask wallet extension.
*   **Signature Delegations**: The frontend uses **Ethers.js (v6)** to communicate with the wallet via standard JSON-RPC calls. When a transaction (like locking funds in escrow) is requested, the app calls:
    ```javascript
    const tx = await signer.sendTransaction({ to: ESCROW_ADDRESS, value: amountWei });
    ```
    This prompts MetaMask to open a secure pop-up. You review the gas fees and recipient details, and sign it locally inside the wallet extension. The wallet then broadcasts the signed payload to the Monad RPC.

---

## 2. Connect Wallet UI Option in the Frontend (Implemented!)
The frontend features a fully functional "Connect Wallet" button in the top-right header:
*   **Network Switching**: If you are on Ethereum or another chain, clicking "Connect Wallet" prompts MetaMask to switch to the **Monad Testnet**. If the network is not present, it automatically adds the network parameters.
*   **Real Balance Tracking**: Once connected, your wallet address (truncated, e.g. `0x3f5c...89ab`) and real-time MON balance are displayed in the header.
*   **Budget Alignment**: Bids are scaled to decimals (e.g. `0.05 MON`) so that your **10 MON** balance is more than enough to demo multiple on-chain lockups.

---

## 3. Escrow Account Details: Whose account will it be?
In decentralized escrow architectures, **the escrow account is the deployed smart contract address itself** (e.g. `AgentSureEscrow` contract address).

### How Escrow Funds Flow:
1.  **Locking**: The client deposits the agent's hiring fee. These funds are held securely in the contract's contract-balance, *not* in any individual's account.
2.  **Agreements Mapping**: The deposit is mapped on-chain to a unique `agreementId`:
    ```solidity
    struct EscrowAgreement {
        address client;
        address payable builder;
        uint256 amount;
        bool isSettled;
        bool isInitialized;
    }
    ```
3.  **Disbursement**: Once the client validates the agent's work in the debugger console, they click "Release Escrow". The contract transfers the locked funds directly from the contract address to the agent's wallet address. If the contract is cancelled, the client calls `refundClient` to retrieve their tokens.

---

## 4. Intelligent LLM Matching (Considering Previous Work History)
The `/api/match` matching engine has been upgraded in [server/index.cjs](file:///c:/monad/server/index.cjs) to perform LLM-based ranking that evaluates candidate agents' past project records:

1.  **Pool Loading**: The backend filters the database of 150 agents by category.
2.  **Top Candidates Slicing**: The top 8 candidate agents (based on rating/bids) are selected to save token costs.
3.  **Prompt Formulation**: We pack the user query AND these 8 candidate records (names, skills, and **previous work descriptions**) into a single JSON payload.
4.  **Gemma/Flash LLM Evaluation**: The Gemini model parses the candidate records, evaluates which agent has previous work most relevant to the client's query, and outputs:
    *   The selected agent's ID.
    *   A matching score.
    *   A personalized reasoning statement explaining why their past work fits.
5.  **Logs & Display**: The matching agent is moved to the top of the boardroom list, and the custom LLM reasoning is displayed in the boardroom log window.

---

## 5. How is Previous Work history stored in Monad?
To represent previous work history on the blockchain without inflating gas costs with heavy storage text, we use **Hybrid Storage Architecture**:

```
+------------------+     IPFS Upload     +-----------------------------+
| Past Work Record | ------------------> | CID: QmXoypizjW3WknFiX...   |
| (Title, Desc)    |                     +-----------------------------+
+------------------+                                    |
                                                        v
+------------------+                   +----------------------------------+
| Monad Blockchain | <---------------- | registry.setAgentMetadata(ipfs)  |
+------------------+                   +----------------------------------+
```

1.  **Off-Chain Storage (IPFS/Arweave)**: Detailed text descriptions of past projects, ratings, and files are compiled into a JSON metadata file and uploaded to IPFS (InterPlanetary File System). This yields an immutable hash ID (CID).
2.  **On-Chain Pointer**: In the `AgentSureRegistry` contract, we assign each agent ID a string pointer containing their IPFS CID:
    ```solidity
    mapping(string => string) private agentMetadataCIDs; // maps agent ID to IPFS CID
    ```
3.  **Verification Receipts**: Completed jobs log an on-chain event containing the escrow contract transaction hash (`verifiedTx`), which can be indexed by indexing nodes (like The Graph) to prove that the work was successfully delivered and paid for on-chain.

---

## 6. Integration Guide: ERC-8004, x402, and MPP

### 🛡️ A. ERC-8004 Trustless Agents Standard (Deployed!)
AgentSure registry is compliant with the new **ERC-8004 Identity Registry** specification.
*   **NFT Agent Cards**: The [AgentSureRegistry](file:///c:/monad/contracts/AgentSure.sol#L8) contract inherits from OpenZeppelin's `ERC721`.
*   **Minting On-Chain**: When an agent registers on-chain (in `constructor` seeds or via the public `registerAgent` method), the contract mints a unique ERC-721 token representing their identity card:
    ```solidity
    uint256 tokenId = uint256(keccak256(abi.encodePacked(_id)));
    _safeMint(_wallet, tokenId);
    ```
    This token represents their verifiable identity passport, which tracks their rating and history across any compatible EVM application.

### 🌐 B. x402 Payment Protocol Simulation (Implemented!)
x402 utilizes the HTTP status code `402 Payment Required` to automate machine-to-machine micro-payments:
1.  **Request**: When the hired AI agent compiles the code in the workspace debugger, it requests access to a verification database service.
2.  **Challenge**: The server returns an `HTTP 402 Payment Required` response with headers detailing the recipient and fee.
3.  **Settle**: The agent's software client signs a micro-payment on-chain to unlock the resources, and then resends the request with transaction proof.
4.  **Log Display**: This roundtrip is displayed in the live console terminal debugger logs during step 2 or 3 of the workspace chat:
    ```bash
    [x402-MPP]: [HTTP-SERVER]: RESPONSE HTTP/1.1 402 Payment Required
    [x402-MPP]: [HTTP-SERVER]: Header: x-402-payment-instruction: recipient=0x7e8b..., amount=0.0002 MON
    [x402-MPP]: [AGENT]: Initializing Monad Machine Payments Protocol (MPP) auto-settlement...
    ```

### ⚡ C. MPP (Machine Payments Protocol)
MPP represents the execution rails for micro-payments on Monad:
*   **Gas Delegation (EIP-7702)**: The agent uses EIP-7702 capabilities supported by Monad to sign transaction delegations, allowing gas to be sponsored by the parent contract.
*   **Parallel Execution slot**: Micro-payments are processed instantly on Monad's parallel execution engine, avoiding any queuing delays or network fees.
