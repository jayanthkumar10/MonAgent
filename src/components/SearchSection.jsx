import React from 'react';
import { Search, Cpu, Shield, TrendingUp } from 'lucide-react';

export default function SearchSection({ 
  searchQuery, 
  setSearchQuery, 
  onSubmitSearch, 
  activeCategory, 
  setActiveCategory,
  isSearching
}) {
  const handleSuggestionClick = (text, cat) => {
    setSearchQuery(text);
    setActiveCategory(cat);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSubmitSearch(searchQuery);
    }
  };

  return (
    <div className="animate-fadein" style={{ textAlign: 'center', padding: '64px 0 40px' }}>
      
      {/* Hero Title */}
      <h1 className="mb-4" style={{ fontSize: '42px', fontWeight: 800, trackingTight: 'true' }}>
        Autonomous Agent Registry
      </h1>
      <p style={{ 
        fontSize: '15px', 
        color: 'var(--text-muted)', 
        maxWidth: '520px', 
        margin: '0 auto 36px',
        lineHeight: 1.6
      }}>
        Discover, hire, and secure verified AI agents executing operations on Monad's parallel execution network.
      </p>

      {/* Spotlight-style Search Form */}
      <form onSubmit={handleFormSubmit} className="mb-8" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="flex-row-between" style={{
          padding: '6px',
          borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border)',
          width: '100%'
        }}>
          <div className="flex-row-start flex-1" style={{ width: '100%' }}>
            <div style={{ paddingLeft: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <Search size={16} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What do you need built? e.g., 'I want a AI engineer to build CRM automation'" 
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                padding: '10px 12px',
                fontFamily: 'var(--sans)',
                fontSize: '13px'
              }}
              disabled={isSearching}
            />
          </div>
          <button 
            type="submit" 
            className="btn-cyber"
            style={{ fontSize: '12px', padding: '8px 16px', flexShrink: 0 }}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? 'Matching...' : 'Find Agent'}
          </button>
        </div>
      </form>

      {/* Elegant Minimal Category Pills */}
      <div className="flex-row-center flex-wrap gap-2 mb-8">
        {[
          { id: 'all', label: 'All Agents', icon: null },
          { id: 'development', label: 'Development', icon: Cpu },
          { id: 'auditing', label: 'Security Audits', icon: Shield },
          { id: 'marketing', label: 'Marketing', icon: TrendingUp }
        ].map(cat => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;
          return (
            <button 
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex-row-start gap-2"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                border: isSelected ? '1px solid var(--border-hover)' : '1px solid transparent',
                backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                transition: 'all 0.2s ease'
              }}
            >
              {Icon && <Icon size={11} />}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Suggestion Prompts */}
      <div className="flex-row-center flex-wrap gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span style={{ opacity: 0.5 }}>Suggested Queries:</span>
        <button 
          onClick={() => handleSuggestionClick("I want a AI engineer to build CRM automation", "development")}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '11px'
          }}
        >
          "CRM automation pipeline"
        </button>
        <span style={{ opacity: 0.3 }}>•</span>
        <button 
          onClick={() => handleSuggestionClick("Audit my Solidity smart contract and find reentrancy bugs", "auditing")}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '11px'
          }}
        >
          "smart contract audit"
        </button>
      </div>

    </div>
  );
}
