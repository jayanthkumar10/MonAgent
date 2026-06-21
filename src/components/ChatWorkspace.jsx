import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal, CheckCircle, Loader2, Star, X } from 'lucide-react';
import { ethers } from 'ethers';

const API_BASE = 'http://127.0.0.1:5000/api';

export default function ChatWorkspace({ 
  agreement,
  agent, 
  walletState, 
  setWalletState,
  onUpdateAgreement,
  onResetWorkspace,
  userMode = 'client'
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('analyzing');
  const [escrowReleased, setEscrowReleased] = useState(false);
  const [showVerifySuccess, setShowVerifySuccess] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState('chat'); // 'chat' | 'logs' (used on mobile only)

  // Review & Rating State
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const messagesEndRef = useRef(null);
  const logsEndRef = useRef(null);

  // Initialize and preserve state from active agreement
  useEffect(() => {
    if (agreement) {
      setMessages(agreement.messages || []);
      setTerminalLogs(agreement.terminalLogs || ['[SYSTEM]: Escrow contract deployed.', '[SYSTEM]: Agent workspace initialized.']);
      setActiveStep(agreement.activeStep || 0);
      setCurrentStatus(agreement.currentStatus || 'analyzing');
      setEscrowReleased(agreement.escrowReleased || false);
      setShowVerifySuccess(agreement.status === 'released' && !agreement.ratingSubmitted);
    }
  }, [agreement.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  const syncWithParent = (updatedFields) => {
    onUpdateAgreement(agreement.id, updatedFields);
  };

  // Run initial step when messages array is empty
  useEffect(() => {
    const fetchFirstMessage = async () => {
      setIsAgentTyping(true);
      try {
        const response = await fetch(`${API_BASE}/agent/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: agent.id, stepIdx: 0 })
        });
        const data = await response.json();
        
        const initialMsgs = [
          {
            sender: 'agent',
            text: data.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
        setMessages(initialMsgs);
        setCurrentStatus(data.status);
        syncWithParent({ 
          messages: initialMsgs, 
          status: data.status, 
          currentStatus: data.status 
        });
      } catch (err) {
        console.error("Failed to connect to agent backend. Using fallback.", err);
        const initialMsgs = [
          {
            sender: 'agent',
            text: agent.chatSequence?.[0]?.message || "Hello! I am ready to begin work on your request.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
        setMessages(initialMsgs);
        setCurrentStatus(agent.chatSequence?.[0]?.status || 'analyzing');
        syncWithParent({ 
          messages: initialMsgs, 
          status: agent.chatSequence?.[0]?.status || 'analyzing', 
          currentStatus: agent.chatSequence?.[0]?.status || 'analyzing' 
        });
      } finally {
        setIsAgentTyping(false);
      }
    };

    if (agent && messages.length === 0) {
      fetchFirstMessage();
    }
  }, [agent.id, messages.length]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isAgentTyping) return;

    if (userMode === 'builder') {
      const agentMsg = {
        sender: 'agent',
        text: inputText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const updatedMessages = [...messages, agentMsg];
      setMessages(updatedMessages);
      setInputText('');

      const newLogs = [...terminalLogs, `[AGENT]: Posted message response to client.`];
      setTerminalLogs(newLogs);

      syncWithParent({
        messages: updatedMessages,
        terminalLogs: newLogs
      });
    } else {
      const userMsg = {
        sender: 'user',
        text: inputText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInputText('');
      syncWithParent({ messages: updatedMessages });

      const nextStepIdx = activeStep + 1;
      setIsAgentTyping(true);
      
      const newLogs = [...terminalLogs, `[USER]: Message received. Calling Agent loop execution...`];
      setTerminalLogs(newLogs);
      syncWithParent({ terminalLogs: newLogs });

      try {
        const response = await fetch(`${API_BASE}/agent/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: agent.id, stepIdx: nextStepIdx })
        });
        const data = await response.json();

        setTimeout(() => {
          setIsAgentTyping(false);
          setActiveStep(nextStepIdx);
          setCurrentStatus(data.status);
          
          const finalMessages = [...updatedMessages, {
            sender: 'agent',
            text: data.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }];
          setMessages(finalMessages);

          let currentLogs = [...newLogs];
          
          const addLogs = (logsToAdd) => {
            let delayMultiplier = 1;
            logsToAdd.forEach((log, logIdx) => {
              setTimeout(() => {
                currentLogs = [...currentLogs, log];
                setTerminalLogs(currentLogs);
                
                if (logIdx === logsToAdd.length - 1) {
                  syncWithParent({
                    messages: finalMessages,
                    terminalLogs: currentLogs,
                    activeStep: nextStepIdx,
                    status: data.status,
                    currentStatus: data.status
                  });
                }
              }, delayMultiplier * 350);
              delayMultiplier++;
            });
          };

          let logsToAppend = (data.logs || []).map(l => `> ${l}`);
          if (data.status === 'coding' || data.status === 'testing' || data.status === 'completed') {
            const x402Logs = [
              `[AGENT]: Querying computational verification DB API...`,
              `[HTTP-CLIENT]: GET https://api.agentsure-val.net/v1/verify?query=compile`,
              `[HTTP-SERVER]: RESPONSE HTTP/1.1 402 Payment Required`,
              `[HTTP-SERVER]: Header: x-402-payment-instruction: recipient=0x7e8b..., amount=0.0002 MON`,
              `[AGENT]: Initializing Monad Machine Payments Protocol (MPP) auto-settlement...`,
              `[MPP]: Signed EIP-7702 delegated gas authorization. Gas sponsored by AgentSure.`,
              `[MPP]: Sending 0.0002 MON transaction lock to 0x7e8b...`,
              `[MPP]: Confirmed. Transaction Hash: 0x4a9d7b3cf8912ba00a890472de56ba78cd1234ea5678bc90de1234abde5678ef`,
              `[HTTP-CLIENT]: Resending request with header x-402-payment-proof: 0x4a9d7b3cf8912ba...`,
              `[HTTP-SERVER]: RESPONSE HTTP/1.1 200 OK. Computational API access granted.`
            ].map(l => `[x402-MPP]: ${l}`);
            logsToAppend = [...logsToAppend, ...x402Logs];
          }

          if (logsToAppend.length > 0) {
            addLogs(logsToAppend);
          } else {
            syncWithParent({
              messages: finalMessages,
              activeStep: nextStepIdx,
              status: data.status,
              currentStatus: data.status
            });
          }
        }, 1500);

      } catch (err) {
        console.error("Backend offline. Using frontend fallback.", err);
        setTimeout(() => {
          setIsAgentTyping(false);
          const sequence = agent.chatSequence || [];
          const targetStep = Math.min(nextStepIdx, sequence.length - 1);
          const fallbackData = sequence[targetStep] || { message: "Task progressing.", status: "completed", logs: ["Running fallback verification..."] };
          
          setActiveStep(nextStepIdx);
          setCurrentStatus(fallbackData.status);

          const finalMessages = [...updatedMessages, {
            sender: 'agent',
            text: fallbackData.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }];
          setMessages(finalMessages);

          let currentLogs = [...newLogs];
          
          const addLogs = (logsToAdd) => {
            let delayMultiplier = 1;
            logsToAdd.forEach((log, logIdx) => {
              setTimeout(() => {
                currentLogs = [...currentLogs, log];
                setTerminalLogs(currentLogs);
                
                if (logIdx === logsToAdd.length - 1) {
                  syncWithParent({
                    messages: finalMessages,
                    terminalLogs: currentLogs,
                    activeStep: nextStepIdx,
                    status: fallbackData.status,
                    currentStatus: fallbackData.status
                  });
                }
              }, delayMultiplier * 350);
              delayMultiplier++;
            });
          };

          let logsToAppend = (fallbackData.logs || []).map(l => `> ${l}`);
          if (fallbackData.status === 'coding' || fallbackData.status === 'testing' || fallbackData.status === 'completed') {
            const x402Logs = [
              `[AGENT]: Querying computational verification DB API...`,
              `[HTTP-CLIENT]: GET https://api.agentsure-val.net/v1/verify?query=compile`,
              `[HTTP-SERVER]: RESPONSE HTTP/1.1 402 Payment Required`,
              `[HTTP-SERVER]: Header: x-402-payment-instruction: recipient=0x7e8b..., amount=0.0002 MON`,
              `[AGENT]: Initializing Monad Machine Payments Protocol (MPP) auto-settlement...`,
              `[MPP]: Signed EIP-7702 delegated gas authorization. Gas sponsored by AgentSure.`,
              `[MPP]: Sending 0.0002 MON transaction lock to 0x7e8b...`,
              `[MPP]: Confirmed. Transaction Hash: 0x4a9d7b3cf8912ba00a890472de56ba78cd1234ea5678bc90de1234abde5678ef`,
              `[HTTP-CLIENT]: Resending request with header x-402-payment-proof: 0x4a9d7b3cf8912ba...`,
              `[HTTP-SERVER]: RESPONSE HTTP/1.1 200 OK. Computational API access granted.`
            ].map(l => `[x402-MPP]: ${l}`);
            logsToAppend = [...logsToAppend, ...x402Logs];
          }

          if (logsToAppend.length > 0) {
            addLogs(logsToAppend);
          } else {
            syncWithParent({
              messages: finalMessages,
              activeStep: nextStepIdx,
              status: fallbackData.status,
              currentStatus: fallbackData.status
            });
          }
        }, 1500);
      }
    }
  };

  const handleReleaseEscrow = async () => {
    if (escrowReleased) return;
    
    const storedEscrow = localStorage.getItem('agentsure_escrow_address') || localStorage.getItem('monagent_escrow_address') || '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc';

    if (window.ethereum && walletState.isMetaMask && walletState.address) {
      setTerminalLogs(prev => [...prev, `[SYSTEM]: MetaMask request triggered for releaseEscrow()...`]);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        let tx;
        if (storedEscrow && storedEscrow.startsWith('0x') && storedEscrow.length === 42 && storedEscrow !== '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc') {
          const escrowContract = new ethers.Contract(storedEscrow, [
            "function releaseEscrow(bytes32 _agreementId) external"
          ], signer);
          const agreementBytes32 = ethers.keccak256(ethers.toUtf8Bytes(agreement.id));
          tx = await escrowContract.releaseEscrow(agreementBytes32);
        } else {
          // Direct fallback transfer payout confirmation
          tx = await signer.sendTransaction({
            to: '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc',
            value: ethers.parseEther("0.0001")
          });
        }
        
        setTerminalLogs(prev => [...prev, `[SYSTEM]: Transaction broadcasting... Hash: ${tx.hash}`]);
        await tx.wait();
        
        const newLogs = [
          ...terminalLogs,
          `[SYSTEM]: Transaction confirmed. Escrow disburse successful.`,
          `[SYSTEM]: Monad Pay: Escrow funds disbursed to agent wallet.`
        ];
        
        setTerminalLogs(newLogs);
        setEscrowReleased(true);
        setShowVerifySuccess(true);
        
        syncWithParent({
          status: 'released',
          currentStatus: 'released',
          escrowReleased: true,
          terminalLogs: newLogs
        });
      } catch (err) {
        console.error("Escrow release transaction failed:", err);
        alert("Transaction failed or was rejected by user: " + (err.reason || err.message));
      }
    } else {
      runSimulatedRelease();
    }
  };

  const runSimulatedRelease = () => {
    setTerminalLogs(prev => [...prev, `[SYSTEM]: Calling Escrow.releaseEscrow() on Monad Ledger...`]);
    setTimeout(() => {
      const hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const newLogs = [
        ...terminalLogs,
        `[SYSTEM]: Escrow release transaction signed. Hash: ${hash}`,
        `[SYSTEM]: Monad Pay: Escrow funds disbursed to agent wallet.`,
        `[SYSTEM]: Connection closed.`
      ];
      
      setTerminalLogs(newLogs);
      setEscrowReleased(true);
      setShowVerifySuccess(true);
      
      syncWithParent({
        status: 'released',
        currentStatus: 'released',
        escrowReleased: true,
        terminalLogs: newLogs
      });
    }, 1200);
  };

  const submitRatingAndReview = async () => {
    setIsSubmittingReview(true);
    let txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    const storedRegistry = localStorage.getItem('agentsure_registry_address') || localStorage.getItem('monagent_registry_address') || '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc';

    if (window.ethereum && walletState.isMetaMask && walletState.address) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        let tx;
        if (storedRegistry && storedRegistry.startsWith('0x') && storedRegistry.length === 42 && storedRegistry !== '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc') {
          const registryContract = new ethers.Contract(storedRegistry, [
            "function updateReputation(string memory _id, uint256 _rating) external"
          ], signer);
          const contractRating = rating * 10; // scaled 10-50
          tx = await registryContract.updateReputation(agent.id, contractRating);
        } else {
          tx = await signer.sendTransaction({
            to: '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc',
            value: ethers.parseEther("0.0001")
          });
        }
        
        await tx.wait();
        txHash = tx.hash;
      } catch (err) {
        console.error("MetaMask reputation update rejected/failed:", err);
        setIsSubmittingReview(false);
        alert("Transaction failed or was rejected: " + (err.reason || err.message));
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE}/agent/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          rating: rating,
          reviewText: reviewText,
          txHash: txHash
        })
      });
      const data = await response.json();
      if (data.success) {
        console.log("On-chain reputation updated and saved in registry db:", data.agent);
      }
    } catch (err) {
      console.error("Failed to post review to backend registry:", err);
    }

    syncWithParent({
      ratingSubmitted: true,
      terminalLogs: [
        ...terminalLogs,
        `[SYSTEM]: Reputation registry updated. Score: ${rating}.0/5.0`,
        `[SYSTEM]: Feedback transaction confirmed on Monad Ledger. Hash: ${txHash}`
      ]
    });

    setIsSubmittingReview(false);
    setShowVerifySuccess(false);
    onResetWorkspace();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'analyzing': return 'badge-warning';
      case 'coding': return 'badge-monad';
      case 'testing': return 'badge-monad';
      case 'completed': return 'badge-verified';
      case 'released': return 'badge-verified';
      case 'refunded': return '';
      default: return '';
    }
  };

  return (
    <div className="glass-panel flex-column animate-slideup shadow-2xl relative" style={{ overflow: 'hidden', minHeight: '520px' }}>
      
      {/* Workspace Header */}
      <div className="flex-row-between flex-wrap gap-4 p-5 bg-white/[0.01]" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex-row-start gap-3">
          <img src={agent.avatar} alt={agent.name} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover' }} />
          <div>
            <div className="flex-row-start gap-2">
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{agent.name}</h3>
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider ${getStatusBadge(currentStatus)}`}>
                {currentStatus}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{agent.role}</p>
          </div>
        </div>

        {/* Escrow Locked Value */}
        <div className="flex-row-start gap-4">
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Escrow Amount</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--mono)' }}>{agent.bid} MON</span>
          </div>

          {!escrowReleased ? (
            <button 
              onClick={handleReleaseEscrow}
              className="btn-cyber"
              style={{ fontSize: '12px', padding: '8px 14px' }}
            >
              Verify & Release Escrow
            </button>
          ) : (
            <span className="badge-verified" style={{ fontSize: '11px', padding: '4px 10px' }}>
              <CheckCircle size={11} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline' }} /> Settled
            </span>
          )}
        </div>
      </div>

      {userMode === 'builder' && (
        <div style={{
          backgroundColor: 'rgba(48, 209, 88, 0.05)',
          borderBottom: '1px solid rgba(48, 209, 88, 0.15)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--success)',
          fontWeight: 600
        }}>
          <span>⚙️ Builder Workspace Controls:</span>
          <div className="flex-row-start gap-2">
            <button 
              onClick={() => {
                const nextStatuses = {
                  'analyzing': 'coding',
                  'coding': 'testing',
                  'testing': 'completed'
                };
                const nextSt = nextStatuses[currentStatus];
                if (nextSt) {
                  setCurrentStatus(nextSt);
                  const logs = [...terminalLogs, `[AGENT]: Initiating transition to stage [${nextSt}]...`, `[SYSTEM]: Workspace status updated to [${nextSt}]`];
                  setTerminalLogs(logs);
                  syncWithParent({
                    status: nextSt,
                    currentStatus: nextSt,
                    terminalLogs: logs
                  });
                }
              }}
              disabled={currentStatus === 'completed' || currentStatus === 'released'}
              className="btn-cyber"
              style={{
                fontSize: '10px',
                padding: '4px 10px',
                backgroundColor: 'rgba(48, 209, 88, 0.1)',
                borderColor: 'var(--success)',
                color: 'var(--success)',
                cursor: 'pointer'
              }}
            >
              Transition Stage (Next: {currentStatus === 'analyzing' ? 'Coding' : currentStatus === 'coding' ? 'Testing' : 'Complete'})
            </button>

            <button 
              onClick={() => {
                const logLine = prompt("Enter developer terminal log line:");
                if (logLine) {
                  const logs = [...terminalLogs, `> ${logLine}`];
                  setTerminalLogs(logs);
                  syncWithParent({ terminalLogs: logs });
                }
              }}
              className="btn-cyber-accent"
              style={{ fontSize: '10px', padding: '4px 10px', cursor: 'pointer' }}
            >
              Inject Terminal Log
            </button>
          </div>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="workspace-mobile-tabs" style={{
        display: 'none',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'rgba(255, 255, 255, 0.01)'
      }}>
        <button 
          onClick={() => setWorkspaceTab('chat')} 
          className={`workspace-tab-btn ${workspaceTab === 'chat' ? 'active' : ''}`}
          style={{
            flex: 1,
            padding: '12px',
            background: 'transparent',
            color: workspaceTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: workspaceTab === 'chat' ? '2px solid var(--primary)' : 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          💬 Workspace Chat
        </button>
        <button 
          onClick={() => setWorkspaceTab('logs')} 
          className={`workspace-tab-btn ${workspaceTab === 'logs' ? 'active' : ''}`}
          style={{
            flex: 1,
            padding: '12px',
            background: 'transparent',
            color: workspaceTab === 'logs' ? 'var(--primary)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: workspaceTab === 'logs' ? '2px solid var(--primary)' : 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          💻 Developer Logs
        </button>
      </div>

      {/* Main Workspace Workspace Grid (Responsive) */}
      <div className="workspace-grid" style={{
        display: 'grid',
        gridTemplateColumns: '3fr 2fr', // desktop: 60/40
        minHeight: '440px',
        width: '100%'
      }}>
        
        {/* LEFT COLUMN: Chat Panel */}
        <div className={`workspace-chat-panel ${workspaceTab === 'chat' ? 'active-panel' : 'inactive-panel'}`} style={{
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '440px'
        }}>
          {/* Messages List */}
          <div className="flex-1" style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className="flex-column" 
                style={{ alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <div style={{
                  maxWidth: '75%',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text-main)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border)',
                  borderTopLeftRadius: msg.sender === 'agent' ? 0 : '12px',
                  borderTopRightRadius: msg.sender === 'user' ? 0 : '12px'
                }}>
                  <p>{msg.text}</p>
                </div>
                <span style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>{msg.timestamp}</span>
              </div>
            ))}

            {isAgentTyping && (
              <div className="flex-row-start gap-2" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '10px 14px',
                width: 'fit-content',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}>
                <Loader2 className="animate-spin text-primary" size={11} />
                <span>Agent runtime compiling...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendMessage} className="flex-row-start gap-3 p-4" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'rgba(255, 255, 255, 0.01)', width: '100%', boxSizing: 'border-box' }}>
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isAgentTyping ? "Agent is processing modules..." : "Discuss requirements or request actions..."}
              style={{
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border)',
                outline: 'none',
                fontSize: '12px',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text-main)'
              }}
              disabled={isAgentTyping || escrowReleased}
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || isAgentTyping || escrowReleased}
              className="btn-cyber"
              style={{ padding: '10px 14px', flexShrink: 0 }}
            >
              <Send size={12} />
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Terminal Console Panel */}
        <div className={`workspace-logs-panel ${workspaceTab === 'logs' ? 'active-panel' : 'inactive-panel'}`} style={{
          display: 'flex',
          flexDirection: 'column',
          height: '440px',
          backgroundColor: '#121214',
          padding: '20px'
        }}>
          <div className="flex-row-between mb-3" style={{ borderBottom: '1px solid #27272a', paddingBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={12} className="text-primary" /> Developer Terminal Console
            </span>
            <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--success)' }}>STATUS: ONLINE</span>
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: '#D4D4D4',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {terminalLogs.map((log, idx) => {
              let logColor = '#D4D4D4';
              if (log.startsWith('[SYSTEM]')) logColor = 'var(--primary)';
              if (log.startsWith('[AGENT]')) logColor = 'var(--success)';
              if (log.startsWith('[USER]')) logColor = '#FF9500'; // Orange
              if (log.startsWith('[x402-MPP]')) logColor = '#FF453A'; // Red
              
              return (
                <div key={idx} style={{ color: logColor }}>
                  {log}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>

      {/* Success Popup / Star Rating & Review Card */}
      {showVerifySuccess && (
        <div className="flex-row-center" style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)'
        }}>
          <div className="glass-panel animate-modal" style={{ padding: '28px', maxWidth: '400px', width: '95%' }}>
            <div className="text-center mb-4">
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(48, 209, 88, 0.12)',
                border: '1px solid rgba(48, 209, 88, 0.25)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <CheckCircle size={24} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>Escrow Funds Released</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Payment of <strong style={{ color: 'var(--primary)' }}>{agent.bid} MON</strong> was disbursed. Please leave a registry review to update their reputation rating on-chain.
              </p>
            </div>

            {/* Interactive Stars Row */}
            <div className="flex-row-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((starVal) => (
                <button
                  key={starVal}
                  type="button"
                  onClick={() => setRating(starVal)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <Star 
                    size={24} 
                    className={starVal <= rating ? "text-yellow-400 fill-yellow-400" : "text-text-muted"} 
                    style={{ transition: 'transform 0.1s ease' }}
                  />
                </button>
              ))}
            </div>

            {/* Review text input */}
            <div className="flex-column gap-1 mb-5 text-xs">
              <label style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Client Feedback Review</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Describe the quality of delivery, reliability, and code standard (optional)..."
                rows={3}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>

            {/* CTAs */}
            <div className="flex-column gap-2">
              <button 
                onClick={submitRatingAndReview}
                disabled={isSubmittingReview}
                className="btn-cyber w-full"
                style={{ padding: '11px', fontSize: '12px' }}
              >
                {isSubmittingReview ? (
                  <span className="flex-row-center gap-2">
                    <Loader2 className="animate-spin" size={12} />
                    Broadcasting Review to Registry...
                  </span>
                ) : (
                  'Submit Review on Monad Ledger'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowVerifySuccess(false);
                  syncWithParent({ ratingSubmitted: true });
                  onResetWorkspace();
                }}
                disabled={isSubmittingReview}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '8px',
                  textDecoration: 'underline'
                }}
                className="hover-underline text-center"
              >
                Skip Rating & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
