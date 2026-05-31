import { useState, useEffect } from "react";
import "./Compare.css";

export default function Compare({ allPokemons, onBack, pokemonCache, onSelectPokemon }) {
  // States for the two selected Pokemon
  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);
  
  const [pokemon1, setPokemon1] = useState(null);
  const [pokemon2, setPokemon2] = useState(null);
  
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [error1, setError1] = useState(null);
  const [error2, setError2] = useState(null);

  // Suggested Matchups for quick loading
  const suggestedMatchups = [
    { name1: "charizard", name2: "blastoise", label: "Fire vs Water" },
    { name1: "mewtwo", name2: "mew", label: "Psychic Duel" },
    { name1: "groudon", name2: "kyogre", label: "Land vs Sea" },
    { name1: "dialga", name2: "palkia", label: "Time vs Space" },
    { name1: "lucario", name2: "zoroark", label: "Aura vs Illusion" }
  ];

  // Helper to fetch details of a selected Pokémon
  const fetchPokemonDetails = (name, position) => {
    if (!name) return;
    
    if (position === 1) {
      setLoading1(true);
      setError1(null);
    } else {
      setLoading2(true);
      setError2(null);
    }

    fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Pokémon not found");
        return res.json();
      })
      .then((data) => {
        if (position === 1) {
          setPokemon1(data);
          setLoading1(false);
        } else {
          setPokemon2(data);
          setLoading2(false);
        }
      })
      .catch((err) => {
        if (position === 1) {
          setError1(err.message);
          setLoading1(false);
        } else {
          setError2(err.message);
          setLoading2(false);
        }
      });
  };

  // Keyboard shortcut to handle quick matchups
  const loadMatchup = (name1, name2) => {
    setSearch1(name1);
    setSearch2(name2);
    fetchPokemonDetails(name1, 1);
    fetchPokemonDetails(name2, 2);
  };

  // Filter Pokemon for search 1 and 2
  const filteredList1 = allPokemons
    ? allPokemons.filter((p) => p.name.includes(search1.toLowerCase())).slice(0, 10)
    : [];

  const filteredList2 = allPokemons
    ? allPokemons.filter((p) => p.name.includes(search2.toLowerCase())).slice(0, 10)
    : [];

  // Stat definitions
  const STAT_LABELS = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    speed: "Speed",
  };

  // Get single stat value from stats array
  const getStatVal = (pokemon, statName) => {
    if (!pokemon || !pokemon.stats) return 0;
    const statItem = pokemon.stats.find((s) => s.stat.name === statName);
    return statItem ? statItem.base_stat : 0;
  };

  // Calculate Base Stat Total
  const getStatTotal = (pokemon) => {
    if (!pokemon || !pokemon.stats) return 0;
    return pokemon.stats.reduce((acc, curr) => acc + curr.base_stat, 0);
  };

  // Custom Matchup calculation
  const analyzeMatchup = () => {
    if (!pokemon1 || !pokemon2) return null;

    const total1 = getStatTotal(pokemon1);
    const total2 = getStatTotal(pokemon2);
    
    const types1 = pokemon1.types.map((t) => t.type.name);
    const types2 = pokemon2.types.map((t) => t.type.name);

    // Dynamic Verdict formula
    let winner = "";
    let reason = "";

    if (total1 > total2 + 30) {
      winner = pokemon1.name;
      reason = `${pokemon1.name.toUpperCase()} has a significantly higher raw stat power (+${total1 - total2} Base Stats Total).`;
    } else if (total2 > total1 + 30) {
      winner = pokemon2.name;
      reason = `${pokemon2.name.toUpperCase()} has a significantly higher raw stat power (+${total2 - total1} Base Stats Total).`;
    } else {
      // Very close stats, look at Speed and Attacking potential
      const speed1 = getStatVal(pokemon1, "speed");
      const speed2 = getStatVal(pokemon2, "speed");
      if (speed1 > speed2 + 15) {
        winner = pokemon1.name;
        reason = `${pokemon1.name.toUpperCase()} is faster and will likely strike first to claim the upper hand in battle.`;
      } else if (speed2 > speed1 + 15) {
        winner = pokemon2.name;
        reason = `${pokemon2.name.toUpperCase()} is faster and will likely strike first to claim the upper hand in battle.`;
      } else {
        winner = total1 >= total2 ? pokemon1.name : pokemon2.name;
        reason = "A very balanced matchup! The battle could sway either way depending on move coordination and trainer strategies.";
      }
    }

    return { winner, reason, total1, total2, types1, types2 };
  };

  const matchupResult = analyzeMatchup();

  return (
    <div className="compare-container">
      {/* Head Panel */}
      <div className="compare-head">
        <button className="compare-back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Zahadex</span>
        </button>
        <span className="compare-title-main">Battle Arena Compare</span>
        <div style={{ width: "120px" }}></div>
      </div>

      {/* Suggested Quick Comparisons */}
      <div className="quick-compare-row">
        <span className="quick-compare-label">⚔️ Quick Matchups:</span>
        <div className="quick-compare-buttons">
          {suggestedMatchups.map((match, i) => (
            <button
              key={i}
              className="quick-compare-btn"
              onClick={() => loadMatchup(match.name1, match.name2)}
            >
              {match.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid containing the twin search columns */}
      <div className="selectors-row">
        {/* Pokémon 1 Selector */}
        <div className="selector-field">
          <label>Compare Slot 1</label>
          <div className="search-box-wrap">
            <input
              type="text"
              placeholder="Search or Select Pokémon..."
              value={search1}
              onChange={(e) => {
                setSearch1(e.target.value);
                setShowDropdown1(true);
              }}
              onFocus={() => setShowDropdown1(true)}
            />
            {showDropdown1 && search1 && (
              <div className="compare-dropdown">
                {filteredList1.map((p) => (
                  <div
                    key={p.name}
                    className="dropdown-item"
                    onClick={() => {
                      setSearch1(p.name);
                      setShowDropdown1(false);
                      fetchPokemonDetails(p.name, 1);
                    }}
                  >
                    {p.name.toUpperCase()}
                  </div>
                ))}
                {filteredList1.length === 0 && <div className="dropdown-empty">No results found</div>}
              </div>
            )}
            {search1 && (
              <button className="clear-search-btn" onClick={() => { setSearch1(""); setPokemon1(null); }}>
                ❌
              </button>
            )}
          </div>
        </div>

        <div className="arena-divider-glow">VS</div>

        {/* Pokémon 2 Selector */}
        <div className="selector-field">
          <label>Compare Slot 2</label>
          <div className="search-box-wrap">
            <input
              type="text"
              placeholder="Search or Select Pokémon..."
              value={search2}
              onChange={(e) => {
                setSearch2(e.target.value);
                setShowDropdown2(true);
              }}
              onFocus={() => setShowDropdown2(true)}
            />
            {showDropdown2 && search2 && (
              <div className="compare-dropdown">
                {filteredList2.map((p) => (
                  <div
                    key={p.name}
                    className="dropdown-item"
                    onClick={() => {
                      setSearch2(p.name);
                      setShowDropdown2(false);
                      fetchPokemonDetails(p.name, 2);
                    }}
                  >
                    {p.name.toUpperCase()}
                  </div>
                ))}
                {filteredList2.length === 0 && <div className="dropdown-empty">No results found</div>}
              </div>
            )}
            {search2 && (
              <button className="clear-search-btn" onClick={() => { setSearch2(""); setPokemon2(null); }}>
                ❌
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Compare Deck (Stats Visuals) */}
      <div className="compare-battle-floor">
        
        {/* Left Side: Pokemon 1 Sheet */}
        <div className={`compare-card-column ${pokemon1 ? `col-type-${pokemon1.types?.[0]?.type?.name || "normal"}` : "slot-empty"}`}>
          {loading1 ? (
            <div className="col-loading-indicator">
              <div className="loading-spinner"></div>
              <span>Scanning Database...</span>
            </div>
          ) : error1 ? (
            <div className="error-indicator">⚠️ {error1}</div>
          ) : pokemon1 ? (
            <div className="compare-card-body">
              <div className="col-id">#{String(pokemon1.id).padStart(3, "0")}</div>
              
              <div className="compare-sprite-wrap">
                <img
                  src={
                    pokemon1.sprites?.other?.["official-artwork"]?.front_default ||
                    pokemon1.sprites?.front_default ||
                    ""
                  }
                  alt={pokemon1.name}
                  className="compare-art-img"
                />
              </div>

              <h2 className="col-name" onClick={() => onSelectPokemon(pokemon1.name)}>
                {pokemon1.name}
              </h2>

              <div className="col-types-row">
                {pokemon1.types?.map((t) => (
                  <span key={t.type.name} className={`type-tag tag-${t.type.name}`}>
                    {t.type.name}
                  </span>
                ))}
              </div>

              <div className="physicals-row">
                <div className="physical-spec">
                  <span className="spec-lbl">HEIGHT</span>
                  <span className="spec-val">{pokemon1.height / 10} m</span>
                </div>
                <div className="physical-spec">
                  <span className="spec-lbl">WEIGHT</span>
                  <span className="spec-val">{pokemon1.weight / 10} kg</span>
                </div>
              </div>

              <div className="abilities-row">
                <span className="spec-lbl">ABILITIES</span>
                <div className="abilities-list">
                  {pokemon1.abilities?.map((a) => (
                    <span key={a.ability.name} className="ability-badge">
                      {a.ability.name.replace("-", " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-slot-msg">
              <div className="empty-slot-circle">1</div>
              <p>Choose first Pokémon to enter Battle Arena</p>
            </div>
          )}
        </div>

        {/* Middle Stats Comparison List */}
        <div className="stats-metric-center">
          {pokemon1 && pokemon2 ? (
            <div className="stats-chart-column">
              <h3 className="chart-title">📊 Attribute Compare Matrix & Power Analysis</h3>
              
              {Object.keys(STAT_LABELS).map((statName) => {
                const label = STAT_LABELS[statName];
                const val1 = getStatVal(pokemon1, statName);
                const val2 = getStatVal(pokemon2, statName);
                
                const isWinner1 = val1 > val2;
                const isWinner2 = val2 > val1;
                const isDraw = val1 === val2;

                const maxStatVal = 180; // normalized base stat value
                const widthPct1 = Math.min(100, (val1 / maxStatVal) * 100);
                const widthPct2 = Math.min(100, (val2 / maxStatVal) * 100);

                return (
                  <div key={statName} className="stat-matchup-row">
                    <div className="stat-name-label">{label}</div>
                    
                    <div className="meter-interactive-group">
                      {/* Left bar (Pokemon 1) */}
                      <div className="left-meter-container">
                        <div className="stat-val-text val-left" style={{ color: isWinner1 ? "#10b981" : isDraw ? "#64748b" : "#ef4444" }}>
                          {val1} {isWinner1 && "🏆"}
                        </div>
                        <div className="progress-bar-container">
                          <div
                            className={`progress-fill left-fill ${isWinner1 ? "is-winner" : "is-loser"}`}
                            style={{ width: `${widthPct1}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Right bar (Pokemon 2) */}
                      <div className="right-meter-container">
                        <div className="progress-bar-container">
                          <div
                            className={`progress-fill right-fill ${isWinner2 ? "is-winner" : "is-loser"}`}
                            style={{ width: `${widthPct2}%` }}
                          ></div>
                        </div>
                        <div className="stat-val-text val-right" style={{ color: isWinner2 ? "#10b981" : isDraw ? "#64748b" : "#ef4444" }}>
                          {isWinner2 && "🏆"} {val2}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Total Stats Comparison */}
              <div className="stats-comparison-total">
                <div className="total-header">⚡ BASE STATS TOTAL (BST)</div>
                <div className="total-meters-group">
                  <div className="total-bar-col">
                    <span className="total-num" style={{ color: matchupResult.total1 >= matchupResult.total2 ? "#10b981" : "#94a3b8" }}>
                      {matchupResult.total1}
                    </span>
                    <div className="total-progress-track">
                      <div 
                        className="total-progress-fill" 
                        style={{ 
                          width: `${Math.min(100, (matchupResult.total1 / 720) * 100)}%`,
                          background: matchupResult.total1 >= matchupResult.total2 ? "#10b981" : "#ef4444"
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="total-mid-tag">BST</div>

                  <div className="total-bar-col">
                    <span className="total-num text-right" style={{ color: matchupResult.total2 >= matchupResult.total1 ? "#10b981" : "#94a3b8" }}>
                      {matchupResult.total2}
                    </span>
                    <div className="total-progress-track">
                      <div 
                        className="total-progress-fill float-right" 
                        style={{ 
                          width: `${Math.min(100, (matchupResult.total2 / 720) * 100)}%`,
                          background: matchupResult.total2 >= matchupResult.total1 ? "#10b981" : "#ef4444"
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verdict Section */}
              {matchupResult && (
                <div className="battle-verdict-box">
                  <div className="verdict-banner">
                    ⚔️ ARENA DECISION VERDICT
                  </div>
                  <p className="verdict-text">
                    {matchupResult.reason}
                  </p>
                  <p className="type-matchups-footer">
                    <strong>Type Lineup Profile:</strong> {pokemon1.name.toUpperCase()} ({matchupResult.types1.join("/")}) vs {pokemon2.name.toUpperCase()} ({matchupResult.types2.join("/")})
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="stats-chart-placeholder">
              <h3>⚔️ Duel Statistics Arena</h3>
              <p>Select Pokémon in both slots to plot stat charts, compute strength advantages, and render simulated battle outputs.</p>
              <div className="arena-swords-icon">⚔️</div>
            </div>
          )}
        </div>

        {/* Right Side: Pokemon 2 Sheet */}
        <div className={`compare-card-column ${pokemon2 ? `col-type-${pokemon2.types?.[0]?.type?.name || "normal"}` : "slot-empty"}`}>
          {loading2 ? (
            <div className="col-loading-indicator">
              <div className="loading-spinner"></div>
              <span>Scanning Database...</span>
            </div>
          ) : error2 ? (
            <div className="error-indicator">⚠️ {error2}</div>
          ) : pokemon2 ? (
            <div className="compare-card-body">
              <div className="col-id">#{String(pokemon2.id).padStart(3, "0")}</div>
              
              <div className="compare-sprite-wrap">
                <img
                  src={
                    pokemon2.sprites?.other?.["official-artwork"]?.front_default ||
                    pokemon2.sprites?.front_default ||
                    ""
                  }
                  alt={pokemon2.name}
                  className="compare-art-img"
                />
              </div>

              <h2 className="col-name" onClick={() => onSelectPokemon(pokemon2.name)}>
                {pokemon2.name}
              </h2>

              <div className="col-types-row">
                {pokemon2.types?.map((t) => (
                  <span key={t.type.name} className={`type-tag tag-${t.type.name}`}>
                    {t.type.name}
                  </span>
                ))}
              </div>

              <div className="physicals-row">
                <div className="physical-spec">
                  <span className="spec-lbl">HEIGHT</span>
                  <span className="spec-val">{pokemon2.height / 10} m</span>
                </div>
                <div className="physical-spec">
                  <span className="spec-lbl">WEIGHT</span>
                  <span className="spec-val">{pokemon2.weight / 10} kg</span>
                </div>
              </div>

              <div className="abilities-row">
                <span className="spec-lbl">ABILITIES</span>
                <div className="abilities-list">
                  {pokemon2.abilities?.map((a) => (
                    <span key={a.ability.name} className="ability-badge">
                      {a.ability.name.replace("-", " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-slot-msg">
              <div className="empty-slot-circle">2</div>
              <p>Choose second Pokémon to enter Battle Arena</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
