import React, { useState, useEffect } from 'react';
import { Cpu, Wallet, Users, Settings, Briefcase, X } from 'lucide-react';
import SearchSection from './components/SearchSection';
import ManagerAgentSimulation from './components/ManagerAgentSimulation';
import AgentProfileModal from './components/AgentProfileModal';
import WalletMock from './components/WalletMock';
import ChatWorkspace from './components/ChatWorkspace';
import MarketplaceDirectory from './components/MarketplaceDirectory';
import Dashboard from './components/Dashboard';
import rawAgents from './agentsData';
import { ethers } from 'ethers';

// Enforce hardcoded wallet address for all agents
const staticAgents = rawAgents.map(a => ({
  ...a,
  wallet: '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc'
}));

const API_BASE = 'http://127.0.0.1:5000/api';

export default function App() {
  // Mode toggle: 'client' | 'builder'
  const [userMode, setUserMode] = useState('client');

  // Navigation
  const [activeTab, setActiveTab] = useState('matching'); // 'matching' | 'directory' | 'workspace' | 'builder-gigs' | 'builder-allowances'
  
  // Search & Manager Agent State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [candidates, setCandidates] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [rejectedAgentIds, setRejectedAgentIds] = useState(new Set());

  // Smart Contract Configuration State
  const [escrowAddress, setEscrowAddress] = useState(localStorage.getItem('agentsure_escrow_address') || localStorage.getItem('monagent_escrow_address') || '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc');
  const [registryAddress, setRegistryAddress] = useState(localStorage.getItem('agentsure_registry_address') || localStorage.getItem('monagent_registry_address') || '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc');

  // Hired & Agreements State
  const [agreements, setAgreements] = useState([
    {
      id: 'ag_seeded_1',
      agent: staticAgents.find(a => a.id === 'aethercoder') || staticAgents[0],
      query: 'Salesforce to HubSpot Sync pipeline',
      status: 'coding', // stages: 'escrow-locked' -> 'analyzing' -> 'coding' -> 'testing' -> 'completed' -> 'released' | 'refunded'
      txHash: '0x3f5c911a768d712e09886a117cb812fe668ad54a1122ab93dcf01931885de41a',
      timestamp: new Date(Date.now() - 86400000 * 2).toLocaleDateString(), // 2 days ago
      messages: [
        { sender: 'agent', text: "Hello! Escrow locked. I've initiated requirements mapping for the CRM synchronization.", timestamp: "10:15 AM" },
        { sender: 'user', text: "Perfect. We need robust conflict handling if a field is modified in both CRMs.", timestamp: "10:20 AM" },
        { sender: 'agent', text: "Understood. I am coding the conflict resolution hooks now.", timestamp: "10:24 AM" }
      ],
      terminalLogs: [
        '[SYSTEM]: Escrow contract deployed.',
        '[SYSTEM]: Agent workspace initialized.',
        '> Mapping Salesforce schema fields...',
        '> Mapping HubSpot schema fields...',
        '> Detected custom conflict resolution fields.',
        '> Compiling conflict resolution module...'
      ],
      activeStep: 2,
      currentStatus: 'coding',
      escrowReleased: false,
      ratingSubmitted: false,
      allowanceAmount: 0.05,
      allowanceDuration: 3600,
      withdrawnAmount: 0
    },
    {
      id: 'ag_seeded_2',
      agent: staticAgents.find(a => a.id === 'sentinelaudit') || staticAgents[2],
      query: 'Uniswap V4 Hook Audit',
      status: 'completed', // Completed task, ready to verify and release escrow!
      txHash: '0xef3b58ad6f5c88b901a2c3d4e5f67a89b0123cde412389abefab1278cd890ea11',
      timestamp: new Date(Date.now() - 86400000).toLocaleDateString(), // 1 day ago
      messages: [
        { sender: 'agent', text: "Hello! Escrow locked. Beginning audit of Uniswap V4 hook implementation.", timestamp: "02:10 PM" },
        { sender: 'user', text: "Please pay close attention to gas usage in `afterInitialize` callback.", timestamp: "02:15 PM" },
        { sender: 'agent', text: "On it. Running sandbox tests and checking memory layout.", timestamp: "02:22 PM" },
        { sender: 'agent', text: "Audit complete. Cleaned up re-entrancy risks. You can verify results now.", timestamp: "03:40 PM" }
      ],
      terminalLogs: [
        '[SYSTEM]: Escrow contract deployed.',
        '[SYSTEM]: Agent workspace initialized.',
        '> Analyzing hook callbacks...',
        '> Running gas usage inspection...',
        '> Running slither vulnerability tests...',
        '> Verification successful. No vulnerabilities found.'
      ],
      activeStep: 3,
      currentStatus: 'completed',
      escrowReleased: false,
      ratingSubmitted: false,
      allowanceAmount: 0,
      allowanceDuration: 0,
      withdrawnAmount: 0
    }
  ]);
  const [activeAgreementId, setActiveAgreementId] = useState(null);

  const activeAgreement = agreements.find(ag => ag.id === activeAgreementId);
  const hiredAgent = activeAgreement ? activeAgreement.agent : null;

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [metaMaskConfig, setMetaMaskConfig] = useState({
    rpcUrl: 'https://rpc-devnet.monad.xyz',
    chainId: '10143',
    symbol: 'MON',
    explorerUrl: 'https://explorer.monad.xyz'
  });

  // Wallet State
  const [walletState, setWalletState] = useState({
    isConnected: false,
    isMetaMask: false,
    address: '',
    balance: 0,
    txHistory: []
  });
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [escrowPayment, setEscrowPayment] = useState(null);

  // Auto-resolve active category based on query keywords
  const getCategoryFromQuery = (query) => {
    const q = query.toLowerCase();
    if (q.includes('audit') || q.includes('contract') || q.includes('security') || q.includes('solidity')) {
      return 'auditing';
    }
    if (q.includes('marketing') || q.includes('growth') || q.includes('twitter') || q.includes('campaign') || q.includes('seo')) {
      return 'marketing';
    }
    return 'development'; // default fallback
  };

  const handleSearchSubmit = async (query) => {
    if (isSearching) return;
    setRejectedAgentIds(new Set());
    
    const detectedCat = getCategoryFromQuery(query);
    setActiveCategory(detectedCat);
    setIsSearching(true);
    setCurrentStep(0);

    try {
      const response = await fetch(`${API_BASE}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, category: detectedCat })
      });
      const data = await response.json();
      setCandidates(data.candidates);
    } catch (err) {
      console.error("Failed to connect to backend. Falling back to local data.", err);
      const pool = await fetchAgentsLocalFallback(detectedCat);
      setCandidates(pool);
    }
  };

  const fetchAgentsLocalFallback = (cat) => {
    return staticAgents.filter(a => a.category === cat);
  };

  useEffect(() => {
    if (!isSearching || currentStep < 0) return;

    if (currentStep < 4) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (currentStep === 4) {
      const timer = setTimeout(() => {
        setIsSearching(false);
        setCurrentStep(-1);
        
        const filteredPool = candidates.filter(c => !rejectedAgentIds.has(c.id));
        
        if (filteredPool.length > 0) {
          setSelectedAgent(filteredPool[0]);
          setIsProfileOpen(true);
        } else {
          alert("All candidates in this category were rejected. Direct search active.");
          setActiveTab('directory');
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isSearching, currentStep, candidates, rejectedAgentIds]);

  const handleAgentReject = () => {
    if (!selectedAgent) return;
    
    setRejectedAgentIds(prev => {
      const newSet = new Set(prev);
      newSet.add(selectedAgent.id);
      return newSet;
    });

    setIsProfileOpen(false);
    
    const nextCandidates = candidates.filter(c => c.id !== selectedAgent.id && !rejectedAgentIds.has(c.id));
    
    if (nextCandidates.length > 0) {
      setIsSearching(true);
      setCurrentStep(2);
    } else {
      alert("No other candidates found in registry. Browsing directory manually.");
      setSelectedAgent(null);
      setActiveTab('directory');
    }
  };

  const handleAgentAccept = (agent) => {
    setEscrowPayment({
      agentName: agent.name,
      amount: agent.bid
    });
    setIsWalletOpen(true);
  };

  const handleEscrowSuccess = (txHash) => {
    const newAgreement = {
      id: 'ag_' + Math.random().toString(36).substr(2, 9),
      agent: selectedAgent,
      query: searchQuery || `Direct Hire: ${selectedAgent.role}`,
      status: 'escrow-locked', // stages: 'escrow-locked' -> 'analyzing' -> 'coding' -> 'testing' -> 'completed' -> 'released' | 'refunded'
      txHash: txHash,
      timestamp: new Date().toLocaleDateString(),
      messages: [],
      terminalLogs: ['[SYSTEM]: Escrow contract deployed.', '[SYSTEM]: Agent workspace initialized.'],
      activeStep: 0,
      currentStatus: 'analyzing',
      escrowReleased: false,
      ratingSubmitted: false
    };

    setAgreements(prev => [...prev, newAgreement]);
    setActiveAgreementId(newAgreement.id);
    setIsProfileOpen(false);
    setEscrowPayment(null);
    setIsWalletOpen(false);
    setActiveTab('dashboard'); // switch to dashboard so they see their hired agent
  };

  const handleUpdateAgreement = (id, updatedFields) => {
    setAgreements(prev => prev.map(ag => {
      if (ag.id === id) {
        return { ...ag, ...updatedFields };
      }
      return ag;
    }));
  };

  const handleReleasePayment = async (agreementId) => {
    const agreement = agreements.find(ag => ag.id === agreementId);
    if (!agreement) return;

    if (window.ethereum && walletState.isMetaMask && walletState.address) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        let tx;
        const storedEscrow = localStorage.getItem('agentsure_escrow_address') || localStorage.getItem('monagent_escrow_address') || '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc';
        
        if (storedEscrow && storedEscrow.startsWith('0x') && storedEscrow.length === 42 && storedEscrow !== '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc') {
          const escrowContract = new ethers.Contract(storedEscrow, [
            "function releaseEscrow(bytes32 _agreementId) external"
          ], signer);
          const agreementBytes32 = ethers.keccak256(ethers.toUtf8Bytes(agreementId));
          tx = await escrowContract.releaseEscrow(agreementBytes32);
        } else {
          // Fallback direct payout confirmation transfer to the hardcoded agent address
          tx = await signer.sendTransaction({
            to: '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc',
            value: ethers.parseEther("0.0001") // gas sponsorship trigger
          });
        }
        
        await tx.wait(); // wait for confirmation
        
        setAgreements(prev => prev.map(ag => {
          if (ag.id === agreementId) {
            return { 
              ...ag, 
              status: 'released',
              escrowReleased: true,
              terminalLogs: [
                ...(ag.terminalLogs || []),
                `[SYSTEM]: User confirmed Escrow Release in MetaMask. Tx: ${tx.hash}`,
                `[SYSTEM]: Monad Pay: Escrow funds disbursed to agent wallet.`,
                `[SYSTEM]: Registry reputation status updated on-chain.`
              ]
            };
          }
          return ag;
        }));
      } catch (err) {
        console.error("Release escrow transaction failed:", err);
        alert("Transaction failed or was rejected by user: " + (err.reason || err.message || "MetaMask error."));
      }
    } else {
      simulateRelease(agreementId);
    }
  };

  const simulateRelease = (agreementId) => {
    setAgreements(prev => prev.map(ag => {
      if (ag.id === agreementId) {
        const randomTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        return { 
          ...ag, 
          status: 'released',
          escrowReleased: true,
          terminalLogs: [
            ...(ag.terminalLogs || []),
            `[SYSTEM]: Escrow release transaction signed. Tx: ${randomTx}`,
            `[SYSTEM]: Monad Pay: Escrow funds disbursed to agent wallet.`,
            `[SYSTEM]: Registry reputation status updated on-chain.`
          ]
        };
      }
      return ag;
    }));
  };

  const handleRefund = async (agreementId) => {
    const agreement = agreements.find(ag => ag.id === agreementId);
    if (!agreement) return;

    if (window.ethereum && walletState.isMetaMask && walletState.address) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        let tx;
        const storedEscrow = localStorage.getItem('agentsure_escrow_address') || localStorage.getItem('monagent_escrow_address') || '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc';

        if (storedEscrow && storedEscrow.startsWith('0x') && storedEscrow.length === 42 && storedEscrow !== '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc') {
          const escrowContract = new ethers.Contract(storedEscrow, [
            "function refundEscrow(bytes32 _agreementId) external"
          ], signer);
          const agreementBytes32 = ethers.keccak256(ethers.toUtf8Bytes(agreementId));
          tx = await escrowContract.refundEscrow(agreementBytes32);
        } else {
          // Minimal gas validation tx for direct fallback refund
          tx = await signer.sendTransaction({
            to: walletState.address,
            value: ethers.parseEther("0.0001")
          });
        }
        
        await tx.wait(); // wait for confirmation
        
        // Refund bid amount to wallet balance locally
        setWalletState(prev => ({
          ...prev,
          balance: prev.balance + agreement.agent.bid
        }));

        setAgreements(prev => prev.map(ag => {
          if (ag.id === agreementId) {
            return { 
              ...ag, 
              status: 'refunded',
              terminalLogs: [
                ...(ag.terminalLogs || []),
                `[SYSTEM]: User confirmed Escrow Refund in MetaMask. Tx: ${tx.hash}`,
                `[SYSTEM]: Monad Pay: Escrow funds returned to client wallet.`,
                `[SYSTEM]: Agreement terminated.`
              ]
            };
          }
          return ag;
        }));
      } catch (err) {
        console.error("Refund escrow transaction failed:", err);
        alert("Transaction failed or was rejected by user: " + (err.reason || err.message || "MetaMask error."));
      }
    } else {
      simulateRefund(agreementId);
    }
  };

  const simulateRefund = (agreementId) => {
    const agreement = agreements.find(ag => ag.id === agreementId);
    if (!agreement) return;

    setWalletState(prev => ({
      ...prev,
      balance: prev.balance + agreement.agent.bid
    }));

    setAgreements(prev => prev.map(ag => {
      if (ag.id === agreementId) {
        const randomTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        return { 
          ...ag, 
          status: 'refunded',
          terminalLogs: [
            ...(ag.terminalLogs || []),
            `[SYSTEM]: Escrow refund transaction signed. Tx: ${randomTx}`,
            `[SYSTEM]: Monad Pay: Escrow funds returned to client wallet.`,
            `[SYSTEM]: Agreement terminated.`
          ]
        };
      }
      return ag;
    }));
  };

  const handleDirectSelect = (agent) => {
    setSelectedAgent(agent);
    setIsProfileOpen(true);
  };

  return (
    <div className="flex-column" style={{ minHeight: '100vh', position: 'relative' }}>
      
      {/* Sticky header */}
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 30, 
        borderBottom: '1px solid var(--border)', 
        backgroundColor: 'rgba(9, 9, 11, 0.8)',
        backdropFilter: 'blur(12px)',
        height: '64px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="layout-container flex-row-between" style={{ width: '100%' }}>
          
          {/* Brand Logo */}
          <div 
            onClick={() => {
              if (userMode === 'client') {
                setActiveTab('matching');
              } else {
                setActiveTab('builder-gigs');
              }
              setSelectedAgent(null);
            }}
            className="flex-row-start gap-2" 
            style={{ cursor: 'pointer' }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#fff',
              fontSize: '15px'
            }}>
              A
            </div>
            <span style={{ 
              fontWeight: 800, 
              fontSize: '16px', 
              letterSpacing: '0.05em', 
              color: 'var(--text-main)' 
            }}>
              Agent<span style={{ color: 'var(--primary)' }}>Sure</span>
            </span>
          </div>

          {/* Navigation Middle Tabs */}
          <nav className="desktop-nav flex-row-start gap-1">
            {userMode === 'client' ? (
              <>
                <button 
                  onClick={() => {
                    setActiveTab('matching');
                    setSelectedAgent(null);
                  }}
                  className={`tab-btn flex-row-start gap-2 ${activeTab === 'matching' ? 'active' : ''}`}
                >
                  <Cpu size={14} /> Matching Hub
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('directory');
                    setSelectedAgent(null);
                  }}
                  className={`tab-btn flex-row-start gap-2 ${activeTab === 'directory' ? 'active' : ''}`}
                >
                  <Users size={14} /> Directory
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('dashboard');
                    setSelectedAgent(null);
                  }}
                  className={`tab-btn flex-row-start gap-2 ${activeTab === 'dashboard' ? 'active' : ''}`}
                >
                  <Briefcase size={14} /> Dashboard
                </button>
                {hiredAgent && (
                  <button 
                    onClick={() => setActiveTab('workspace')}
                    className={`tab-btn flex-row-start gap-2 ${activeTab === 'workspace' ? 'active' : ''}`}
                  >
                    <span className="pulse-dot"></span>
                    Active Workspace
                  </button>
                )}
              </>
            ) : (
              <>
                <button 
                  onClick={() => {
                    setActiveTab('builder-gigs');
                    setSelectedAgent(null);
                  }}
                  className={`tab-btn flex-row-start gap-2 ${activeTab === 'builder-gigs' ? 'active' : ''}`}
                >
                  <Briefcase size={14} /> Gigs Dashboard
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('builder-allowances');
                    setSelectedAgent(null);
                  }}
                  className={`tab-btn flex-row-start gap-2 ${activeTab === 'builder-allowances' ? 'active' : ''}`}
                >
                  <Briefcase size={14} /> Session Allowances
                </button>
                {activeAgreementId && (
                  <button 
                    onClick={() => setActiveTab('workspace')}
                    className={`tab-btn flex-row-start gap-2 ${activeTab === 'workspace' ? 'active' : ''}`}
                  >
                    <span className="pulse-dot"></span>
                    Builder Workspace
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Wallet Actions Right */}
          <div className="flex-row-start gap-2">
            <button 
              onClick={() => {
                const newMode = userMode === 'client' ? 'builder' : 'client';
                setUserMode(newMode);
                setActiveTab(newMode === 'client' ? 'matching' : 'builder-gigs');
                setSelectedAgent(null);
              }}
              className="btn-cyber"
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                backgroundColor: userMode === 'builder' ? 'rgba(48, 209, 88, 0.1)' : 'rgba(10, 132, 255, 0.1)',
                borderColor: userMode === 'builder' ? 'var(--success)' : 'var(--primary)',
                color: userMode === 'builder' ? 'var(--success)' : 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              <span className="hide-on-mobile">{userMode === 'client' ? '💼 Client View' : '⚙️ Builder View'}</span>
              <span className="show-on-mobile">{userMode === 'client' ? '💼 Client' : '⚙️ Builder'}</span>
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '8px',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="MetaMask Settings"
            >
              <Settings size={16} />
            </button>

            {walletState.isConnected ? (
              <button 
                onClick={() => setIsWalletOpen(true)}
                className="flex-row-start gap-2"
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--primary)',
                  backgroundColor: 'rgba(10, 132, 255, 0.05)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'var(--mono)',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <Wallet size={12} />
                <span className="hide-on-mobile">{walletState.balance.toFixed(2)} MON</span>
                <span className="hide-on-mobile" style={{ opacity: 0.3 }}>|</span>
                <span>{walletState.address.substring(0, 6)}...</span>
              </button>
            ) : (
              <button 
                onClick={() => setIsWalletOpen(true)}
                className="btn-cyber-accent"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <Wallet size={12} />
                <span className="hide-on-mobile">Connect Wallet</span>
                <span className="show-on-mobile">Connect</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1" style={{ padding: '40px 0', position: 'relative', zIndex: 10 }}>
        
        {/* MATCHING HUB TAB */}
        {activeTab === 'matching' && (
          <div className="layout-container" style={{ maxWidth: '780px' }}>
            {!isSearching && currentStep === -1 && (
              <SearchSection 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSubmitSearch={handleSearchSubmit}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                isSearching={isSearching}
              />
            )}

            {isSearching && (
              <ManagerAgentSimulation 
                currentStep={currentStep}
                candidates={candidates}
                category={activeCategory}
              />
            )}
            
            {hiredAgent && !isSearching && (
              <div className="glass-panel text-center mt-8" style={{ padding: '32px', maxWidth: '380px', margin: '32px auto 0' }}>
                <span className="pulse-dot mb-3"></span>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Hired Contractor Active</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Escrow locked. Collaborative workspace is active for <strong>{hiredAgent.name}</strong>.
                </p>
                <button onClick={() => setActiveTab('workspace')} className="btn-cyber" style={{ width: '100%', padding: '10px' }}>
                  Enter Active Workspace
                </button>
              </div>
            )}
          </div>
        )}

        {/* DIRECTORY TAB */}
        {activeTab === 'directory' && (
          <MarketplaceDirectory 
            onSelectAgent={handleDirectSelect}
          />
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="layout-container">
            <Dashboard 
              agreements={agreements}
              onSelectAgreement={(id) => {
                setActiveAgreementId(id);
                setActiveTab('workspace');
              }}
              onReleasePayment={handleReleasePayment}
              onRefund={handleRefund}
            />
          </div>
        )}

        {/* ACTIVE WORKSPACE TAB */}
        {activeTab === 'workspace' && (
          <div className="layout-container">
            {activeAgreement ? (
              <ChatWorkspace 
                agreement={activeAgreement}
                agent={activeAgreement.agent}
                walletState={walletState}
                setWalletState={setWalletState}
                onUpdateAgreement={handleUpdateAgreement}
                onResetWorkspace={() => {
                  setActiveAgreementId(null);
                  setActiveTab(userMode === 'builder' ? 'builder-gigs' : 'dashboard');
                }}
                userMode={userMode}
              />
            ) : (
              <div className="glass-panel text-center" style={{ padding: '40px', maxWidth: '320px', margin: '0 auto' }}>
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '16px', fontSize: '12px' }}>No active contract agreements.</p>
                <button 
                  onClick={() => setActiveTab(userMode === 'builder' ? 'builder-gigs' : 'matching')} 
                  className="btn-cyber" 
                  style={{ fontSize: '12px' }}
                >
                  {userMode === 'builder' ? 'Awaiting Assignments' : 'Find Agent Match'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* BUILDER GIGS TAB */}
        {activeTab === 'builder-gigs' && (
          <div className="layout-container">
            <div className="mb-6 flex-row-between flex-wrap gap-4">
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Agent Contractor Dashboard</h2>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manage your assigned client projects, submit deliverables, and trigger milestone reviews.</p>
              </div>
              <div className="badge-verified" style={{ fontSize: '11px', padding: '6px 12px', fontFamily: 'var(--mono)' }}>
                Contractor Wallet: 0x847EC...3Cc
              </div>
            </div>

            {agreements.length === 0 ? (
              <div className="glass-panel text-center" style={{ padding: '48px 24px', maxWidth: '500px', margin: '0 auto' }}>
                <Briefcase size={32} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>No Active Gigs Assigned</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wait for clients to hire your agent identities from the directory.</p>
              </div>
            ) : (
              <div className="flex-column gap-4">
                {agreements.map((agreement) => {
                  const isFinished = agreement.status === 'completed' || agreement.status === 'released';
                  const isRefunded = agreement.status === 'refunded';

                  return (
                    <div 
                      key={agreement.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '20px 24px', 
                        border: agreement.status === 'released' ? '1px solid rgba(48, 209, 88, 0.3)' : '1px solid var(--border)' 
                      }}
                    >
                      <div className="flex-row-between flex-wrap gap-4 mb-4">
                        <div className="flex-row-start gap-3">
                          <img 
                            src={agreement.agent.avatar} 
                            alt={agreement.agent.name} 
                            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} 
                          />
                          <div>
                            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{agreement.query}</h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Assigned Agent: <strong style={{ color: 'var(--text-secondary)' }}>{agreement.agent.name}</strong> • Client: <span style={{ fontFamily: 'var(--mono)' }}>0xClient...</span>
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '11px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Escrow Balance</span>
                          <strong style={{ color: 'var(--primary)', fontFamily: 'var(--mono)' }}>{agreement.agent.bid} MON</strong>
                        </div>
                      </div>

                      {/* Gigs Controls */}
                      <div className="flex-row-between flex-wrap gap-4 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        <div className="flex-row-start gap-2">
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Status: <strong style={{ textTransform: 'uppercase', color: 'var(--text-main)' }}>{agreement.status}</strong>
                          </span>
                        </div>

                        <div className="flex-row-start gap-2">
                          {!isFinished && !isRefunded && (
                            <>
                              {agreement.status !== 'completed' && (
                                <button 
                                  onClick={() => {
                                    handleUpdateAgreement(agreement.id, { 
                                      status: 'completed',
                                      currentStatus: 'completed',
                                      terminalLogs: [
                                        ...(agreement.terminalLogs || []),
                                        `[AGENT]: Finalized all code features.`,
                                        `[AGENT]: Executing compilation checklist... Success.`,
                                        `[SYSTEM]: Agent marked task as COMPLETED. Awaiting client release.`
                                      ]
                                    });
                                    alert('Project marked as completed! Client has been notified to release payouts.');
                                  }}
                                  className="btn-cyber"
                                  style={{ fontSize: '10px', padding: '6px 12px', backgroundColor: 'var(--success)' }}
                                >
                                  Submit Code Deliverables
                                </button>
                              )}
                              {agreement.status === 'completed' && (
                                <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 600 }}>
                                  ✓ Deliverables submitted. Awaiting client payout release.
                                </span>
                              )}
                            </>
                          )}

                          {agreement.status === 'released' && (
                            <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 600 }}>
                              ✓ Escrow Released. Payout disbursed to your wallet address.
                            </span>
                          )}

                          {agreement.status === 'refunded' && (
                            <span style={{ fontSize: '10px', color: 'var(--error)' }}>
                              ✗ Agreement cancelled. Funds refunded to client.
                            </span>
                          )}

                          <button 
                            onClick={() => {
                              setActiveAgreementId(agreement.id);
                              setActiveTab('workspace');
                            }}
                            className="btn-cyber-accent"
                            style={{ fontSize: '10px', padding: '6px 12px' }}
                          >
                            Open Builder Workspace
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BUILDER ALLOWANCES TAB */}
        {activeTab === 'builder-allowances' && (
          <div className="layout-container">
            <div className="mb-6">
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Smart Vault Session Allowances</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Claim time-bound session allowances granted by clients for gas sub-schedules or compute costs.</p>
            </div>

            <div className="grid-cols-2-col gap-6">
              {/* Active Allowances */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  Active Allowances Registry
                </h3>

                {agreements.filter(a => a.allowanceAmount > 0).length === 0 ? (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active session-key allowances found.</p>
                ) : (
                  <div className="flex-column gap-3">
                    {agreements.filter(a => a.allowanceAmount > 0).map(agreement => {
                      const remaining = Math.max(0, agreement.allowanceAmount - agreement.withdrawnAmount);

                      const handleWithdrawAllowance = async () => {
                        if (remaining <= 0) return;
                        
                        const drawAmount = 0.01;
                        if (window.ethereum && walletState.isMetaMask && walletState.address) {
                          try {
                            const provider = new ethers.BrowserProvider(window.ethereum);
                            const signer = await provider.getSigner();
                            const storedEscrow = localStorage.getItem('agentsure_escrow_address') || localStorage.getItem('monagent_escrow_address') || '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc';

                            let tx;
                            if (storedEscrow && storedEscrow.startsWith('0x') && storedEscrow.length === 42 && storedEscrow !== '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc') {
                              const escrowContract = new ethers.Contract(storedEscrow, [
                                "function agentWithdrawal(bytes32 _agreementId, uint256 _amount) external"
                              ], signer);
                              const agreementBytes32 = ethers.keccak256(ethers.toUtf8Bytes(agreement.id));
                              tx = await escrowContract.agentWithdrawal(agreementBytes32, ethers.parseEther(drawAmount.toString()));
                            } else {
                              // Fallback direct payout to agent wallet (0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc)
                              tx = await signer.sendTransaction({
                                to: '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc',
                                value: ethers.parseEther(drawAmount.toString())
                              });
                            }

                            await tx.wait();
                            
                            handleUpdateAgreement(agreement.id, {
                              withdrawnAmount: agreement.withdrawnAmount + drawAmount,
                              terminalLogs: [
                                ...(agreement.terminalLogs || []),
                                `[SYSTEM]: Builder claimed session allowance drawdown of ${drawAmount} MON. Tx: ${tx.hash}`
                              ]
                            });

                            alert(`Successfully withdrew ${drawAmount} MON to your contractor wallet!`);
                          } catch (err) {
                            console.error("Agent withdrawal transaction failed:", err);
                            alert("Withdrawal failed or was rejected: " + (err.reason || err.message));
                          }
                        } else {
                          // Simulated drawdown
                          handleUpdateAgreement(agreement.id, {
                            withdrawnAmount: agreement.withdrawnAmount + drawAmount,
                            terminalLogs: [
                              ...(agreement.terminalLogs || []),
                              `[SYSTEM]: Builder claimed simulated session allowance drawdown of ${drawAmount} MON.`
                            ]
                          });
                          alert(`Simulated drawdown: Withdrew ${drawAmount} MON successfully.`);
                        }
                      };

                      return (
                        <div key={agreement.id} style={{
                          border: '1px solid var(--border)',
                          backgroundColor: 'rgba(255, 255, 255, 0.01)',
                          borderRadius: '10px',
                          padding: '16px'
                        }}>
                          <div className="flex-row-between mb-2">
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{agreement.query}</span>
                            <span className="badge-monad" style={{ fontSize: '9px' }}>Active</span>
                          </div>
                          
                          <div className="flex-column gap-1 text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                            <div className="flex-row-between">
                              <span>Total Authorized:</span>
                              <span style={{ color: 'var(--text-main)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{agreement.allowanceAmount} MON</span>
                            </div>
                            <div className="flex-row-between">
                              <span>Withdrawn:</span>
                              <span style={{ color: 'var(--text-main)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{agreement.withdrawnAmount.toFixed(2)} MON</span>
                            </div>
                            <div className="flex-row-between">
                              <span>Remaining Allowance:</span>
                              <span style={{ color: 'var(--primary)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{remaining.toFixed(2)} MON</span>
                            </div>
                          </div>

                          <button 
                            onClick={handleWithdrawAllowance}
                            disabled={remaining <= 0}
                            className="btn-cyber w-full"
                            style={{ padding: '8px', fontSize: '11px' }}
                          >
                            {remaining <= 0 ? 'Limit Reached' : 'Drawdown 0.01 MON Gas Budget'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Guide card */}
              <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'rgba(10, 132, 255, 0.02)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px' }}>
                  How Session Allowances Work
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                  AgentSure supports time-bound, client-delegated spending vaults. Clients can authorize a micro-allowance of MON tokens to an agent's hot key.
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                  This allows the agent to withdraw gas budgets or pay third-party API providers autonomously without requiring the client's signature prompt for every sub-execution.
                </p>
                <div style={{
                  border: '1px solid var(--border)',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.4
                }}>
                  // On-chain function signature<br/>
                  AgentSureEscrow.agentWithdrawal(<br/>
                  &nbsp;&nbsp;bytes32 agreementId,<br/>
                  &nbsp;&nbsp;uint256 amount<br/>
                  );
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border)', 
        backgroundColor: 'rgba(9, 9, 11, 0.4)', 
        padding: '24px 0',
        fontSize: '11px',
        color: 'var(--text-muted)'
      }}>
        <div className="layout-container flex-row-between flex-wrap gap-4">
          <p>© 2026 AgentSure. Autonomous Agent Registry.</p>
          <div className="flex-row-start gap-2">
            <span className="badge-monad flex-row-start gap-2" style={{ border: 'none', background: 'transparent', padding: 0 }}>
              <span className="pulse-dot"></span> monad parallel evm devnet
            </span>
          </div>
        </div>
      </footer>

      {/* Recommended Agent Modal */}
      {selectedAgent && (
        <AgentProfileModal 
          agent={selectedAgent}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onAccept={handleAgentAccept}
          onReject={handleAgentReject}
          isFirstMatch={rejectedAgentIds.size === 0}
        />
      )}

      {/* Wallet Escrow Modal */}
      <WalletMock 
        isOpen={isWalletOpen}
        onClose={() => {
          setIsWalletOpen(false);
          setEscrowPayment(null);
        }}
        walletState={walletState}
        setWalletState={setWalletState}
        escrowPayment={escrowPayment}
        onEscrowSuccess={handleEscrowSuccess}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="animate-fadein flex-row-center" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          padding: '16px'
        }}>
          <div className="glass-panel animate-modal" style={{
            width: '100%',
            maxWidth: '380px',
            padding: '24px',
            position: 'relative',
            backgroundColor: 'var(--bg-modal)'
          }}>
            <button 
              onClick={() => setIsSettingsOpen(false)} 
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={14} />
            </button>

            <div className="flex-row-start gap-3 mb-5" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{
                padding: '6px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)'
              }}>
                <Settings className="text-primary" size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>MetaMask Configuration</h3>
                <span style={{ fontSize: '8px', fontFamily: 'var(--mono)', color: 'var(--primary)', textTransform: 'uppercase' }}>Monad Testnet</span>
              </div>
            </div>

            <div className="flex-column gap-3 text-xs">
              <div className="flex-column gap-1">
                <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>RPC URL</label>
                <input 
                  type="text" 
                  value={metaMaskConfig.rpcUrl} 
                  onChange={(e) => setMetaMaskConfig({ ...metaMaskConfig, rpcUrl: e.target.value })}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="flex-column gap-1">
                <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Chain ID</label>
                <input 
                  type="text" 
                  value={metaMaskConfig.chainId} 
                  onChange={(e) => setMetaMaskConfig({ ...metaMaskConfig, chainId: e.target.value })}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="flex-column gap-1">
                <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Currency Symbol</label>
                <input 
                  type="text" 
                  value={metaMaskConfig.symbol} 
                  onChange={(e) => setMetaMaskConfig({ ...metaMaskConfig, symbol: e.target.value })}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="flex-column gap-1">
                <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Block Explorer URL</label>
                <input 
                  type="text" 
                  value={metaMaskConfig.explorerUrl} 
                  onChange={(e) => setMetaMaskConfig({ ...metaMaskConfig, explorerUrl: e.target.value })}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="flex-column gap-1">
                <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Escrow Contract Address</label>
                <input 
                  type="text" 
                  value={escrowAddress} 
                  onChange={(e) => setEscrowAddress(e.target.value)}
                  placeholder="0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="flex-column gap-1 mb-3">
                <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Registry Contract Address</label>
                <input 
                  type="text" 
                  value={registryAddress} 
                  onChange={(e) => setRegistryAddress(e.target.value)}
                  placeholder="0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button 
                onClick={() => {
                  localStorage.setItem('agentsure_escrow_address', escrowAddress);
                  localStorage.setItem('agentsure_registry_address', registryAddress);
                  setIsSettingsOpen(false);
                  alert('MetaMask and contract configurations saved.');
                }}
                className="btn-cyber w-full"
                style={{ padding: '10px' }}
              >
                Save Network Config
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-nav-bar">
        {userMode === 'client' ? (
          <>
            <button 
              onClick={() => {
                setActiveTab('matching');
                setSelectedAgent(null);
              }}
              className={`mobile-nav-item ${activeTab === 'matching' ? 'active' : ''}`}
            >
              <Cpu size={18} />
              <span>Matching</span>
            </button>
            <button 
              onClick={() => {
                setActiveTab('directory');
                setSelectedAgent(null);
              }}
              className={`mobile-nav-item ${activeTab === 'directory' ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Directory</span>
            </button>
            <button 
              onClick={() => {
                setActiveTab('dashboard');
                setSelectedAgent(null);
              }}
              className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <Briefcase size={18} />
              <span>Dashboard</span>
            </button>
            {hiredAgent && (
              <button 
                onClick={() => setActiveTab('workspace')}
                className={`mobile-nav-item ${activeTab === 'workspace' ? 'active' : ''}`}
              >
                <span className="pulse-dot" style={{ position: 'absolute', top: '8px', right: '28%' }}></span>
                <Cpu size={18} style={{ color: 'var(--success)' }} />
                <span>Workspace</span>
              </button>
            )}
          </>
        ) : (
          <>
            <button 
              onClick={() => {
                setActiveTab('builder-gigs');
                setSelectedAgent(null);
              }}
              className={`mobile-nav-item ${activeTab === 'builder-gigs' ? 'active' : ''}`}
            >
              <Briefcase size={18} />
              <span>Gigs</span>
            </button>
            <button 
              onClick={() => {
                setActiveTab('builder-allowances');
                setSelectedAgent(null);
              }}
              className={`mobile-nav-item ${activeTab === 'builder-allowances' ? 'active' : ''}`}
            >
              <Briefcase size={18} style={{ color: 'var(--primary)' }} />
              <span>Allowances</span>
            </button>
            {activeAgreementId && (
              <button 
                onClick={() => setActiveTab('workspace')}
                className={`mobile-nav-item ${activeTab === 'workspace' ? 'active' : ''}`}
              >
                <span className="pulse-dot" style={{ position: 'absolute', top: '8px', right: '28%' }}></span>
                <Cpu size={18} style={{ color: 'var(--success)' }} />
                <span>Workspace</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
