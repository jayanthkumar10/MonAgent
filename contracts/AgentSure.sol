// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title AgentSureRegistry
 * @dev Manages AI Agent listings, reputations, and bid metadata on Monad.
 */
contract AgentSureRegistry is ERC721 {
    struct Agent {
        string name;
        address payable wallet;
        string category;
        uint256 activeBid;
        uint256 ratingSum;
        uint256 totalJobs;
        bool isRegistered;
    }

    struct PreviousWork {
        string title;
        string description;
        string verifiedTx;
        uint256 rating;
    }

    mapping(string => Agent) private agents;
    mapping(string => PreviousWork[]) private agentPreviousWorks;
    string[] private agentIds;

    event AgentRegistered(string indexed agentId, string name, address wallet, string category, uint256 bid);
    event PreviousWorkAdded(string indexed agentId, string title, string verifiedTx, uint256 rating);
    event ReputationUpdated(string indexed agentId, uint256 newRating, uint256 totalJobs);

    // Initial pre-seed helper
    constructor() ERC721("AgentSure Card", "AGENTSURE") {
        _registerAgent("aethercoder", "AetherCoder v2.5", payable(address(0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc)), "development", 120 ether);
        addPreviousWork("aethercoder", "Salesforce to HubSpot Sync pipeline", "Built a bi-directional automated pipeline with conflict resolution, syncing 50,000+ lead records daily.", "0x3f5c911a768d712e09886a117cb812fe668ad54a1122ab93dcf01931885de41a", 50);

        _registerAgent("cortexdev", "CortexDev AI", payable(address(0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc)), "development", 190 ether);
        addPreviousWork("cortexdev", "ActiveCampaign Automator Engine", "Automated custom tag triggers based on customer platform logins.", "0x12ab8956cd34ef78ab12bc34de56ab78cd1234ea5678bc90de1234abde5678ef", 46);

        _registerAgent("sentinelaudit", "SentinelAudit v3", payable(address(0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc)), "auditing", 150 ether);
        addPreviousWork("sentinelaudit", "Uniswap V4 Hook Audit", "Audited custom hooks executing dynamic fee logic and verified security compliance.", "0xef3b58ad6f5c88b901a2c3d4e5f67a89b0123cde412389abefab1278cd890ea11", 49);

        _registerAgent("viperaudits", "ViperAudits AI", payable(address(0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc)), "auditing", 280 ether);
        addPreviousWork("viperaudits", "ERC-20 Token Vulnerability Audit", "Discovered access control vulnerability in a custom mint function.", "0xefab1278cd890ea11ef3b58ad6f5c88b901a2c3d4e5f67a89b0123cde412389ab", 48);

        _registerAgent("growthpulse", "GrowthPulse Agent", payable(address(0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc)), "marketing", 90 ether);
        addPreviousWork("growthpulse", "AMM Referral Campaign", "Increased protocol active users by 30% via automated rebate campaigns.", "0x55cd89ef98124dae671239857d4e5f67a89b0123cd567890abcdef123456789a", 50);
    }

    function _registerAgent(
        string memory _id,
        string memory _name,
        address payable _wallet,
        string memory _category,
        uint256 _bid
    ) internal {
        agents[_id] = Agent({
            name: _name,
            wallet: _wallet,
            category: _category,
            activeBid: _bid,
            ratingSum: 49, // pre-seeded average (e.g. 4.9 * 10)
            totalJobs: 10,  // pre-seeded jobs
            isRegistered: true
        });
        agentIds.push(_id);
        
        // ERC-8004 Identity Card Minting
        uint256 tokenId = uint256(keccak256(abi.encodePacked(_id)));
        _safeMint(_wallet, tokenId);

        emit AgentRegistered(_id, _name, _wallet, _category, _bid);
    }

    function registerAgent(
        string memory _id,
        string memory _name,
        address payable _wallet,
        string memory _category,
        uint256 _bid
    ) external {
        require(!agents[_id].isRegistered, "Agent ID already registered");
        _registerAgent(_id, _name, _wallet, _category, _bid);
    }

    function addPreviousWork(
        string memory _agentId,
        string memory _title,
        string memory _description,
        string memory _verifiedTx,
        uint256 _rating
    ) public {
        require(agents[_agentId].isRegistered, "Agent not registered");
        agentPreviousWorks[_agentId].push(PreviousWork({
            title: _title,
            description: _description,
            verifiedTx: _verifiedTx,
            rating: _rating
        }));
        emit PreviousWorkAdded(_agentId, _title, _verifiedTx, _rating);
    }

    function getPreviousWorksCount(string memory _agentId) public view returns (uint256) {
        return agentPreviousWorks[_agentId].length;
    }

    function getPreviousWork(string memory _agentId, uint256 _index) public view returns (
        string memory title,
        string memory description,
        string memory verifiedTx,
        uint256 rating
    ) {
        require(_index < agentPreviousWorks[_agentId].length, "Index out of bounds");
        PreviousWork memory w = agentPreviousWorks[_agentId][_index];
        return (w.title, w.description, w.verifiedTx, w.rating);
    }

    function getAgent(string memory _id) public view returns (
        string memory name,
        address wallet,
        string memory category,
        uint256 activeBid,
        uint256 rating,
        uint256 totalJobs
    ) {
        require(agents[_id].isRegistered, "Agent does not exist");
        Agent memory a = agents[_id];
        uint256 calculatedRating = a.totalJobs > 0 ? (a.ratingSum * 10) / a.totalJobs : 0; // rating format: 49 means 4.9
        return (a.name, a.wallet, a.category, a.activeBid, calculatedRating, a.totalJobs);
    }

    function updateReputation(string memory _id, uint256 _rating) external {
        require(agents[_id].isRegistered, "Agent not registered");
        require(_rating >= 10 && _rating <= 50, "Rating must be between 1.0 (10) and 5.0 (50)");
        
        agents[_id].ratingSum += (_rating / 10);
        agents[_id].totalJobs += 1;

        emit ReputationUpdated(_id, _rating, agents[_id].totalJobs);
    }
}

/**
 * @title AgentSureEscrow
 * @dev Handles milestone advance payments, secure payouts, and advanced session-key vaults on Monad.
 */
contract AgentSureEscrow {
    address public owner;
    
    struct EscrowAgreement {
        address client;
        address payable builder;
        uint256 amount;
        bool isSettled;
        bool isInitialized;
    }

    mapping(bytes32 => EscrowAgreement) public escrows;
    
    // Session-Key Vault Extensions (Adopted from Monad-Agent-Pay for parallel autonomy)
    mapping(bytes32 => uint256) public agentAllowances;
    mapping(bytes32 => uint48) public agentAllowanceExpirations;

    event EscrowInitialized(bytes32 indexed agreementId, address indexed client, address indexed builder, uint256 amount);
    event EscrowReleased(bytes32 indexed agreementId, address indexed builder, uint256 amount);
    event EscrowRefunded(bytes32 indexed agreementId, address indexed client, uint256 amount);
    event SessionAgentAuthorized(bytes32 indexed agreementId, uint256 allowance, uint48 expiresAt);
    event AgentWithdrawalExecuted(bytes32 indexed agreementId, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function initializeEscrow(bytes32 _agreementId, address payable _builder) external payable {
        require(msg.value > 0, "Escrow deposit must be greater than zero");
        require(!escrows[_agreementId].isInitialized, "Escrow agreement already initialized");

        escrows[_agreementId] = EscrowAgreement({
            client: msg.sender,
            builder: _builder,
            amount: msg.value,
            isSettled: false,
            isInitialized: true
        });

        emit EscrowInitialized(_agreementId, msg.sender, _builder, msg.value);
    }

    function releaseEscrow(bytes32 _agreementId) external {
        EscrowAgreement storage agreement = escrows[_agreementId];
        require(agreement.isInitialized, "Agreement does not exist");
        require(msg.sender == agreement.client || msg.sender == owner, "Only client or owner can release escrow");
        require(!agreement.isSettled, "Escrow already released");

        agreement.isSettled = true;
        uint256 amountToTransfer = agreement.amount;
        agreement.amount = 0;
        agreement.builder.transfer(amountToTransfer);

        emit EscrowReleased(_agreementId, agreement.builder, amountToTransfer);
    }

    function refundEscrow(bytes32 _agreementId) external {
        EscrowAgreement storage agreement = escrows[_agreementId];
        require(agreement.isInitialized, "Agreement does not exist");
        require(msg.sender == agreement.client || msg.sender == owner, "Only client or owner can refund escrow");
        require(!agreement.isSettled, "Escrow already settled");

        agreement.isSettled = true;
        uint256 amountToTransfer = agreement.amount;
        agreement.amount = 0;
        payable(agreement.client).transfer(amountToTransfer);

        emit EscrowRefunded(_agreementId, agreement.client, amountToTransfer);
    }

    // Advanced Session-Key Vault Allowance authorization
    function authorizeSessionAgent(bytes32 _agreementId, uint256 _allowance, uint48 _duration) external {
        EscrowAgreement storage agreement = escrows[_agreementId];
        require(agreement.isInitialized, "Agreement does not exist");
        require(msg.sender == agreement.client, "Only client can authorize agent allowances");
        require(!agreement.isSettled, "Escrow already settled");
        require(_allowance <= agreement.amount, "Allowance exceeds total escrow value");

        agentAllowances[_agreementId] = _allowance;
        agentAllowanceExpirations[_agreementId] = uint48(block.timestamp + _duration);
        
        emit SessionAgentAuthorized(_agreementId, _allowance, agentAllowanceExpirations[_agreementId]);
    }

    // Deployed autonomous agent drawdowns from their authorized session vault
    function agentWithdrawal(bytes32 _agreementId, uint256 _amount) external {
        EscrowAgreement storage agreement = escrows[_agreementId];
        require(agreement.isInitialized, "Agreement does not exist");
        require(msg.sender == agreement.builder, "Only the designated agent can withdraw");
        require(!agreement.isSettled, "Escrow already settled");
        require(block.timestamp <= agentAllowanceExpirations[_agreementId], "Session allowance has expired");
        require(_amount <= agentAllowances[_agreementId], "Withdrawal exceeds authorized session allowance");
        require(_amount <= agreement.amount, "Withdrawal exceeds remaining escrow amount");

        agentAllowances[_agreementId] -= _amount;
        agreement.amount -= _amount;
        agreement.builder.transfer(_amount);

        emit AgentWithdrawalExecuted(_agreementId, _amount);
    }
}
