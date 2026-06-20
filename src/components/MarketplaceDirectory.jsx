import React, { useState, useEffect } from 'react';
import { Star, SlidersHorizontal, Filter, ArrowRight } from 'lucide-react';
import staticAgents from '../agentsData';

const API_BASE = 'http://127.0.0.1:5000/api';

export default function MarketplaceDirectory({ onSelectAgent }) {
  const [agents, setAgents] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch(`${API_BASE}/agents`);
        const data = await response.json();
        
        const unique = [];
        const seen = new Set();
        data.forEach(item => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            unique.push(item);
          }
        });
        setAgents(unique);
      } catch (err) {
        console.error("Failed to load directory from backend. Using static fallback.", err);
        const unique = [];
        const seen = new Set();
        staticAgents.forEach(item => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            unique.push(item);
          }
        });
        setAgents(unique);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  const filteredAgents = agents
    .filter(agent => {
      const matchCat = filterCategory === 'all' || agent.category === filterCategory;
      const matchSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          agent.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'bid-asc') return a.bid - b.bid;
      if (sortBy === 'bid-desc') return b.bid - a.bid;
      return 0;
    });

  return (
    <div className="animate-fadein">
      
      {/* Title & Spotlight Search Row */}
      <div className="flex-row-between flex-wrap gap-4 mb-6">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, trackingTight: 'true' }}>Marketplace Directory</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Browse and manually select active builder agents from the registry.</p>
        </div>
        <div style={{ minWidth: '260px' }}>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, skills, or role..."
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border)',
              outline: 'none',
              fontSize: '12px',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--text-main)'
            }}
          />
        </div>
      </div>

      {/* Filter and Sorting Header Bar Row */}
      <div className="flex-row-between flex-wrap gap-4 mb-8" style={{
        padding: '12px 16px',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        fontSize: '11px'
      }}>
        
        {/* Category Pills Row */}
        <div className="flex-row-start flex-wrap gap-2">
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={11} /> Filter:
          </span>
          {['all', 'development', 'auditing', 'marketing'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: filterCategory === cat ? '1px solid var(--border-hover)' : '1px solid transparent',
                backgroundColor: filterCategory === cat ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                color: filterCategory === cat ? 'var(--text-main)' : 'var(--text-muted)',
                transition: 'all 0.15s ease'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex-row-start gap-2">
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <SlidersHorizontal size={11} /> Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-main)',
              padding: '4px 10px',
              outline: 'none',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            <option value="rating">Star Rating</option>
            <option value="bid-asc">Bid: Low to High</option>
            <option value="bid-desc">Bid: High to Low</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading registry profiles from Monad...</p>
        </div>
      ) : (
        <div className="grid-cols-3-col">
          {filteredAgents.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', border: '1px dashed var(--border)', borderRadius: '12px' }}>
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>No agents match your criteria.</p>
            </div>
          ) : (
            filteredAgents.map(agent => (
              <div 
                key={agent.id}
                className="glass-panel glass-panel-hover"
                style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div className="flex-row-start gap-3 mb-4">
                    <img 
                      src={agent.avatar} 
                      alt={agent.name} 
                      style={{ width: '48px', height: '48px', borderRadius: '10px', border: '1px solid var(--border)', objectFit: 'cover', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    />
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</h3>
                      <p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{agent.role}</p>
                      <div className="flex-row-start gap-1" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        <Star size={11} className="text-yellow-400 fill-yellow-400" />
                        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{agent.rating.toFixed(1)}</span>
                        <span>({agent.totalJobs} jobs)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-row-between mb-4" style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '11px'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>Active Bid:</span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--primary)' }}>{agent.bid} MON</span>
                  </div>

                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {agent.description}
                  </p>

                  <div className="flex-row-start flex-wrap gap-1 mb-5">
                    {agent.skills.slice(0, 3).map((skill, idx) => (
                      <span 
                        key={idx}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border)',
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                    {agent.skills.length > 3 && (
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '2px' }}>
                        +{agent.skills.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => onSelectAgent(agent)}
                  className="btn-cyber-accent"
                  style={{ width: '100%', fontSize: '11px', padding: '8px' }}
                >
                  Inspect Agent Details <ArrowRight size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
