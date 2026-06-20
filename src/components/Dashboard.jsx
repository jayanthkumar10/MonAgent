import React from 'react';
import { Briefcase, ChevronRight, CheckCircle2, ShieldAlert, XCircle, ArrowRightLeft, MessageSquare } from 'lucide-react';

export default function Dashboard({ 
  agreements = [], 
  onSelectAgreement, 
  onReleasePayment, 
  onRefund 
}) {

  const getStepProgress = (status) => {
    switch (status) {
      case 'escrow-locked': return 15;
      case 'analyzing': return 40;
      case 'coding': return 65;
      case 'testing': return 85;
      case 'completed': return 100;
      case 'released': return 100;
      case 'refunded': return 100;
      default: return 0;
    }
  };

  const getStatusTextAndColor = (status) => {
    switch (status) {
      case 'escrow-locked': 
        return { text: 'Escrow Locked', bg: 'rgba(10, 132, 255, 0.08)', color: 'var(--primary)' };
      case 'analyzing': 
        return { text: 'Analyzing Intent', bg: 'rgba(255, 69, 58, 0.08)', color: 'var(--error)' };
      case 'coding': 
        return { text: 'Coding Modules', bg: 'rgba(10, 132, 255, 0.08)', color: 'var(--primary)' };
      case 'testing': 
        return { text: 'Running Sandbox Tests', bg: 'rgba(10, 132, 255, 0.08)', color: 'var(--primary)' };
      case 'completed': 
        return { text: 'Completed (Release Payout)', bg: 'rgba(48, 209, 88, 0.08)', color: 'var(--success)' };
      case 'released': 
        return { text: 'Settled & Paid', bg: 'rgba(48, 209, 88, 0.15)', color: 'var(--success)' };
      case 'refunded': 
        return { text: 'Cancelled & Refunded', bg: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-muted)' };
      default: 
        return { text: 'Unknown', bg: 'transparent', color: 'var(--text-muted)' };
    }
  };

  return (
    <div className="animate-fadein">
      <div className="mb-6">
        <h2 style={{ fontSize: '20px', fontWeight: 800, trackingTight: 'true' }}>Hired Contracts Dashboard</h2>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Monitor concurrent AI agent tasks, verify progress, and manage on-chain settlements.</p>
      </div>

      {agreements.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '64px 24px', 
          border: '1px dashed var(--border)', 
          borderRadius: '12px',
          maxWidth: '520px',
          margin: '0 auto'
        }}>
          <Briefcase size={32} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>No Active Contracts Found</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Go to the Matching Hub or Marketplace Directory to hire autonomous AI agents to build or audit your project.
          </p>
        </div>
      ) : (
        <div className="flex-column gap-4">
          {agreements.map((agreement) => {
            const progress = getStepProgress(agreement.status);
            const statusConfig = getStatusTextAndColor(agreement.status);
            const isFinished = agreement.status === 'completed' || agreement.status === 'released';
            const isRefunded = agreement.status === 'refunded';

            return (
              <div 
                key={agreement.id}
                className="glass-panel"
                style={{ 
                  padding: '24px', 
                  border: agreement.status === 'released' 
                    ? '1px solid rgba(48, 209, 88, 0.3)' 
                    : agreement.status === 'refunded'
                      ? '1px solid rgba(255, 255, 255, 0.05)'
                      : '1px solid var(--border)',
                  boxShadow: agreement.status === 'released' ? '0 0 15px rgba(48, 209, 88, 0.05)' : 'none'
                }}
              >
                <div className="flex-row-between flex-wrap gap-4 mb-4">
                  {/* Left: Agent Info & Title */}
                  <div className="flex-row-start gap-3 flex-1" style={{ minWidth: '220px' }}>
                    <img 
                      src={agreement.agent.avatar} 
                      alt={agreement.agent.name} 
                      style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover' }} 
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agreement.query}
                      </h3>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Assigned: <strong style={{ color: 'var(--text-secondary)' }}>{agreement.agent.name}</strong> • {agreement.agent.role}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status Badge & Bids */}
                  <div className="flex-row-start gap-4 flex-wrap" style={{ fontSize: '11px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Locked Value</span>
                      <strong style={{ fontFamily: 'var(--mono)', color: 'var(--primary)' }}>{agreement.agent.bid} MON</strong>
                    </div>

                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '6px', 
                      fontSize: '10px', 
                      fontWeight: 600,
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      {statusConfig.text}
                    </span>
                  </div>
                </div>

                {/* Progress Status Bar Wrapper */}
                <div className="mb-4">
                  <div className="flex-row-between mb-1" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span>Progress Tracker</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '6px', 
                    borderRadius: '999px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      width: `${progress}%`, 
                      height: '100%', 
                      borderRadius: '999px',
                      backgroundColor: isRefunded 
                        ? 'var(--text-muted)'
                        : agreement.status === 'released' 
                          ? 'var(--success)' 
                          : 'var(--primary)',
                      transition: 'width 0.4s ease'
                    }}></div>
                  </div>
                </div>

                {/* Footer Row Actions */}
                <div className="flex-row-between flex-wrap gap-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.02)' }}>
                  <div className="flex-row-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {agreement.status === 'released' && (
                      <span className="flex-row-start gap-1 text-success">
                        <CheckCircle2 size={12} /> Escrow payment finalized on Monad Testnet.
                      </span>
                    )}
                    {agreement.status === 'refunded' && (
                      <span className="flex-row-start gap-1" style={{ color: 'var(--text-muted)' }}>
                        <XCircle size={12} /> Funds refunded to client address.
                      </span>
                    )}
                    {agreement.status !== 'released' && agreement.status !== 'refunded' && (
                      <span className="flex-row-start gap-1">
                        <ArrowRightLeft size={12} /> Contract locked in `MonAgentEscrow.sol` vault.
                      </span>
                    )}
                  </div>

                  <div className="flex-row-start gap-2">
                    {/* Action buttons based on status */}
                    {!isFinished && !isRefunded && (
                      <>
                        <button 
                          onClick={() => onRefund(agreement.id)}
                          className="btn-cyber-accent"
                          style={{ fontSize: '10px', padding: '6px 12px', borderColor: 'var(--error)', color: 'var(--error)' }}
                        >
                          Cancel & Refund
                        </button>
                        {agreement.status === 'completed' && (
                          <button 
                            onClick={() => onReleasePayment(agreement.id)}
                            className="btn-cyber"
                            style={{ fontSize: '10px', padding: '6px 12px', backgroundColor: 'var(--success)' }}
                          >
                            Release Payout
                          </button>
                        )}
                      </>
                    )}

                    <button 
                      onClick={() => onSelectAgreement(agreement.id)}
                      className="btn-cyber-accent"
                      style={{ fontSize: '10px', padding: '6px 12px', color: 'var(--text-main)' }}
                    >
                      <MessageSquare size={10} /> Open Chat Workspace
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
