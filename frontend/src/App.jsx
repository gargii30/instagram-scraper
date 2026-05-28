import { useState } from 'react';

const API = 'http://localhost:4000/api';

const COLORS = [
  ['#ffedd5','#c2410c'],
  ['#e0f2fe','#0369a1'],
  ['#dcfce7','#15803d'],
  ['#fce7f3','#be185d'],
  ['#ede9fe','#6d28d9'],
];

const colorFor = (str) =>
  COLORS[(str || 'a').charCodeAt(0) % COLORS.length];

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function App() {
  const [handle, setHandle] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [relevance, setRelevance] = useState('all');

  async function fetchSuggestions(usernames) {
    setLoading(true);

    try {
      const results = await Promise.all(
        usernames.map(u =>
          fetch(`${API}/suggest/${u}`)
            .then(r => r.json())
            .then(data => data.accounts || [])
        )
      );

      const seen = new Set();

      return results.flat().filter(a => {
        if (!a.handle || seen.has(a.handle)) return false;
        seen.add(a.handle);
        return true;
      });

    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!handle.trim()) return;
    const accounts = await fetchSuggestions([handle]);
    setSuggestions(accounts);
    setSelected([]);
  }

  function toggleSelect(acc) {
    setSelected(s =>
      s.find(a => a.handle === acc.handle)
        ? s.filter(a => a.handle !== acc.handle)
        : [...s, acc]
    );
  }

  function selectAll() {
    setSelected([...filteredSuggestions]);
  }

  function clearAll() {
    setSelected([]);
  }

  const filteredSuggestions = (() => {
    if (!suggestions.length) return [];

    const sorted = [...suggestions].sort(
      (a, b) => (b.followers || 0) - (a.followers || 0)
    );

    const total = sorted.length;
    const highCut = Math.floor(total * 0.3);
    const midCut = Math.floor(total * 0.7);

    if (relevance === 'high') return sorted.slice(0, highCut);
    if (relevance === 'medium') return sorted.slice(highCut, midCut);
    if (relevance === 'low') return sorted.slice(midCut);

    return sorted;
  })();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a, #1e293b)',
      fontFamily: 'system-ui',
      color: '#fff'
    }}>

      <div style={{
        textAlign: 'center',
        padding: 25,
        fontSize: 26,
        fontWeight: 700
      }}>
        🚀 Creator Discovery Platform
      </div>

      <div style={{
        maxWidth: 1000,
        margin: 'auto',
        padding: 20
      }}>

        {/* SEARCH */}
        <div style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20
        }}>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="Search username..."
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: 'none'
            }}
          />
          <button style={btnPrimary} onClick={handleSearch}>Search</button>
        </div>

        {/* CONTROLS */}
        {suggestions.length > 0 && (
          <div style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            marginBottom: 20
          }}>
            <select
              value={relevance}
              onChange={e => setRelevance(e.target.value)}
              style={dropdown}
            >
              <option value="all">All</option>
              <option value="high">🔥 High</option>
              <option value="medium">⚡ Medium</option>
              <option value="low">🌱 Low</option>
            </select>

            <button style={btnSecondary} onClick={selectAll}>Select All</button>
            <button style={btnSecondary} onClick={clearAll}>Clear</button>

            <span style={{ opacity: 0.7 }}>
              {selected.length} selected
            </span>
          </div>
        )}

        {loading && <p>Loading...</p>}

        {/* GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 18
        }}>
          {filteredSuggestions.map(acc => {
            const isSelected = selected.find(a => a.handle === acc.handle);
            const [bg, fg] = colorFor(acc.handle);

            return (
              <div
                key={acc.handle}
                onClick={() => toggleSelect(acc)}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: isSelected
                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                    : 'rgba(255,255,255,0.05)',
                  border: isSelected ? '2px solid #fff' : '1px solid #333',
                  cursor: 'pointer'
                }}
              >

                {/* AVATAR */}
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: bg,
                  color: fg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10
                }}>
                  {initials(acc.name)}
                </div>

                {/* NAME */}
                <div style={{ fontWeight: 600 }}>
                  {acc.name}
                </div>

                {/* ✅ PROPER CLICKABLE LINK */}
                <a
                  href={`https://instagram.com/${acc.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    color: '#60a5fa',
                    fontSize: 13,
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  @{acc.handle}
                </a>

                {/* FOLLOWERS */}
                <div style={{
                  marginTop: 8,
                  fontSize: 18,
                  fontWeight: 700
                }}>
                  {acc.followers
                    ? acc.followers.toLocaleString()
                    : '—'}
                </div>

                <div style={{
                  fontSize: 11,
                  opacity: 0.6
                }}>
                  followers
                </div>

                {/* ✅ EXTRA BUTTON (SUPER CLEAR UX) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://instagram.com/${acc.handle}`, '_blank');
                  }}
                  style={btnMini}
                >
                  View Profile →
                </button>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// STYLES
const btnPrimary = {
  padding: '10px 16px',
  borderRadius: 10,
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  cursor: 'pointer'
};

const btnSecondary = {
  padding: '10px 16px',
  borderRadius: 10,
  background: '#334155',
  color: '#fff',
  border: 'none',
  cursor: 'pointer'
};

const btnMini = {
  marginTop: 10,
  fontSize: 11,
  padding: '6px 10px',
  borderRadius: 8,
  background: '#475569',
  color: '#fff',
  border: 'none',
  cursor: 'pointer'
};

const dropdown = {
  padding: 10,
  borderRadius: 10,
  background: '#1e293b',
  color: '#fff',
  border: 'none'
};