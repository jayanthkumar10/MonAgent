import React, { useEffect, useState } from 'react';
import { Loader2, Cpu, Star, MessageSquare, CheckCircle, ShieldCheck } from 'lucide-react';

export default function ManagerAgentSimulation({ 
  currentStep, 
  candidates = [], 
  category 
}) {
  const [managerSpeech, setManagerSpeech] = useState('');

  // Dynamically update Manager Agent speech based on simulation phase
  useEffect(() => {
    switch (currentStep) {
      case 0:
        setManagerSpeech("Searching the Monad registry network... Analyzing semantic project intents.");
        break;
      case 1:
        setManagerSpeech("Candidates gathered. Checking cryptographic reputation proof hashes stored on-chain...");
        break;
      case 2:
        setManagerSpeech("Reviewing agent bids. Balancing competitive pricing with verified history stats...");
        break;
      case 3:
        setManagerSpeech("Score formulas completed. Running threat checks to ensure code reliability...");
        break;
      case 4:
        setManagerSpeech("Candidate selected! Displaying recommended profile details...");
        break;
      default:
        setManagerSpeech("Orchestrator ready. Awaiting instructions...");
    }
  }, [currentStep]);

  return (
    <div className="glass-panel animate-slideup mb-8" style={{ padding: '32px', maxWidth: '780px', margin: '0 auto' }}>
      
      {/* Boardroom Header */}
      <div className="flex-row-between mb-8" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div className="flex-row-start gap-3">
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(10, 132, 255, 0.08)',
            border: '1px solid rgba(10, 132, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Cpu size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Manager Agent Boardroom</h3>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>Active Matchmaker Loop</p>
          </div>
        </div>
        <span className="badge-verified" style={{ fontSize: '9px', textTransform: 'uppercase', padding: '2px 8px' }}>
          Searching
        </span>
      </div>

      {/* Conversational Manager Speech Bubble */}
      <div className="flex-row-start gap-4 mb-8" style={{ alignItems: 'flex-start' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card-hover)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--primary)'
        }}>
          <MessageSquare size={18} />
        </div>
        <div style={{
          flex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px',
          position: 'relative'
        }}>
          {/* Bubble Pointer Arrow */}
          <div style={{
            position: 'absolute',
            left: '-6px',
            top: '16px',
            width: '10px',
            height: '10px',
            backgroundColor: '#18181b', // matches --bg-card
            borderLeft: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            transform: 'rotate(45deg)'
          }}></div>
          
          <div className="flex-row-between mb-2">
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', uppercase: 'true', tracking: '0.05em' }}>Manager Agent</span>
            {currentStep < 4 && <Loader2 className="animate-spin text-primary" size={11} />}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>
            {managerSpeech}
          </p>
        </div>
      </div>

      {/* Visual Candidate Scanning Panel */}
      <div className="flex-column gap-3">
        <h4 style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Registry Candidates Pool
        </h4>

        {candidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border)', borderRadius: '12px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Scanning database profiles...</p>
          </div>
        ) : (
          <div className="flex-column gap-3">
            {candidates.map((c, i) => {
              const rawScore = (c.rating * 0.6) + ((1 / c.bid) * 40);
              const finalScore = (rawScore * 2).toFixed(2);
              
              // Scanning highlight states
              const isScanningNow = currentStep < 4 && (currentStep % candidates.length === i);
              const isSelectedWinner = currentStep === 4 && i === 0;

              return (
                <div 
                  key={i}
                  className="flex-row-between flex-wrap gap-4"
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: isSelectedWinner ? 'rgba(10, 132, 255, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                    border: isSelectedWinner 
                      ? '1px solid var(--primary)' 
                      : isScanningNow 
                        ? '1px solid rgba(255, 255, 255, 0.2)' 
                        : '1px solid var(--border)',
                    boxShadow: isSelectedWinner ? '0 0 15px rgba(10, 132, 255, 0.15)' : 'none',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    opacity: currentStep < 4 && !isScanningNow ? 0.6 : 1
                  }}
                >
                  {/* Left info */}
                  <div className="flex-row-start gap-3 flex-1">
                    <img 
                      src={c.avatar} 
                      alt={c.name} 
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border)',
                        objectFit: 'cover'
                      }} 
                    />
                    <div>
                      <div className="flex-row-start gap-2">
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{c.name}</span>
                        {isSelectedWinner && (
                          <span className="badge-verified" style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '4px' }}>
                            Best Match
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.role}</p>
                    </div>
                  </div>

                  {/* Middle specs */}
                  <div className="flex-row-start gap-4 text-xs" style={{ minWidth: '160px', color: 'var(--text-secondary)' }}>
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Bid</span>
                      <strong style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>{c.bid} MON</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Rating</span>
                      <strong style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Star size={10} className="text-yellow-400 fill-yellow-400" /> {c.rating}
                      </strong>
                    </div>
                  </div>

                  {/* Right Score */}
                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    {currentStep < 2 ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Pending...</span>
                    ) : currentStep === 2 ? (
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>Comparing...</span>
                    ) : (
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Score</span>
                        <strong style={{ fontSize: '14px', fontFamily: 'var(--mono)', color: isSelectedWinner ? 'var(--success)' : 'var(--text-main)' }}>
                          {finalScore}
                        </strong>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
