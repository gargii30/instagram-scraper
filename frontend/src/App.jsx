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

  // 🔥 FIXED FETCH (ONLY CHANGE)
  async function fetchSuggestions(usernames) {
    setLoading(true);

    try {
      const encoded = encodeURIComponent(usernames.join(','));

      const res = await fetch(
        `${API}/suggest?input=${encoded}`
      );

      const data = await res.json();

      const seen = new Set();

      return (data.accounts || []).filter(a => {
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

  async function handleExplore() {
    if (!selected.length) return;

    const usernames = selected
      .slice(0, 8)
      .map(a => a.handle);

    const accounts = await fetchSuggestions(usernames);

    setSuggestions(prev => {
      const seen = new Set(prev.map(a => a.handle));
      const newOnes = accounts.filter(a => !seen.has(a.handle));
      return [...prev, ...newOnes];
    });

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

    const highCut = Math.max(1, Math.floor(total * 0.3));
    const midCut = Math.max(highCut + 1, Math.floor(total * 0.7));

    if (relevance === 'high') return sorted.slice(0, highCut);
    if (relevance === 'medium') return sorted.slice(highCut, midCut);
    if (relevance === 'low') return sorted.slice(midCut);

    return sorted;
  })();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1f1c2c, #928dab)',
      fontFamily: 'system-ui',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>

      <div style={{
        width: '100%',
        textAlign: 'center',
        padding: 20,
        color: '#fff',
        fontSize: 20,
        fontWeight: 600
      }}>
        Instagram Explorer
      </div>

      <div style={{
        width: '100%',
        maxWidth: 900,
        padding: 20
      }}>

        <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="Enter username or URL"
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              border: 'none'
            }}
          />
          <button onClick={handleSearch}>Search</button>
        </div>

        {suggestions.length > 0 && (
          <div style={{
            display: 'flex',
            gap: 10,
            marginBottom: 15,
            alignItems: 'center',
            color: '#fff'
          }}>
            <select
              value={relevance}
              onChange={e => setRelevance(e.target.value)}
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button onClick={selectAll}>Select All</button>
            <button onClick={clearAll}>Clear</button>

            <button
              onClick={handleExplore}
              disabled={!selected.length}
            >
              Explore Selected →
            </button>

            <span>{selected.length} selected</span>
          </div>
        )}

        {loading && <p style={{ color: '#fff' }}>Loading...</p>}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 15
        }}>
          {filteredSuggestions.map(acc => {
            const isSelected = selected.find(a => a.handle === acc.handle);
            const [bg, fg] = colorFor(acc.handle);

            return (
              <div
                key={acc.handle}
                onClick={() => toggleSelect(acc)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.1)',
                  border: isSelected ? '2px solid #fff' : '1px solid #333',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >

                <div style={{
                  width: 45,
                  height: 45,
                  borderRadius: '50%',
                  background: bg,
                  color: fg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8
                }}>
                  {initials(acc.name)}
                </div>

                <div>{acc.name}</div>

                <a
                  href={acc.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#aaa', fontSize: 13 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  @{acc.handle}
                </a>

                <div style={{ fontSize: 12 }}>
                  {acc.followers
                    ? acc.followers.toLocaleString()
                    : '—'} followers
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}