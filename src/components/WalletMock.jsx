import React, { useState } from 'react';
import { Wallet, X, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';

export default function WalletMock({ 
  isOpen, 
  onClose, 
  walletState, 
  setWalletState, 
  escrowPayment = null, 
  onEscrowSuccess 
}) {
  const { isConnected, address, balance, txHistory } = walletState;
  const [isConnecting, setIsConnecting] = useState(false);
  const [txProgress, setTxProgress] = useState(null); // 'broadcasting' | 'validating' | 'confirmed' | null
  const [activeTxHash, setActiveTxHash] = useState('');

  const [manualAddress, setManualAddress] = useState('');
  const [manualBalance, setManualBalance] = useState(10.00);

  const handleManualImport = (e) => {
    e.preventDefault();
    if (!manualAddress.trim()) {
      alert("Please enter a wallet address.");
      return;
    }
    if (!manualAddress.startsWith('0x') || manualAddress.length !== 42) {
      alert("Please enter a valid EVM address (starting with 0x, 42 characters).");
      return;
    }

    setWalletState({
      isConnected: true,
      isMetaMask: false,
      address: manualAddress.trim(),
      balance: parseFloat(manualBalance) || 0,
      txHistory: []
    });
  };

  if (!isOpen) return null;


  const handleConnect = async () => {
    if (window.ethereum) {
      setIsConnecting(true);
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const userAddress = accounts[0];
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x279f' }] // Monad Devnet (Chain ID 10143)
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x279f',
                chainName: 'Monad Testnet',
                rpcUrls: ['https://rpc-devnet.monad.xyz'],
                nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                blockExplorerUrls: ['https://explorer.monad.xyz']
              }]
            });
          }
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const userBalance = await provider.getBalance(userAddress);
        const formattedBalance = parseFloat(ethers.formatEther(userBalance));

        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          isMetaMask: true,
          address: userAddress,
          balance: formattedBalance
        }));
      } catch (err) {
        console.error("MetaMask connection failed:", err);
        alert("Failed to connect MetaMask. Using simulation mode instead.");
        simulateConnection();
      } finally {
        setIsConnecting(false);
      }
    } else {
      simulateConnection();
    }
  };

  const simulateConnection = () => {
    setIsConnecting(true);
    setTimeout(() => {
      const mockAddress = '0x' + Array.from({ length: 40 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      setWalletState(prev => ({
        ...prev,
        isConnected: true,
        isMetaMask: false,
        address: mockAddress,
        balance: 10.00 // Seed with 10.00 MON to match testnet balance
      }));
      setIsConnecting(false);
    }, 1000);
  };

  const handleDisconnect = () => {
    setWalletState(prev => ({
      ...prev,
      isConnected: false,
      isMetaMask: false,
      address: '',
      balance: 0
    }));
  };

  const triggerEscrowPayment = async () => {
    if (!escrowPayment) return;
    
    if (window.ethereum && walletState.isMetaMask && address) {
      setTxProgress('broadcasting');
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const escrowAddress = localStorage.getItem('agentsure_escrow_address') || localStorage.getItem('monagent_escrow_address') || '';
        let tx;

        if (escrowAddress && escrowAddress.startsWith('0x') && escrowAddress.length === 42) {
          // Real on-chain smart contract call
          const escrowContract = new ethers.Contract(escrowAddress, [
            "function initializeEscrow(bytes32 _agreementId, address payable _builder) external payable"
          ], signer);
          
          // Generate deterministic bytes32 agreementId based on random seed
          const agreementIdString = 'ag_' + Math.random().toString(36).substr(2, 9);
          const agreementId = ethers.keccak256(ethers.toUtf8Bytes(agreementIdString));
          const builderAddress = '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc'; // Hardcoded agent wallet

          tx = await escrowContract.initializeEscrow(
            agreementId,
            builderAddress,
            { value: ethers.parseEther(escrowPayment.amount.toString()) }
          );
        } else {
          // Fallback direct transfer to the hardcoded escrow/agent wallet address
          const targetAddress = '0x847EC14bB6713C97335baBB2B7b70Fb0ebD443Cc';
          tx = await signer.sendTransaction({
            to: targetAddress,
            value: ethers.parseEther(escrowPayment.amount.toString())
          });
        }

        setTxProgress('validating');
        const receipt = await tx.wait(); // Wait for actual block confirmation on Monad

        setActiveTxHash(receipt.hash);
        setTxProgress('confirmed');

        const userBalance = await provider.getBalance(address);
        const formattedBalance = parseFloat(ethers.formatEther(userBalance));

        setWalletState(prev => ({
          ...prev,
          balance: formattedBalance,
          txHistory: [
            {
              hash: receipt.hash,
              type: escrowAddress ? 'Escrow Contract Lock' : 'Escrow Direct Lock',
              amount: escrowPayment.amount,
              agentName: escrowPayment.agentName,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'Success'
            },
            ...prev.txHistory
          ]
        }));

        setTimeout(() => {
          setTxProgress(null);
          onEscrowSuccess(receipt.hash);
        }, 1200);

      } catch (err) {
        console.error("On-chain transaction failed:", err);
        setTxProgress(null);
        alert("Transaction failed or was rejected by user: " + (err.reason || err.message || "MetaMask error."));
      }
    } else {
      runSimulatedPayment();
    }
  };

  const runSimulatedPayment = () => {
    setTxProgress('broadcasting');
    setTimeout(() => {
      setTxProgress('validating');
      setTimeout(() => {
        const hash = '0x' + Array.from({ length: 64 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        
        setActiveTxHash(hash);
        setTxProgress('confirmed');
        
        setWalletState(prev => ({
          ...prev,
          balance: prev.balance - escrowPayment.amount,
          txHistory: [
            {
              hash,
              type: 'Escrow Lock (Sim)',
              amount: escrowPayment.amount,
              agentName: escrowPayment.agentName,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'Success'
            },
            ...prev.txHistory
          ]
        }));

        setTimeout(() => {
          setTxProgress(null);
          onEscrowSuccess(hash);
        }, 1200);

      }, 1000);
    }, 1000);
  };

  return (
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
        maxWidth: '360px',
        padding: '24px',
        position: 'relative',
        backgroundColor: 'var(--bg-modal)'
      }}>
        <button 
          onClick={onClose} 
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
          disabled={txProgress !== null}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div className="flex-row-start gap-3 mb-5" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div style={{
            padding: '6px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border)'
          }}>
            <Wallet className="text-primary" size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Monad Wallet</h3>
            <span style={{ fontSize: '8px', fontFamily: 'var(--mono)', color: 'var(--primary)', textTransform: 'uppercase' }}>Monad EVM</span>
          </div>
        </div>

        {/* Connection UI */}
        {!isConnected ? (
          <div className="text-center" style={{ padding: '8px 0' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Connect your Monad Wallet credentials to secure code escrow contracts.
            </p>
            <button 
              onClick={handleConnect} 
              className="btn-cyber"
              style={{ width: '100%', padding: '12px', fontSize: '12px', marginBottom: '8px' }}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <span className="flex-row-center gap-2">
                  <Loader2 className="animate-spin" size={12} />
                  Initializing keys...
                </span>
              ) : (
                'Connect Monad Wallet'
              )}
            </button>

            <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or import manually</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
            </div>

            <form onSubmit={handleManualImport} className="flex-column gap-2" style={{ textAlign: 'left' }}>
              <div className="flex-column gap-1">
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Wallet Address</label>
                <input 
                  type="text" 
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="0x..."
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div className="flex-column gap-1 mb-2">
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Initial Balance (MON)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={manualBalance}
                  onChange={(e) => setManualBalance(e.target.value)}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <button 
                type="submit"
                className="btn-cyber-accent"
                style={{ width: '100%', padding: '10px', fontSize: '11px' }}
              >
                Import Custom Wallet
              </button>
            </form>
          </div>
        ) : (
          <div>
            {/* Balance Card */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px'
            }}>
              <div className="flex-row-between mb-2">
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Account</span>
                <button 
                  onClick={handleDisconnect}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '9px',
                    color: 'var(--error)',
                    cursor: 'pointer'
                  }}
                  disabled={txProgress !== null}
                >
                  Disconnect
                </button>
              </div>
              <p style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                color: 'var(--text-main)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                marginBottom: '12px',
                wordBreak: 'break-all'
              }}>
                {address.substring(0, 12)}...{address.substring(address.length - 8)}
              </p>
              
              <div className="flex-row-between" style={{ alignItems: 'flex-end' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Balance</span>
                <div>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>{balance.toFixed(2)}</span>
                  <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700, marginLeft: '4px', fontFamily: 'var(--mono)' }}>MON</span>
                </div>
              </div>
            </div>

            {/* Apple Pay-style Escrow Agreement Sheet */}
            {escrowPayment && (
              <div style={{
                border: '1px solid var(--border)',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '20px'
              }} className="animate-slideup">
                <h4 style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  Monad Pay Escrow Sheet
                </h4>
                
                <div className="flex-column gap-2 text-xs" style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  <div className="flex-row-between">
                    <span>Hiring Agent:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{escrowPayment.agentName}</span>
                  </div>
                  <div className="flex-row-between">
                    <span>Initial Deposit:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{escrowPayment.amount} MON</span>
                  </div>
                  <div className="flex-row-between">
                    <span>Network Fee:</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>0.0000 MON (Subsidized)</span>
                  </div>
                </div>

                {txProgress === null ? (
                  <button 
                    onClick={triggerEscrowPayment} 
                    className="btn-cyber"
                    style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                    disabled={balance < escrowPayment.amount}
                  >
                    {balance < escrowPayment.amount ? 'Insufficient Balance' : 'Pay with Monad Wallet'}
                  </button>
                ) : (
                  <div className="flex-row-center gap-2" style={{
                    padding: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    {txProgress === 'broadcasting' && (
                      <>
                        <Loader2 className="animate-spin text-primary" size={12} />
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'var(--mono)' }}>Broadcasting contract...</span>
                      </>
                    )}
                    {txProgress === 'validating' && (
                      <>
                        <RefreshCw className="animate-spin text-primary" size={12} />
                        <span style={{ fontSize: '9px', color: 'var(--primary)', fontFamily: 'var(--mono)' }}>Parallel finalization...</span>
                      </>
                    )}
                    {txProgress === 'confirmed' && (
                      <>
                        <CheckCircle className="text-success" size={12} />
                        <span style={{ fontSize: '9px', color: 'var(--success)', fontFamily: 'var(--mono)' }}>Success. Escrow locked.</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Ledger Transactions Logs list */}
            <div>
              <h4 style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                Ledger Logs
              </h4>
              <div className="flex-column gap-1" style={{ maxHeight: '110px', overflowY: 'auto' }}>
                {txHistory.length === 0 ? (
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>No transactions recorded.</p>
                ) : (
                  txHistory.map((tx, idx) => (
                    <div key={idx} className="flex-row-between" style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      fontSize: '11px'
                    }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{tx.type}</p>
                        <p style={{ fontSize: '8px', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{tx.hash.substring(0, 10)}...</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 600, color: 'var(--error)' }}>-{tx.amount} MON</p>
                        <p style={{ fontSize: '8px', color: 'var(--success)', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>{tx.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
