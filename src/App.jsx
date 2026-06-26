    import { useState } from 'react';
    import './App.css';

   const API = 'https://instagram-scraper-backend-fjqg.onrender.com/api';
    const COLORS = [
      ['#dbeafe','#1e40af'], ['#fce7f3','#9d174d'],
      ['#d1fae5','#065f46'], ['#ede9fe','#5b21b6'],
      ['#fef3c7','#92400e'], ['#fee2e2','#991b1b'],
    ];
    const colorFor = (str) => COLORS[(str || 'a').charCodeAt(0) % COLORS.length];
    const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    export default function App() {
      const [step, setStep] = useState(1);
      const [handle, setHandle] = useState('');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [suggestions, setSuggestions] = useState([]);
      const [selected, setSelected] = useState([]);
      const [iteration, setIteration] = useState(1);
      const [history, setHistory] = useState([]);
      const [detectedCategory, setDetectedCategory] = useState('');  // ← ADDED HERE

      async function fetchSuggestions(usernames) {
  setLoading(true);
  setError('');

  try {
    const results = await Promise.all(
      usernames.map(async (u) => {
        const url = `${API}/suggest?input=${encodeURIComponent(u)}`;

        const res = await fetch(url);
        const data = await res.json();

        return (Array.isArray(data.accounts) ? data.accounts : []).map(a => ({
          ...a,
          _source: u,
        }));
      })
    );

    const flat = results.flat();

    const seen = new Set();
    const deduped = flat.filter(a => {
      if (!a?.handle || seen.has(a.handle)) return false;
      seen.add(a.handle);
      return true;
    });

    const firstCategory = results
      .flatMap(r => r)
      .find(a => a?.category)?.category;

    if (firstCategory) setDetectedCategory(firstCategory);

    return deduped;

  } catch (e) {
    console.log(e);
    setError('Server error');
    return [];
  } finally {
    setLoading(false);
  }
}

      async function handleSearch() {
        if (!handle.trim()) return;
        const accounts = await fetchSuggestions([handle.trim()]);
        setSuggestions(accounts);
        setSelected([]);
        setStep(2);
      }

      async function handleExplore() {
        if (selected.length === 0) return;
        setHistory(h => [...h, { step, suggestions, selected, iteration }]);
        const accounts = await fetchSuggestions(selected.map(a => a.handle));
        setSuggestions(accounts);
        setSelected([]);
        setIteration(i => i + 1);
        setStep(3);
      }

      function handleBack() {
        if (history.length === 0) { setStep(1); return; }
        const prev = history[history.length - 1];
        setHistory(h => h.slice(0, -1));
        setStep(prev.step);
        setSuggestions(prev.suggestions);
        setSelected(prev.selected);
        setIteration(prev.iteration);
      }

      function toggleSelect(acc) {
        setSelected(s =>
          s.find(a => a.handle === acc.handle)
            ? s.filter(a => a.handle !== acc.handle)
            : [...s, acc]
        );
      }

      const grouped = suggestions.reduce((g, a) => {
        const src = a._source || handle;
        if (!g[src]) g[src] = [];
        g[src].push(a);
        return g;
      }, {});

      return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif' }}>

          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Instagram Profile Explorer</h1>
          <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
            {step === 1 && 'Enter a username to find similar accounts.'}
            {step === 2 && (
              <>
                Showing suggestions for <strong>@{handle}</strong>
                {detectedCategory && (
                  <span style={{ marginLeft: 8, padding: '2px 10px', borderRadius: 20, background: '#dbeafe', color: '#1e40af', fontSize: 12 }}>
                    {detectedCategory}
                  </span>
                )}
              </>
            )}
            {step === 3 && `Iteration ${iteration} — suggestions based on your selections.`}
          </p>

          {/* Step 1: Input */}
          {step === 1 && (
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. cristiano"
                style={{ flex: 1, height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
              />
              <button onClick={handleSearch} disabled={loading}
                style={{ height: 40, padding: '0 20px', borderRadius: 8, background: '#1a1a2e', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer' }}>
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>
          )}

          {/* Error */}
          {error && <p style={{ color: 'red', fontSize: 13, marginTop: 12 }}>{error}</p>}

          {/* Loading */}
          {loading && <p style={{ color: '#888', fontSize: 14, marginTop: 16 }}>Fetching accounts… (may take 30–60 seconds)</p>}

          {/* No results warning */}
          {!loading && step === 2 && suggestions.length === 0 && (
            <p style={{ color: 'orange', fontSize: 13, marginTop: 12 }}>
              No accounts found. Try a different username.
            </p>
          )}

          {/* Steps 2 & 3: Account grid */}
          {(step === 2 || step === 3) && !loading && suggestions.length > 0 && (
            <>
              {Object.entries(grouped).map(([src, accs]) => (
                <div key={src} style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
                    Suggestions for <strong>@{src}</strong>
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {accs.map(acc => {
                      const isSelected = selected.some(a => a.handle === acc.handle);
                      const [bg, fg] = colorFor(acc.handle);
                      return (
                        <div key={acc.handle} onClick={() => toggleSelect(acc)}
                          style={{ border: isSelected ? '2px solid #1a1a2e' : '1px solid #eee', borderRadius: 12, padding: 14, cursor: 'pointer', background: '#fff', position: 'relative' }}>
                          {isSelected && (
                            <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ color: '#fff', fontSize: 11 }}>✓</span>
                            </div>
                          )}
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                            {initials(acc.name)}
                          </div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{acc.name}</div>
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>@{acc.handle}</div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>{acc.followers} followers · {acc.category}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
                <button onClick={handleBack}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#888' }}>{selected.length} selected</span>
                  <button onClick={handleExplore} disabled={selected.length === 0 || loading}
                    style={{ padding: '8px 18px', borderRadius: 8, background: selected.length > 0 ? '#1a1a2e' : '#ccc', color: '#fff', border: 'none', cursor: selected.length > 0 ? 'pointer' : 'not-allowed', fontSize: 13 }}>
                    Explore selected →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }