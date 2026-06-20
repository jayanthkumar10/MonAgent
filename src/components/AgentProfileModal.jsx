import React from 'react';
import { Star, X, ShieldCheck, Calendar, Zap, Sparkles, ExternalLink, Lock } from 'lucide-react';

export default function AgentProfileModal({ 
  agent, 
  isOpen, 
  onClose, 
  onAccept, 
  onReject,
  isFirstMatch = true
}) {
  if (!isOpen || !agent) return null;

  return (
    <div className="animate-fadein flex-row-center" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 40,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      padding: '16px'
    }}>
      <div className="glass-panel animate-modal" style={{
        width: '100%',
        maxWidth: '640px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '32px',
        position: 'relative',
        backgroundColor: 'var(--bg-modal)'
      }}>
        {/* Close Button */}
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
        >
          <X size={16} />
        </button>

        {/* Apple Recommendation Banner */}
        <div className="flex-row-start gap-2" style={{
          display: 'inline-flex',
          padding: '4px 10px',
          borderRadius: '6px',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border)',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '20px'
        }}>
          <Sparkles size={10} style={{ color: 'var(--primary)' }} />
          {isFirstMatch ? "Recommended Candidate" : "Secondary Candidate"}
        </div>

        {/* Profile Card Header */}
        <div className="flex-row-start gap-4 mb-6" style={{
          borderBottom: '1px solid var(--border)',
          paddingBottom: '24px',
          flexWrap: 'wrap'
        }}>
          <img 
            src={agent.avatar} 
            alt={agent.name} 
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '12px',
              border: '1px solid var(--border-hover)',
              objectCover: 'cover',
              backgroundColor: 'rgba(0, 0, 0, 0.2)'
            }}
          />
          <div className="flex-1">
            <div className="flex-row-between gap-3 mb-2" style={{ flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{agent.name}</h2>
              <span className="badge-monad">
                {agent.bid} MON
              </span>
            </div>
            <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>{agent.role}</p>
            
            <div className="flex-row-start flex-wrap gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="flex-row-start gap-1">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                <strong style={{ color: 'var(--text-main)' }}>{agent.rating}</strong> ({agent.totalJobs} jobs)
              </span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span className="flex-row-start gap-1">
                <Calendar size={12} />
                Timeline: <strong style={{ color: 'var(--text-main)' }}>{agent.deadline}</strong>
              </span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span className="badge-verified" style={{ fontSize: '9px', padding: '1px 6px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Registry verified</span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid-cols-2-col mb-6">
          {/* Left Column: Info & Skills */}
          <div className="flex-column">
            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>Agent Profile</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              {agent.description}
            </p>

            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>Target Capabilities</h3>
            <div className="flex-row-start flex-wrap gap-2">
              {agent.skills.map((skill, idx) => (
                <span 
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border)',
                    fontSize: '10px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Execution Plan */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '12px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={12} /> Technical Execution Plan
            </h3>
            <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {agent.plans.map((step, idx) => (
                <li key={idx} className="flex-row-start gap-2 text-xs" style={{ alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>{idx + 1}.</span>
                  <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Reputation Registry section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} className="text-success" /> On-Chain Reputation Proofs
          </h3>
          <div className="flex-column gap-3">
            {agent.previousWork.map((work, idx) => (
              <div 
                key={idx}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px'
                }}
              >
                <div className="flex-row-between gap-2 mb-2">
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{work.title}</h4>
                  <span className="flex-row-start gap-1" style={{ fontSize: '11px', color: 'var(--primary)' }}>
                    <Star size={11} className="fill-current" /> {work.rating.toFixed(1)}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>{work.description}</p>
                
                <div className="flex-row-between flex-wrap gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                  <span className="flex-row-start gap-1" style={{ color: 'var(--primary)' }}>
                    <Lock size={9} />
                    Verified Hash: {work.verifiedTx.substring(0, 12)}...{work.verifiedTx.substring(work.verifiedTx.length - 8)}
                  </span>
                  <a 
                    href={`https://explorer.monad.xyz/tx/${work.verifiedTx}`}
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Verified Monad Block Proof: ${work.verifiedTx}`);
                    }}
                    style={{
                      color: 'var(--text-muted)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                    className="hover-underline"
                  >
                    View proof <ExternalLink size={9} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Apple CTAs Panel */}
        <div className="flex-row-between gap-3 mt-6" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', flexWrap: 'wrap' }}>
          <button 
            onClick={onReject}
            style={{
              padding: '10px 18px',
              border: '1px solid rgba(255, 69, 58, 0.3)',
              backgroundColor: 'transparent',
              color: 'var(--error)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            className="btn-reject"
          >
            Reject Candidate
          </button>
          <button 
            onClick={() => onAccept(agent)}
            className="btn-cyber"
            style={{ flex: 1, padding: '10px', fontSize: '12px' }}
          >
            Accept & Initialize Escrow
          </button>
        </div>
      </div>
    </div>
  );
}
