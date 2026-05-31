import { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";
import DetailPage from "./DetailPage";
import Login from "./Login";
import Compare from "./Compare";
import Quiz from "./Quiz";

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

// Rarity helper based on Base Stat Total (BST)
const getRarity = (pokemon) => {
  const bst = pokemon.stats?.reduce((sum, s) => sum + s.base_stat, 0) || 300;
  if (bst >= 570) {
    return { name: "Legendary", color: "#f59e0b", borderClass: "border-[#f59e0b]", bgClass: "bg-gradient-to-br from-amber-500/10 to-yellow-500/30 text-amber-500", label: "Legendary", bst };
  } else if (bst >= 480) {
    return { name: "Epic", color: "#a855f7", borderClass: "border-[#a855f7]", bgClass: "bg-gradient-to-br from-purple-500/10 to-fuchsia-500/30 text-purple-600", label: "Epic", bst };
  } else if (bst >= 380) {
    return { name: "Rare", color: "#3b82f6", borderClass: "border-[#3b82f6]", bgClass: "bg-gradient-to-br from-blue-500/10 to-cyan-500/30 text-blue-500", label: "Rare", bst };
  } else {
    return { name: "Common", color: "#94a3b8", borderClass: "border-[#e2e8f0]", bgClass: "bg-gradient-to-br from-slate-500/5 to-slate-200/20 text-slate-500", label: "Common", bst };
  }
};

function GachaGame({ allPokemons, onSelectPokemon, gachaCollection, setGachaCollection }) {
  const [coins, setCoins] = useState(() => {
    try {
      const saved = localStorage.getItem("gacha_coins");
      return saved ? parseInt(saved, 10) : 1000;
    } catch {
      return 1000;
    }
  });

  const [gachaHistory, setGachaHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("gacha_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [rolling, setRolling] = useState(false);
  const [currentRollResults, setCurrentRollResults] = useState([]);
  const [viewingResults, setViewingResults] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");
  const [gachaAlert, setGachaAlert] = useState(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("gacha_coins", coins.toString());
  }, [coins]);

  useEffect(() => {
    localStorage.setItem("gacha_collection", JSON.stringify(gachaCollection));
  }, [gachaCollection]);

  useEffect(() => {
    localStorage.setItem("gacha_history", JSON.stringify(gachaHistory));
  }, [gachaHistory]);

  const claimFreeCoins = () => {
    setCoins((prev) => prev + 500);
    showAlert("Bonus +500 Poké-Coins claimed successfully!", "success");
  };

  const showAlert = (message, type = "success") => {
    setGachaAlert({ message, type });
    setTimeout(() => {
      setGachaAlert(null);
    }, 3000);
  };

  const triggerSound = (url) => {
    try {
      const audio = new Audio(url);
      audio.volume = 0.25;
      audio.play().catch(() => {});
    } catch {}
  };

  const executeRoll = async (rollCount) => {
    if (allPokemons.length === 0) {
      showAlert("Pokédex database is not loaded yet! Please wait.", "error");
      return;
    }

    const cost = rollCount === 10 ? 900 : 100;
    if (coins < cost) {
      showAlert("Insufficient Poké-Coins! Claim some free coins above.", "error");
      return;
    }

    // Deduct coins & start roll
    setCoins((prev) => prev - cost);
    setRolling(true);
    setCurrentRollResults([]);
    setViewingResults(true);

    // Audio cue for entry
    try {
      const audioObj = new Audio("https://play.pokemonshowdown.com/audio/sfx/pokeball-throw.mp3");
      audioObj.volume = 0.3;
      audioObj.play().catch(() => {});
    } catch {}

    // Delay roll output to simulate rolling machine physics (1.6s)
    setTimeout(async () => {
      const drawnItems = [];
      const rollPromises = [];

      for (let i = 0; i < rollCount; i++) {
        const randomIndex = Math.floor(Math.random() * allPokemons.length);
        const basicPokemon = allPokemons[randomIndex];
        // Fetch detailed data from PokeAPI
        rollPromises.push(
          fetch(basicPokemon.url)
            .then((r) => r.json())
            .catch(() => null)
        );
      }

      const results = await Promise.all(rollPromises);
      const validResults = results.filter(Boolean);

      validResults.forEach((pokemon) => {
        const rarityInfo = getRarity(pokemon);
        const drawnAt = new Date().toISOString();
        const cloneObj = {
          id: pokemon.id,
          name: pokemon.name,
          types: pokemon.types?.map((t) => t.type.name) || ["normal"],
          sprite: pokemon.sprites?.other?.["official-artwork"]?.front_default || pokemon.sprites?.front_default || "",
          cry: pokemon.cries?.latest || "",
          rarity: rarityInfo.name,
          rarityColor: rarityInfo.color,
          rarityLabel: rarityInfo.label,
          bst: rarityInfo.bst,
          drawnAt,
        };
        drawnItems.push(cloneObj);
      });

      if (drawnItems.length > 0) {
        setCurrentRollResults(drawnItems);
        // Play final open sound
        try {
          const audioObj = new Audio("https://play.pokemonshowdown.com/audio/sfx/pokeball-open.mp3");
          audioObj.volume = 0.35;
          audioObj.play().catch(() => {});
        } catch {}

        // Add to collection
        setGachaCollection((prev) => {
          let updated = [...prev];
          drawnItems.forEach((item) => {
            const index = updated.findIndex((col) => col.id === item.id);
            if (index >= 0) {
              updated[index].count = (updated[index].count || 1) + 1;
              updated[index].latestDrawnAt = item.drawnAt;
            } else {
              updated.push({ ...item, count: 1, latestDrawnAt: item.drawnAt });
            }
          });
          return updated;
        });

        // Add to history lines
        const newHist = drawnItems.map(item => ({
          name: item.name,
          rarity: item.rarity,
          rarityColor: item.rarityColor,
          id: item.id,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }));
        setGachaHistory(prev => [ ...newHist, ...prev ].slice(0, 50));
      }

      setRolling(false);
    }, 1800);
  };

  const handleRelease = (id, rarityName) => {
    let refund = 50;
    if (rarityName === "Legendary") refund = 500;
    else if (rarityName === "Epic") refund = 200;
    else if (rarityName === "Rare") refund = 100;

    setCoins((prev) => prev + refund);
    
    setGachaCollection((prev) => {
      const match = prev.find((item) => item.id === id);
      if (!match) return prev;
      if (match.count > 1) {
        return prev.map((item) =>
          item.id === id ? { ...item, count: item.count - 1 } : item
        );
      } else {
        return prev.filter((item) => item.id !== id);
      }
    });

    showAlert(`Released to wild! Refunded +${refund} Poké-Coins!`, "success");
  };

  const filteredCollection = gachaCollection.filter((item) => {
    if (activeCategoryFilter === "all") return true;
    return item.rarity?.toLowerCase() === activeCategoryFilter;
  });

  return (
    <div className="gacha-container select-none">
      {gachaAlert && (
        <div style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: gachaAlert.type === "error" ? "#fee2e2" : "#d1fae5",
          color: gachaAlert.type === "error" ? "#991b1b" : "#065f46",
          padding: "10px 20px",
          borderRadius: "30px",
          fontWeight: "bold",
          fontSize: "13px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
        }}>
          {gachaAlert.message}
        </div>
      )}

      {/* Simplified Header */}
      <div className="gacha-simple-header">
        <div className="gacha-title-section">
          <h2>Poké Gacha</h2>
          <p>Spin & collect companions</p>
        </div>
        
        <div className="gacha-right-pill">
          <div className="coin-box">
            <span>🪙</span>
            <span>{coins}</span>
          </div>

          <button onClick={claimFreeCoins} className="claim-btn">
            +500 Coins
          </button>
        </div>
      </div>

      <div className="gacha-main-grid">
        {/* Left Side: Spin Mech */}
        <div className="gacha-spin-panel">
          <div className="gacha-visual-box">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/5/53/Pok%C3%A9_Ball_icon.svg" 
              alt="gacha-ball" 
              className={`gacha-visual-ball ${rolling ? "spinning" : ""}`}
            />
          </div>

          <div className="spin-options-row">
            <button
              onClick={() => executeRoll(1)}
              disabled={rolling}
              className="spin-action-btn single"
            >
              {rolling ? "Rolling..." : "1x Pull (100)"}
            </button>

            <button
              onClick={() => executeRoll(10)}
              disabled={rolling}
              className="spin-action-btn multi"
            >
              {rolling ? "Rolling..." : "10x Pull (900)"}
            </button>
          </div>

          {/* Compact Rates */}
          <div className="rate-compact-list">
            <div className="rate-compact-item legendary">
              <span>Legendary</span>
              <span>5%</span>
            </div>
            <div className="rate-compact-item epic">
              <span>Epic</span>
              <span>15%</span>
            </div>
            <div className="rate-compact-item rare">
              <span>Rare</span>
              <span>30%</span>
            </div>
            <div className="rate-compact-item">
              <span>Common</span>
              <span>50%</span>
            </div>
          </div>
        </div>

        {/* Right Side: Results or Collection Deck */}
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
                  <span className="loading" style={{ margin: 0, color: "white" }}>Loading...</span>
                </div>
              ) : (
                <div className="result-card-grid">
                  {currentRollResults.map((p, idx) => (
                    <div 
                      key={idx} 
                      className="result-pocket-card"
                      onClick={() => triggerSound(p.cry)}
                    >
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
                  My Collection ({gachaCollection.length})
                </h3>
                
                <div className="notebook-inner-tabs">
                  {["all", "legendary", "epic", "rare", "common"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setActiveCategoryFilter(c)}
                      className={`notebook-tab-btn ${activeCategoryFilter === c ? "active" : ""}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCollection.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                  <p style={{ margin: 0, fontSize: "13px" }}>Empty list. Pull some cards!</p>
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
                        <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "capitalize", color: "#334155" }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: "9px", fontWeight: "bold", color: p.rarityColor, textTransform: "uppercase" }}>
                          {p.rarity}
                        </span>
                      </div>

                      <button 
                        onClick={() => handleRelease(p.id, p.rarity)}
                        className="release-btn"
                      >
                        Release (+{p.rarity === "Legendary" ? 500 : p.rarity === "Epic" ? 200 : p.rarity === "Rare" ? 100 : 50})
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

function App() {
  const [trainerName, setTrainerName] = useState(() => {
    try {
      return localStorage.getItem("trainer_name") || "";
    } catch {
      return "";
    }
  });

  const [trainerAvatar, setTrainerAvatar] = useState(() => {
    try {
      return localStorage.getItem("trainer_avatar") || "⚡";
    } catch {
      return "⚡";
    }
  });

  const [gachaCollection, setGachaCollection] = useState(() => {
    try {
      const saved = localStorage.getItem("gacha_collection");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("gacha_collection", JSON.stringify(gachaCollection));
    } catch (e) {
      console.error(e);
    }
  }, [gachaCollection]);

  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      return saved ? saved === "dark" : false;
    } catch {
      return false;
    }
  });

  const [allPokemons, setAllPokemons] = useState([]);

  useEffect(() => {
    try {
      localStorage.setItem("theme", darkMode ? "dark" : "light");
      if (darkMode) {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
      }
    } catch (e) {
      console.error(e);
    }
  }, [darkMode]);
  const [pokemonCache, setPokemonCache] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showGacha, setShowGacha] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showTrainerCard, setShowTrainerCard] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [typePokemons, setTypePokemons] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [detailPokemon, setDetailPokemon] = useState(null);
  const [pokemonOfTheDay, setPokemonOfTheDay] = useState(null);
  
  // Interactive 3D Card Tilt State for POTD
  const [potdTilt, setPotdTilt] = useState({ x: 0, y: 0, active: false, sheenX: 50, sheenY: 50 });

  const handlePotdMouseMove = (e) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const normX = x / rect.width - 0.5;
    const normY = y / rect.height - 0.5;
    
    const maxTiltX = 10; // degrees
    const maxTiltY = 10; // degrees
    
    setPotdTilt({
      x: -normY * maxTiltX,
      y: normX * maxTiltY,
      active: true,
      sheenX: (x / rect.width) * 100,
      sheenY: (y / rect.height) * 100
    });
  };

  const handlePotdMouseLeave = () => {
    setPotdTilt({ x: 0, y: 0, active: false, sheenX: 50, sheenY: 50 });
  };
  
  // Choose random Pokemon of the Day on first entry
  useEffect(() => {
    if (allPokemons.length > 0 && !pokemonOfTheDay) {
      try {
        const cachedPotd = sessionStorage.getItem("zahadex_potd_name");
        let potdName = "";
        if (cachedPotd) {
          potdName = cachedPotd;
        } else {
          const randomIndex = Math.floor(Math.random() * allPokemons.length);
          const selected = allPokemons[randomIndex];
          if (selected) {
            potdName = selected.name;
            sessionStorage.setItem("zahadex_potd_name", potdName);
          }
        }
        
        if (potdName) {
          fetch(`https://pokeapi.co/api/v2/pokemon/${potdName}`)
            .then((r) => {
              if (!r.ok) throw new Error("Network error");
              return r.json();
            })
            .then((data) => {
              setPokemonOfTheDay(data);
            })
            .catch((e) => console.error("Error fetching POTD details", e));
        }
      } catch (err) {
        console.error("POTD storage or execution error", err);
      }
    }
  }, [allPokemons, pokemonOfTheDay]);
  
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      const saved = localStorage.getItem("favoriteIds");
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });
  const [favoritePokemons, setFavoritePokemons] = useState([]);

  useEffect(() => {
    fetch("https://pokeapi.co/api/v2/pokemon?limit=1025")
      .then((res) => res.json())
      .then((data) => {
        setAllPokemons(data.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("favoriteIds", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    if (favoriteIds.length === 0) {
      setFavoritePokemons([]);
      return;
    }
    Promise.all(
      favoriteIds.map((id) =>
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
          .then((r) => r.json())
          .catch(() => null)
      )
    ).then((details) => {
      setFavoritePokemons(details.filter((d) => d !== null));
    });
  }, [favoriteIds]);

  useEffect(() => {
    if (selectedType === "all") {
      setTypePokemons(null);
      return;
    }
    setSearchLoading(true);
    fetch(`https://pokeapi.co/api/v2/type/${selectedType}`)
      .then((res) => res.json())
      .then((data) => {
        const names = new Set((data.pokemon || []).map((p) => p.pokemon?.name));
        setTypePokemons(names);
        setSearchLoading(false);
      })
      .catch(() => setSearchLoading(false));
  }, [selectedType]);

  const filteredBase = useMemo(() => {
    return allPokemons.filter((p) => {
      const parts = p.url.split("/").filter(Boolean);
      const id = parseInt(parts[parts.length - 1], 10);
      if (selectedRegion !== "all") {
        const region = REGIONS.find((r) => r.key === selectedRegion);
        if (region && (id < (region.idStart ?? 1) || id > (region.idEnd ?? 1025))) return false;
      }
      if (selectedType !== "all" && typePokemons) {
        if (!typePokemons.has(p.name)) return false;
      }
      if (search.trim() !== "") {
        if (!p.name.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [allPokemons, selectedRegion, selectedType, typePokemons, search]);

  const visibleBaseSlice = useMemo(() => {
    return filteredBase.slice(0, offset + LIMIT);
  }, [filteredBase, offset]);

  useEffect(() => {
    if (visibleBaseSlice.length === 0) return;
    const needed = visibleBaseSlice.filter((p) => !pokemonCache[p.name]);
    if (needed.length === 0) return;
    setSearchLoading(true);
    Promise.all(
      needed.map((p) => fetch(p.url).then((r) => r.json()).catch(() => null))
    ).then((results) => {
      setPokemonCache((prev) => {
        const next = { ...prev };
        results.forEach((d) => {
          if (d?.name) next[d.name] = d;
        });
        return next;
      });
      setSearchLoading(false);
    }).catch(() => setSearchLoading(false));
  }, [visibleBaseSlice, pokemonCache]);

  const toggleFavorite = (pokemon) => {
    const isAlreadyFav = favoriteIds.includes(pokemon.id);
    if (isAlreadyFav) {
      setFavoriteIds((prev) => prev.filter((id) => id !== pokemon.id));
      setFavoritePokemons((prev) => prev.filter((p) => p.id !== pokemon.id));
    } else {
      setFavoriteIds((prev) => [...prev, pokemon.id]);
      setFavoritePokemons((prev) => [...prev, pokemon]);
    }
  };

  const isFavorite = (id) => favoriteIds.includes(id);

  const goHome = (e) => {
    e.preventDefault();
    setShowFavorites(false);
    setShowGacha(false);
    setShowCompare(false);
    setShowQuiz(false);
    setSearch("");
    setSelectedRegion("all");
    setSelectedType("all");
    setOffset(0);
    setSelectedPokemon(null);
  };

  const goFavorit = (e) => {
    e.preventDefault();
    setShowFavorites(true);
    setShowGacha(false);
    setShowCompare(false);
    setShowQuiz(false);
    setSearch("");
    setSelectedRegion("all");
    setSelectedType("all");
    setOffset(0);
    setSelectedPokemon(null);
  };

  const goGacha = (e) => {
    e.preventDefault();
    setShowFavorites(false);
    setShowGacha(true);
    setShowCompare(false);
    setShowQuiz(false);
    setSearch("");
    setSelectedRegion("all");
    setSelectedType("all");
    setOffset(0);
    setSelectedPokemon(null);
  };

  const goCompare = (e) => {
    e.preventDefault();
    setShowFavorites(false);
    setShowGacha(false);
    setShowCompare(true);
    setShowQuiz(false);
    setSearch("");
    setSelectedRegion("all");
    setSelectedType("all");
    setOffset(0);
    setSelectedPokemon(null);
  };

  const goQuiz = (e) => {
    e.preventDefault();
    setShowFavorites(false);
    setShowGacha(false);
    setShowCompare(false);
    setShowQuiz(true);
    setSearch("");
    setSelectedRegion("all");
    setSelectedType("all");
    setOffset(0);
    setSelectedPokemon(null);
  };

  const hasMore = offset + LIMIT < filteredBase.length;

  const displayed = showFavorites
    ? favoritePokemons
    : visibleBaseSlice.map((p) => pokemonCache[p.name]).filter(Boolean);

  const firstType = (pokemon) => pokemon.types?.[0]?.type?.name || "normal";

  if (detailPokemon) {
    return (
      <div className="app">
        <DetailPage
          pokemon={detailPokemon}
          onBack={() => setDetailPokemon(null)}
          onSelectPokemon={(nameOrId) => {
            fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`)
              .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch Pokémon");
                return res.json();
              })
              .then((data) => {
                setDetailPokemon(data);
              })
              .catch((err) => console.error(err));
          }}
        />
      </div>
    );
  }

  const gachaCount = gachaCollection.length;
  const totalPower = favoriteIds.length * 3 + gachaCount * 2;
  
  let trainerRank = "Apprentice";
  let trainerBadgeColor = "#94a3b8";
  let trainerIcon = "⭐";
  if (totalPower >= 25) {
    trainerRank = "Master";
    trainerBadgeColor = "#a855f7";
    trainerIcon = "👑";
  } else if (totalPower >= 12) {
    trainerRank = "Champion";
    trainerBadgeColor = "#f59e0b";
    trainerIcon = "🛡️";
  } else if (totalPower >= 5) {
    trainerRank = "Elite";
    trainerBadgeColor = "#3b82f6";
    trainerIcon = "⚡";
  } else if (totalPower >= 1) {
    trainerRank = "Ranger";
    trainerBadgeColor = "#10b981";
    trainerIcon = "🌿";
  }

  if (!trainerName) {
    return (
      <Login
        onLogin={(name, avatar) => {
          try {
            localStorage.setItem("trainer_name", name);
            localStorage.setItem("trainer_avatar", avatar);
          } catch (e) {
            console.error(e);
          }
          setTrainerName(name);
          setTrainerAvatar(avatar);
        }}
      />
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-logo" onClick={goHome} style={{ cursor: "pointer" }}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/53/Pok%C3%A9_Ball_icon.svg"
            alt="pokeball"
          />
          <span>Zahadex</span>
        </div>
        <div className="navbar-right">
          <div className="navbar-links">
            <a href="#" className={!showFavorites && !showGacha && !showCompare && !showQuiz ? "nav-item active" : "nav-item"} onClick={goHome}>
              <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Home</span>
            </a>
            <a href="#" className={showCompare ? "nav-item active" : "nav-item"} onClick={goCompare}>
              <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Compare Mode</span>
            </a>
            <a href="#" className={showQuiz ? "nav-item active" : "nav-item"} onClick={goQuiz}>
              <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Quiz Mode</span>
            </a>
            <a href="#" className={showFavorites ? "nav-item active" : "nav-item"} onClick={goFavorit}>
              <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              <span>Favorites {favoriteIds.length > 0 && `(${favoriteIds.length})`}</span>
            </a>
            <button className="theme-toggle-btn" onClick={() => setDarkMode(!darkMode)} title="Toggle Theme">
              {darkMode ? (
                <svg className="theme-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg className="theme-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span>{darkMode ? "Light" : "Dark"}</span>
            </button>
          </div>
          <div className="trainer-status-container">
            <button 
              className="trainer-badge-btn" 
              onClick={() => setShowTrainerCard(!showTrainerCard)}
              title="View Trainer Profile Card"
            >
              <span className="radar-scanner-dot">
                <span className="radar-pulse"></span>
              </span>
              <span>{trainerAvatar} {trainerName || "Trainer"}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showTrainerCard ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showTrainerCard && (
              <div className="trainer-dropdown-card">
                <div className="trainer-dropdown-header">
                  <div className="trainer-avatar-glow" style={{ fontSize: "1.6rem" }}>
                    <span>{trainerAvatar}</span>
                  </div>
                  <div className="trainer-header-text">
                    <h4 style={{ textTransform: "capitalize" }}>{trainerName || "Zahadex Trainer"}</h4>
                    <span className="rank-name" style={{ color: trainerBadgeColor }}>{trainerIcon} Rank: {trainerRank}</span>
                  </div>
                </div>
                
                <div className="trainer-dropdown-stats">
                  <div className="mini-stat-item">
                    <span className="stat-name">🌟 Dex Power</span>
                    <span className="stat-value-text">{totalPower} pts</span>
                  </div>
                  <div className="mini-stat-item">
                    <span className="stat-name">❤️ Favorites</span>
                    <span className="stat-value-text">{favoriteIds.length} pkmn</span>
                  </div>
                  <div className="mini-stat-item">
                    <span className="stat-name">🎰 Gacha Cards</span>
                    <span className="stat-value-text">{gachaCount} caught</span>
                  </div>
                  <div className="mini-stat-item">
                    <span className="stat-name">🌐 Poke Database</span>
                    <span className="stat-value-text" style={{ color: "#22c55e", fontWeight: "800" }}>ONLINE</span>
                  </div>
                </div>

                <div className="trainer-dropdown-footer" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <p>Catch more Pokémon of the Day & Favorite them to boost your Rank Power level!</p>
                  <button 
                    onClick={() => {
                      try {
                        localStorage.removeItem("trainer_name");
                      } catch {}
                      setTrainerName("");
                      setShowTrainerCard(false);
                    }}
                    style={{
                      marginTop: "6px",
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: "0",
                      width: "fit-content",
                      textTransform: "uppercase"
                    }}
                  >
                    🔄 Change Trainer Name
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showGacha ? (
        <GachaGame
          allPokemons={allPokemons}
          gachaCollection={gachaCollection}
          setGachaCollection={setGachaCollection}
          onSelectPokemon={(nameOrId) => {
            fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`)
              .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch Pokémon");
                return res.json();
              })
              .then((data) => {
                setDetailPokemon(data);
              })
              .catch((err) => console.error(err));
          }}
        />
      ) : showCompare ? (
        <Compare
          allPokemons={allPokemons}
          onBack={() => setShowCompare(false)}
          pokemonCache={pokemonCache}
          onSelectPokemon={(nameOrId) => {
            fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`)
              .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch Pokémon");
                return res.json();
              })
              .then((data) => {
                setDetailPokemon(data);
              })
              .catch((err) => console.error(err));
          }}
        />
      ) : showQuiz ? (
        <Quiz
          allPokemons={allPokemons}
          onBack={() => setShowQuiz(false)}
        />
      ) : (
        <>
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
                  <select
                    className="filter-select"
                    value={selectedRegion}
                    onChange={(e) => { setSelectedRegion(e.target.value); setOffset(0); }}
                  >
                    {REGIONS.map((r) => (
                      <option key={r.key} value={r.key}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-select-wrapper">
                  <svg className="filter-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <select
                    className="filter-select"
                    value={selectedType}
                    onChange={(e) => { setSelectedType(e.target.value); setOffset(0); }}
                  >
                    {TYPES.map((t) => (
                      <option key={t.key} value={t.key}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {!showFavorites && !showGacha && pokemonOfTheDay && (
            <div className={`potd-container potd-type-${pokemonOfTheDay.types?.[0]?.type?.name || "normal"}`} id="potd-container">
              <div className="potd-label-pill">
                <span className="potd-star">✨</span>
                <span>Pokémon of the Day</span>
                <span className="potd-star">✨</span>
              </div>
              
              <div className="potd-grid" style={{ transformStyle: "preserve-3d" }}>
                <div 
                  className={`potd-image-col potd-image-${pokemonOfTheDay.types?.[0]?.type?.name || "normal"}`}
                  onMouseMove={handlePotdMouseMove}
                  onMouseLeave={handlePotdMouseLeave}
                  style={{
                    transform: potdTilt.active 
                      ? `perspective(1000px) rotateX(${potdTilt.x}deg) rotateY(${potdTilt.y}deg) scale(1.05)`
                      : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
                    transition: potdTilt.active ? "transform 0.08s ease-out" : "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
                    transformStyle: "preserve-3d",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {/* Dynamic shining holographic sheen reflective overlay */}
                  <div 
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: potdTilt.active 
                        ? `radial-gradient(circle at ${potdTilt.sheenX}% ${potdTilt.sheenY}%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 65%)`
                        : "none",
                      pointerEvents: "none",
                      zIndex: 4,
                      opacity: potdTilt.active ? 1 : 0,
                      transition: "opacity 0.2s ease",
                      borderRadius: "inherit"
                    }}
                  />

                  <div className="potd-image-bg-glow"></div>
                  
                  {/* Neon 3D Stage / Podium */}
                  <div className="potd-3d-stage">
                    <div className="potd-stage-floor"></div>
                    <div className="potd-stage-ring-1"></div>
                    <div className="potd-stage-ring-2"></div>
                    <div className="potd-stage-light-beam"></div>
                  </div>
                  
                  {/* Dynamic shadow that responds to 3D float */}
                  <div className="potd-sprite-shadow-3d"></div>

                  <img
                    className="potd-sprite"
                    src={
                      pokemonOfTheDay.sprites?.other?.["official-artwork"]?.front_default ||
                      pokemonOfTheDay.sprites?.front_default ||
                      ""
                    }
                    alt={pokemonOfTheDay.name}
                    style={{
                      transform: potdTilt.active 
                        ? `translateZ(50px) rotateY(${potdTilt.y * 0.8}deg) rotateX(${potdTilt.x * 0.8}deg)`
                        : "translateZ(30px)",
                      transition: potdTilt.active ? "transform 0.08s ease-out" : "transform 0.5s ease",
                      filter: "drop-shadow(0 15px 25px rgba(0, 0, 0, 0.22))"
                    }}
                  />
                </div>
                
                <div className="potd-info-col">
                  <div className="potd-meta">
                    <span className="potd-number">#{pokemonOfTheDay.id.toString().padStart(3, "0")}</span>
                    <h2 className="potd-title-name">{pokemonOfTheDay.name}</h2>
                  </div>
                  
                  <div className="potd-tags-row">
                    {pokemonOfTheDay.types?.map((t) => (
                      <span key={t.type.name} className={`type type-badge-potd ${t.type.name}`}>
                        {t.type.name}
                      </span>
                    ))}
                  </div>
                  
                  <p className="potd-description-quote">
                    Meet today's special selection, <strong style={{ textTransform: "capitalize" }}>{pokemonOfTheDay.name}</strong>! An outstanding companion with a height of <strong>{(pokemonOfTheDay.height / 10).toFixed(1)}m</strong> and a weight of <strong>{(pokemonOfTheDay.weight / 10).toFixed(1)}kg</strong>.
                  </p>
                  
                  <div className="potd-quick-metrics">
                    <div className="potd-metric-box">
                      <span className="metric-num">{pokemonOfTheDay.stats?.reduce((sum, s) => sum + s.base_stat, 0)}</span>
                      <span className="metric-lbl">Total Stats</span>
                    </div>
                    <div className="potd-metric-box">
                      <span className="metric-num">{pokemonOfTheDay.abilities?.length || 0}</span>
                      <span className="metric-lbl">Abilities</span>
                    </div>
                    <div className="potd-metric-box animate-pulse">
                      <span className="metric-num">★</span>
                      <span className="metric-lbl">Featured</span>
                    </div>
                  </div>
                  
                  <div className="potd-actions-row">
                    <button
                      className="potd-btn-main primary-action"
                      onClick={() => setDetailPokemon(pokemonOfTheDay)}
                    >
                      <svg viewBox="0 0 100 100" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="10" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }}>
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" />
                        <line x1="8" y1="50" x2="92" y2="50" stroke="currentColor" strokeWidth="10" />
                        <circle cx="50" cy="50" r="18" fill="white" stroke="currentColor" strokeWidth="10" />
                        <circle cx="50" cy="50" r="6" fill="currentColor" />
                      </svg>
                      Open Full Info & Evolution Stats
                    </button>
                    
                    {pokemonOfTheDay.cries?.latest && (
                      <button
                        className="potd-btn-main text-action"
                        onClick={() => {
                          const audio = new Audio(pokemonOfTheDay.cries?.latest || "");
                          audio.volume = 0.35;
                          audio.play().catch(() => {});
                        }}
                      >
                        🔊 Play Cry
                      </button>
                    )}
                    
                    <button
                      className={`potd-btn-main fav-action-potd ${isFavorite(pokemonOfTheDay.id) ? "liked" : ""}`}
                      onClick={() => toggleFavorite(pokemonOfTheDay)}
                    >
                      {isFavorite(pokemonOfTheDay.id) ? "❤️ Saved" : "🤍 Favorite"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showFavorites && (
            <h2 className="fav-title">
              Favorite Pokémon {favoriteIds.length === 0 && "(empty)"}
            </h2>
          )}

          {loading ? (
            <p className="loading">Loading...</p>
          ) : (
            <div>
              {displayed.length === 0 && !loading && (
                <div className="empty-state">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/5/53/Pok%C3%A9_Ball_icon.svg"
                    alt="empty"
                    className="empty-image"
                  />
                  <h3>Pokémon Not Found</h3>
                  <p>Try a different name, region, or type.</p>
                  <button className="reset-btn" onClick={() => {
                    setSearch("");
                    setSelectedRegion("all");
                    setSelectedType("all");
                    setOffset(0);
                  }}>
                    Reset
                  </button>
                </div>
              )}

              <div className="grid">
                {displayed.map((pokemon) => (
                  <div
                    className={`card card-${firstType(pokemon)}`}
                    key={pokemon.id}
                    onClick={() => setSelectedPokemon(pokemon)}
                  >
                    <button
                      className={`fav-btn ${isFavorite(pokemon.id) ? "fav-active" : ""}`}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(pokemon); }}
                    >
                      {isFavorite(pokemon.id) ? "❤️" : "🤍"}
                    </button>

                    <img
                      src={
                        pokemon.sprites?.other?.["official-artwork"]?.front_default ||
                        pokemon.sprites?.front_default ||
                        ""
                      }
                      alt={pokemon.name}
                    />
                    <p className="poke-id">#{pokemon.id}</p>
                    <p className="poke-name">{pokemon.name}</p>
                    <div className="types">
                      {pokemon.types?.map((t) => (
                        <span key={t.type.name} className={`type ${t.type.name}`}>
                          {t.type.name}
                        </span>
                      ))}
                    </div>

                    <button
                      className="card-full-info-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailPokemon(pokemon);
                      }}
                      aria-label="View Details and Evolution"
                    >
                      <svg viewBox="0 0 100 100" width="12" height="12" style={{ fill: "currentColor", marginRight: "5px", display: "inline-block" }}>
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="12" />
                        <line x1="8" y1="50" x2="92" y2="50" stroke="currentColor" strokeWidth="12" />
                        <circle cx="50" cy="50" r="18" fill="white" stroke="currentColor" strokeWidth="12" />
                        <circle cx="50" cy="50" r="6" fill="currentColor" />
                      </svg>
                      <span>Stats & Evolution</span>
                    </button>
                  </div>
                ))}
              </div>

              {searchLoading && <p className="loading">Loading...</p>}

              {hasMore && !showFavorites && (
                <button
                  className="load-more"
                  onClick={() => setOffset((prev) => prev + LIMIT)}
                  disabled={searchLoading}
                >
                  {searchLoading ? "Loading..." : "Load More"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {selectedPokemon && (
        <div className="modal-overlay" onClick={() => setSelectedPokemon(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedPokemon(null)}>×</button>

            <div className={`modal-header type-${firstType(selectedPokemon)}`}>
              <div className="header-blob"></div>
              <img
                className="modal-artwork"
                src={
                  selectedPokemon.sprites?.other?.["official-artwork"]?.front_default ||
                  selectedPokemon.sprites?.front_default ||
                  ""
                }
                alt={selectedPokemon.name}
              />
              <div className="modal-title-wrap">
                <span className="modal-id">#{selectedPokemon.id}</span>
                <h2 className="modal-name">{selectedPokemon.name}</h2>
                <div className="modal-types">
                  {selectedPokemon.types?.map((t) => (
                    <span key={t.type.name} className={`type ${t.type.name}`}>
                      {t.type.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-body">
              {selectedPokemon.cries?.latest && (
                <button
                  className="cry-btn"
                  onClick={() => {
                    const audio = new Audio(selectedPokemon.cries?.latest || "");
                    audio.volume = 0.35;
                    audio.play().catch(() => {});
                  }}
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

      {/* Floating HD Pokéball Gacha Button */}
      <div className="gacha-fab-wrapper">
        <div className="gacha-fab-tooltip">
          {showGacha ? "Close Gacha" : "Play Gacha!"}
        </div>
        
        <button
          onClick={() => {
            setShowGacha(!showGacha);
            setShowFavorites(false);
          }}
          className={`gacha-fab-btn ${showGacha ? "active" : ""}`}
          title={showGacha ? "Close Gacha" : "Play Gacha!"}
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
