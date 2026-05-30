import { useState, useEffect, useMemo } from "react";
import "./App.css";
import DetailPage from "./DetailPage";

const LIMIT = 20;

const REGIONS = [
  { key: "all", name: "All Regions" },
  { key: "kanto", name: "Kanto (Gen 1)", idStart: 1, idEnd: 151 },
  { key: "johto", name: "Johto (Gen 2)", idStart: 152, idEnd: 251 },
  { key: "hoenn", name: "Hoenn (Gen 3)", idStart: 252, idEnd: 386 },
  { key: "sinnoh", name: "Sinnoh (Gen 4)", idStart: 387, idEnd: 493 },
  { key: "unova", name: "Unova (Gen 5)", idStart: 494, idEnd: 649 },
  { key: "kalos", name: "Kalos (Gen 6)", idStart: 650, idEnd: 721 },
  { key: "alola", name: "Alola (Gen 7)", idStart: 722, idEnd: 809 },
  { key: "galar", name: "Galar (Gen 8)", idStart: 810, idEnd: 898 },
  { key: "paldea", name: "Paldea (Gen 9)", idStart: 899, idEnd: 1025 },
];

const TYPES = [
  { key: "all", name: "All Types" },
  { key: "normal", name: "Normal" },
  { key: "fire", name: "Fire" },
  { key: "water", name: "Water" },
  { key: "grass", name: "Grass" },
  { key: "electric", name: "Electric" },
  { key: "ice", name: "Ice" },
  { key: "fighting", name: "Fighting" },
  { key: "poison", name: "Poison" },
  { key: "ground", name: "Ground" },
  { key: "flying", name: "Flying" },
  { key: "psychic", name: "Psychic" },
  { key: "bug", name: "Bug" },
  { key: "rock", name: "Rock" },
  { key: "ghost", name: "Ghost" },
  { key: "dragon", name: "Dragon" },
  { key: "dark", name: "Dark" },
  { key: "steel", name: "Steel" },
  { key: "fairy", name: "Fairy" },
];

const STAT_NAMES = {
  hp: "HP",
  attack: "ATK",
  defense: "DEF",
  "special-attack": "SP.ATK",
  "special-defense": "SP.DEF",
  speed: "SPD",
};

const STAT_COLORS = {
  hp: "#22c55e",
  attack: "#f97316",
  defense: "#eab308",
  "special-attack": "#3b82f6",
  "special-defense": "#a855f7",
  speed: "#f43f5e",
};

const RARITY_REFUND = { Legendary: 500, Epic: 200, Rare: 100, Common: 50 };

const getRarity = (pokemon) => {
  const bst = pokemon.stats?.reduce((sum, s) => sum + s.base_stat, 0) || 300;
  if (bst >= 570) return { name: "Legendary", color: "#f59e0b", bst };
  if (bst >= 480) return { name: "Epic",      color: "#a855f7", bst };
  if (bst >= 380) return { name: "Rare",      color: "#3b82f6", bst };
  return             { name: "Common",    color: "#94a3b8", bst };
};

const loadStorage = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

// ─────────────────────────────────────────
//  GACHA COMPONENT
// ─────────────────────────────────────────
function GachaGame({ allPokemons, onSelectPokemon }) {
  const [coins, setCoins]                   = useState(() => loadStorage("gacha_coins", 1000));
  const [collection, setCollection]         = useState(() => loadStorage("gacha_collection", []));
  const [history, setHistory]               = useState(() => loadStorage("gacha_history", []));
  const [rolling, setRolling]               = useState(false);
  const [rollResults, setRollResults]       = useState([]);
  const [viewingResults, setViewingResults] = useState(false);
  const [activeFilter, setActiveFilter]     = useState("all");
  const [alert, setAlert]                   = useState(null);

  useEffect(() => { localStorage.setItem("gacha_coins",      JSON.stringify(coins));      }, [coins]);
  useEffect(() => { localStorage.setItem("gacha_collection", JSON.stringify(collection)); }, [collection]);
  useEffect(() => { localStorage.setItem("gacha_history",    JSON.stringify(history));    }, [history]);

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const executeRoll = async (rollCount) => {
    if (allPokemons.length === 0) {
      showAlert("Database belum siap! Tunggu sebentar.", "error");
      return;
    }
    const cost = rollCount === 10 ? 900 : 100;
    if (coins < cost) {
      showAlert("Zaha-Coins tidak cukup! Klaim dulu.", "error");
      return;
    }

    setCoins((prev) => prev - cost);
    setRolling(true);
    setRollResults([]);
    setViewingResults(true);

    setTimeout(async () => {
      const promises = Array.from({ length: rollCount }, () => {
        const idx = Math.floor(Math.random() * allPokemons.length);
        return fetch(allPokemons[idx].url).then((r) => r.json()).catch(() => null);
      });

      const results = (await Promise.all(promises)).filter(Boolean);

      const drawnItems = results.map((pokemon) => {
        const rarity = getRarity(pokemon);
        return {
          id:          pokemon.id,
          name:        pokemon.name,
          types:       pokemon.types?.map((t) => t.type.name) || ["normal"],
          sprite:      pokemon.sprites?.other?.["official-artwork"]?.front_default || pokemon.sprites?.front_default || "",
          cry:         pokemon.cries?.latest || "",
          rarity:      rarity.name,
          rarityColor: rarity.color,
          bst:         rarity.bst,
          drawnAt:     new Date().toISOString(),
        };
      });

      setRollResults(drawnItems);

      setCollection((prev) => {
        const next = [...prev];
        drawnItems.forEach((item) => {
          const idx = next.findIndex((c) => c.id === item.id);
          if (idx >= 0) {
            next[idx] = { ...next[idx], count: (next[idx].count || 1) + 1, latestDrawnAt: item.drawnAt };
          } else {
            next.push({ ...item, count: 1, latestDrawnAt: item.drawnAt });
          }
        });
        return next;
      });

      setHistory((prev) => [
        ...drawnItems.map((item) => ({
          id:          item.id,
          name:        item.name,
          rarity:      item.rarity,
          rarityColor: item.rarityColor,
          time:        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        })),
        ...prev,
      ].slice(0, 50));

      setRolling(false);
    }, 1800);
  };

  const handleRelease = (id, rarityName) => {
    const refund = RARITY_REFUND[rarityName] || 50;
    setCoins((prev) => prev + refund);
    setCollection((prev) => {
      const match = prev.find((item) => item.id === id);
      if (!match) return prev;
      if (match.count > 1) return prev.map((item) => item.id === id ? { ...item, count: item.count - 1 } : item);
      return prev.filter((item) => item.id !== id);
    });
    showAlert(`Dilepaskan! +${refund} Zaha-Coins dikembalikan!`, "success");
  };

  const filteredCollection = collection.filter((item) =>
    activeFilter === "all" || item.rarity?.toLowerCase() === activeFilter
  );

  return (
    <div className="gacha-container">
      {alert && (
        <div style={{
          position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, padding: "10px 20px", borderRadius: "30px",
          fontWeight: "bold", fontSize: "13px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          background: alert.type === "error" ? "#fee2e2" : "#d1fae5",
          color:      alert.type === "error" ? "#991b1b" : "#065f46",
        }}>
          {alert.message}
        </div>
      )}

      {/* Header */}
      <div className="gacha-simple-header">
        <div className="gacha-title-section">
          <h2>Zaha Gacha</h2>
          <p>Spin & collect companions</p>
        </div>
        <div className="gacha-right-pill">
          <div className="coin-box">
            <span>🪙</span>
            <span>{coins}</span>
          </div>
          <button
            className="claim-btn"
            onClick={() => { setCoins((prev) => prev + 500); showAlert("+500 Zaha-Coins diklaim!", "success"); }}
          >
            +500 Coins
          </button>
        </div>
      </div>

      <div className="gacha-main-grid">
        {/* Spin Panel */}
        <div className="gacha-spin-panel">
          <div className="gacha-visual-box">
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
              alt="gacha-ball"
              className={`gacha-visual-ball ${rolling ? "spinning" : ""}`}
            />
          </div>

          <div className="spin-options-row">
            <button className="spin-action-btn single" disabled={rolling} onClick={() => executeRoll(1)}>
              {rolling ? "Rolling..." : "1x Pull (100)"}
            </button>
            <button className="spin-action-btn multi" disabled={rolling} onClick={() => executeRoll(10)}>
              {rolling ? "Rolling..." : "10x Pull (900)"}
            </button>
          </div>

          <div className="rate-compact-list">
            <div className="rate-compact-item legendary"><span>Legendary</span><span>5%</span></div>
            <div className="rate-compact-item epic">     <span>Epic</span>      <span>15%</span></div>
            <div className="rate-compact-item rare">     <span>Rare</span>      <span>30%</span></div>
            <div className="rate-compact-item">          <span>Common</span>    <span>50%</span></div>
          </div>
        </div>

        {/* Content Panel */}
        <div className="gacha-content-panel">
          {viewingResults ? (
            <div className="gacha-results-window">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "14px", color: "#f8fafc" }}>
                  {rolling ? "Drawing..." : "Roll Results"}
                </h3>
                {!rolling && (
                  <button
                    onClick={() => setViewingResults(false)}
                    style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "4px 12px", borderRadius: "8px", fontWeight: "bold", fontSize: "11px", cursor: "pointer" }}
                  >
                    Done
                  </button>
                )}
              </div>

              {rolling ? (
                <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p className="loading" style={{ margin: 0, color: "white" }}>Loading...</p>
                </div>
              ) : (
                <div className="result-card-grid">
                  {rollResults.map((p, idx) => (
                    <div key={idx} className="result-pocket-card" onClick={() => { try { new Audio(p.cry).play().catch(() => {}); } catch {} }}>
                      <img src={p.sprite} alt={p.name} style={{ width: "48px", height: "48px", objectFit: "contain" }} />
                      <div className="result-poke-name">{p.name}</div>
                      <span className="result-rarity-badge" style={{ backgroundColor: p.rarityColor, color: "#fff" }}>
                        {p.rarity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="gacha-notebook-section">
              <div className="notebook-filter-bar">
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "900", color: "#1e3a8a" }}>
                  My Collection ({collection.length})
                </h3>
                <div className="notebook-inner-tabs">
                  {["all", "legendary", "epic", "rare", "common"].map((c) => (
                    <button
                      key={c}
                      className={`notebook-tab-btn ${activeFilter === c ? "active" : ""}`}
                      onClick={() => setActiveFilter(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCollection.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                  <p style={{ margin: 0, fontSize: "13px" }}>Kosong. Pull dulu!</p>
                </div>
              ) : (
                <div className="notebook-grid">
                  {filteredCollection.map((p) => (
                    <div key={p.id} className="notebook-card">
                      <span className="notebook-count">x{p.count || 1}</span>
                      <div
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
                        onClick={() => onSelectPokemon && onSelectPokemon(p.id)}
                      >
                        <img src={p.sprite} alt={p.name} style={{ width: "50px", height: "50px", objectFit: "contain" }} />
                        <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "capitalize", color: "#334155" }}>{p.name}</span>
                        <span style={{ fontSize: "9px", fontWeight: "bold", color: p.rarityColor, textTransform: "uppercase" }}>{p.rarity}</span>
                      </div>
                      <button className="release-btn" onClick={() => handleRelease(p.id, p.rarity)}>
                        Release (+{RARITY_REFUND[p.rarity] || 50})
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────
function App() {
  const [allPokemons, setAllPokemons]   = useState([]);
  const [pokemonCache, setPokemonCache] = useState({});
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [offset, setOffset]             = useState(0);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showGacha, setShowGacha]       = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [typePokemons, setTypePokemons] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [detailPokemon, setDetailPokemon]     = useState(null);
  const [favoriteIds, setFavoriteIds]   = useState(() => loadStorage("favoriteIds", []));
  const [favoritePokemons, setFavoritePokemons] = useState([]);

  // Fetch all pokemon names
  useEffect(() => {
    fetch("https://pokeapi.co/api/v2/pokemon?limit=1025")
      .then((res) => res.json())
      .then((data) => { setAllPokemons(data.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Sync favorites to localStorage
  useEffect(() => {
    localStorage.setItem("favoriteIds", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  // Fetch favorite pokemon details
  useEffect(() => {
    if (favoriteIds.length === 0) { setFavoritePokemons([]); return; }
    Promise.all(
      favoriteIds.map((id) =>
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then((r) => r.json()).catch(() => null)
      )
    ).then((details) => setFavoritePokemons(details.filter(Boolean)));
  }, [favoriteIds]);

  // Fetch pokemon by type
  useEffect(() => {
    if (selectedType === "all") { setTypePokemons(null); return; }
    setSearchLoading(true);
    fetch(`https://pokeapi.co/api/v2/type/${selectedType}`)
      .then((res) => res.json())
      .then((data) => {
        setTypePokemons(new Set((data.pokemon || []).map((p) => p.pokemon?.name)));
        setSearchLoading(false);
      })
      .catch(() => setSearchLoading(false));
  }, [selectedType]);

  // Filter logic
  const filteredBase = useMemo(() => {
    return allPokemons.filter((p) => {
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      if (selectedRegion !== "all") {
        const region = REGIONS.find((r) => r.key === selectedRegion);
        if (region && (id < region.idStart || id > region.idEnd)) return false;
      }
      if (selectedType !== "all" && typePokemons && !typePokemons.has(p.name)) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allPokemons, selectedRegion, selectedType, typePokemons, search]);

  const visibleBaseSlice = useMemo(() => filteredBase.slice(0, offset + LIMIT), [filteredBase, offset]);

  // Fetch details for visible pokemon
  useEffect(() => {
    if (visibleBaseSlice.length === 0) return;
    const needed = visibleBaseSlice.filter((p) => !pokemonCache[p.name]);
    if (needed.length === 0) return;
    setSearchLoading(true);
    Promise.all(needed.map((p) => fetch(p.url).then((r) => r.json()).catch(() => null)))
      .then((results) => {
        setPokemonCache((prev) => {
          const next = { ...prev };
          results.forEach((d) => { if (d?.name) next[d.name] = d; });
          return next;
        });
        setSearchLoading(false);
      })
      .catch(() => setSearchLoading(false));
  }, [visibleBaseSlice]);

  const toggleFavorite = (pokemon) => {
    const isFav = favoriteIds.includes(pokemon.id);
    if (isFav) {
      setFavoriteIds((prev) => prev.filter((id) => id !== pokemon.id));
      setFavoritePokemons((prev) => prev.filter((p) => p.id !== pokemon.id));
    } else {
      setFavoriteIds((prev) => [...prev, pokemon.id]);
      setFavoritePokemons((prev) => [...prev, pokemon]);
    }
  };

  const isFavorite = (id) => favoriteIds.includes(id);
  const firstType  = (pokemon) => pokemon.types?.[0]?.type?.name || "normal";

  const resetFilters = () => {
    setSearch("");
    setSelectedRegion("all");
    setSelectedType("all");
    setOffset(0);
  };

  const goHome = (e) => {
    e.preventDefault();
    setShowFavorites(false);
    setShowGacha(false);
    setSelectedPokemon(null);
    resetFilters();
  };

  const goFavorit = (e) => {
    e.preventDefault();
    setShowFavorites(true);
    setShowGacha(false);
    setSelectedPokemon(null);
    resetFilters();
  };

  const goGacha = () => {
    setShowGacha((prev) => !prev);
    setShowFavorites(false);
    setSelectedPokemon(null);
  };

  const openDetail = (nameOrId) => {
    fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`)
      .then((r) => r.json())
      .then((data) => setDetailPokemon(data))
      .catch((err) => console.error(err));
  };

  const hasMore   = offset + LIMIT < filteredBase.length;
  const displayed = showFavorites
    ? favoritePokemons
    : visibleBaseSlice.map((p) => pokemonCache[p.name]).filter(Boolean);

  // ── Detail Page View ──
  if (detailPokemon) {
    return (
      <div className="app">
        <DetailPage
          pokemon={detailPokemon}
          onBack={() => setDetailPokemon(null)}
          onSelectPokemon={openDetail}
        />
      </div>
    );
  }

  // ── Main View ──
  return (
    <div className="app">

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo" onClick={goHome} style={{ cursor: "pointer" }}>
          <img
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
            alt="pokeball"
          />
          <span>Zahadex</span>
        </div>

        <div className="navbar-right">
          <div className="navbar-links">
            <a href="#" className={!showFavorites && !showGacha ? "nav-item active" : "nav-item"} onClick={goHome}>
              <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Home</span>
            </a>
            <a href="#" className={showFavorites ? "nav-item active" : "nav-item"} onClick={goFavorit}>
              <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              <span>Favorites {favoriteIds.length > 0 && `(${favoriteIds.length})`}</span>
            </a>
          </div>

          <div className="navbar-status">
            <div className="status-pill database-status">
              <span className="status-indicator-dot dot-pulse"></span>
              <span className="status-label">SYS</span>
              <span className="status-value">ONLINE</span>
            </div>
            <div className="status-pill count-status">
              <span className="status-label">POKEMON</span>
              <span className="status-value">1025</span>
            </div>
            {favoriteIds.length > 0 && (
              <div className="status-pill favorites-status">
                <span className="status-label">FAV</span>
                <span className="status-value">{favoriteIds.length}</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Gacha View */}
      {showGacha ? (
        <GachaGame allPokemons={allPokemons} onSelectPokemon={openDetail} />
      ) : (
        <>
          {/* Filters */}
          {!showFavorites && (
            <div className="filter-container">
              <div className="search-wrapper">
                <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="search"
                  type="text"
                  placeholder="Search Pokémon..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                />
              </div>
              <div className="filters-row">
                <div className="filter-select-wrapper">
                  <svg className="filter-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <select className="filter-select" value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); setOffset(0); }}>
                    {REGIONS.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                  </select>
                </div>
                <div className="filter-select-wrapper">
                  <svg className="filter-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <select className="filter-select" value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setOffset(0); }}>
                    {TYPES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Favorites Title */}
          {showFavorites && (
            <h2 className="fav-title">
              Favorite Pokémon {favoriteIds.length === 0 && "(empty)"}
            </h2>
          )}

          {/* Grid */}
          {loading ? (
            <p className="loading">Loading...</p>
          ) : (
            <div>
              {displayed.length === 0 && (
                <div className="empty-state">
                  <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="empty" className="empty-image" />
                  <h3>Pokémon Not Found</h3>
                  <p>Try a different name, region, or type.</p>
                  <button className="reset-btn" onClick={resetFilters}>Reset</button>
                </div>
              )}

              <div className="grid">
                {displayed.map((pokemon) => (
                  <div
                    key={pokemon.id}
                    className={`card card-${firstType(pokemon)}`}
                    onClick={() => setSelectedPokemon(pokemon)}
                  >
                    <button
                      className="card-logo-detail"
                      aria-label="Detail"
                      onClick={(e) => { e.stopPropagation(); setDetailPokemon(pokemon); }}
                    >
                      <svg viewBox="0 0 100 100" width="18" height="18">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" />
                        <line x1="8" y1="50" x2="92" y2="50" stroke="currentColor" strokeWidth="10" />
                        <circle cx="50" cy="50" r="18" fill="white" stroke="currentColor" strokeWidth="10" />
                        <circle cx="50" cy="50" r="6" fill="currentColor" />
                      </svg>
                      <span className="detail-tooltip">Detail</span>
                    </button>

                    <button
                      className={`fav-btn ${isFavorite(pokemon.id) ? "fav-active" : ""}`}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(pokemon); }}
                    >
                      {isFavorite(pokemon.id) ? "❤️" : "🤍"}
                    </button>

                    <img
                      src={pokemon.sprites?.other?.["official-artwork"]?.front_default || pokemon.sprites?.front_default || ""}
                      alt={pokemon.name}
                    />
                    <p className="poke-id">#{pokemon.id}</p>
                    <p className="poke-name">{pokemon.name}</p>
                    <div className="types">
                      {pokemon.types?.map((t) => (
                        <span key={t.type.name} className={`type ${t.type.name}`}>{t.type.name}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {searchLoading && <p className="loading">Loading...</p>}

              {hasMore && !showFavorites && (
                <button className="load-more" disabled={searchLoading} onClick={() => setOffset((prev) => prev + LIMIT)}>
                  {searchLoading ? "Loading..." : "Load More"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {selectedPokemon && (
        <div className="modal-overlay" onClick={() => setSelectedPokemon(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedPokemon(null)}>×</button>

            <div className={`modal-header type-${firstType(selectedPokemon)}`}>
              <div className="header-blob"></div>
              <img
                className="modal-artwork"
                src={selectedPokemon.sprites?.other?.["official-artwork"]?.front_default || selectedPokemon.sprites?.front_default || ""}
                alt={selectedPokemon.name}
              />
              <div className="modal-title-wrap">
                <span className="modal-id">#{selectedPokemon.id}</span>
                <h2 className="modal-name">{selectedPokemon.name}</h2>
                <div className="modal-types">
                  {selectedPokemon.types?.map((t) => (
                    <span key={t.type.name} className={`type ${t.type.name}`}>{t.type.name}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-body">
              {selectedPokemon.cries?.latest && (
                <button
                  className="cry-btn"
                  onClick={() => { try { new Audio(selectedPokemon.cries.latest).play().catch(() => {}); } catch {} }}
                >
                  <span className="cry-icon">🔊</span> Play Pokémon Cry
                </button>
              )}

              <div className="modal-info-row">
                <div className="info-box">
                  <span className="info-label">Height</span>
                  <span className="info-value">{(selectedPokemon.height / 10).toFixed(1)} m</span>
                </div>
                <div className="info-box">
                  <span className="info-label">Weight</span>
                  <span className="info-value">{(selectedPokemon.weight / 10).toFixed(1)} kg</span>
                </div>
                <div className="info-box">
                  <span className="info-label">Abilities</span>
                  <span className="info-value" style={{ textTransform: "capitalize", fontSize: "0.8rem" }}>
                    {selectedPokemon.abilities?.map((a) => a.ability.name).join(", ")}
                  </span>
                </div>
              </div>

              <div className="modal-stats">
                <h3>Base Stats</h3>
                {selectedPokemon.stats?.map((s) => (
                  <div key={s.stat.name} className="stat-row">
                    <span className="stat-label">{STAT_NAMES[s.stat.name] || s.stat.name}</span>
                    <span className="stat-val">{s.base_stat}</span>
                    <div className="stat-bar-container">
                      <div
                        className="stat-bar"
                        style={{
                          width: `${Math.min(100, (s.base_stat / 255) * 100)}%`,
                          backgroundColor: STAT_COLORS[s.stat.name] || "#94a3b8",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gacha FAB Button */}
      <div className="gacha-fab-wrapper">
        <div className="gacha-fab-tooltip">{showGacha ? "Close Gacha" : "Play Gacha!"}</div>
        <button
          className={`gacha-fab-btn ${showGacha ? "active" : ""}`}
          title={showGacha ? "Close Gacha" : "Play Gacha!"}
          onClick={goGacha}
        >
          <div className="gacha-fab-red"></div>
          <div className="gacha-fab-white"></div>
          <div className="gacha-fab-center-outer">
            <div className="gacha-fab-center-inner"></div>
          </div>
          <div className="gacha-fab-shine"></div>
        </button>
      </div>

    </div>
  );
}

export default App;