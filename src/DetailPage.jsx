import { useState, useEffect } from "react";
import "./DetailPage.css";

// Helper to clean up form feed, newline, carriage return, and double spaces in PokeAPI text
const cleanText = (text) => {
  if (!text) return "";
  return text
    .replace(/\f/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const getTriggerDescription = (details) => {
  if (!details || details.length === 0) return "";
  const detail = details[0];
  let parts = [];
  
  if (detail.trigger?.name === "level-up") {
    if (detail.min_level !== undefined && detail.min_level !== null) {
      parts.push(`Lvl ${detail.min_level}`);
    } else {
      parts.push("Level Up");
    }
  } else if (detail.trigger?.name === "use-item") {
    if (detail.item) {
      parts.push(`Use ${detail.item.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`);
    } else {
      parts.push("Use Item");
    }
  } else if (detail.trigger?.name === "trade") {
    if (detail.held_item) {
      parts.push(`Trade holding ${detail.held_item.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`);
    } else {
      parts.push("Trade");
    }
  } else if (detail.trigger?.name) {
    parts.push(detail.trigger.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
  }

  if (detail.min_happiness) {
    parts.push(`Happiness ${detail.min_happiness}`);
  }
  if (detail.time_of_day) {
    parts.push(`at ${detail.time_of_day.charAt(0).toUpperCase() + detail.time_of_day.slice(1)}`);
  }
  if (detail.known_move) {
    parts.push(`knows ${detail.known_move.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`);
  }
  if (detail.location) {
    parts.push(`at ${detail.location.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`);
  }
  if (detail.min_affection) {
    parts.push(`Affection ${detail.min_affection}`);
  }
  if (detail.min_beauty) {
    parts.push(`Beauty ${detail.min_beauty}`);
  }

  return parts.join(" - ");
};

const ALL_TYPES = [
  "normal", "fire", "water", "grass", "electric", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy"
];

const TYPE_DEFENSES = {
  normal: {
    weak: ["fighting"],
    resist: [],
    immune: ["ghost"]
  },
  fire: {
    weak: ["water", "ground", "rock"],
    resist: ["fire", "grass", "ice", "bug", "steel", "fairy"],
    immune: []
  },
  water: {
    weak: ["grass", "electric"],
    resist: ["fire", "water", "ice", "steel"],
    immune: []
  },
  grass: {
    weak: ["fire", "ice", "poison", "flying", "bug"],
    resist: ["water", "grass", "electric", "ground"],
    immune: []
  },
  electric: {
    weak: ["ground"],
    resist: ["electric", "flying", "steel"],
    immune: []
  },
  ice: {
    weak: ["fire", "fighting", "rock", "steel"],
    resist: ["ice"],
    immune: []
  },
  fighting: {
    weak: ["flying", "psychic", "fairy"],
    resist: ["bug", "rock", "dark"],
    immune: []
  },
  poison: {
    weak: ["ground", "psychic"],
    resist: ["grass", "fighting", "poison", "bug", "fairy"],
    immune: []
  },
  ground: {
    weak: ["water", "grass", "ice"],
    resist: ["poison", "rock"],
    immune: ["electric"]
  },
  flying: {
    weak: ["electric", "ice", "rock"],
    resist: ["grass", "fighting", "bug"],
    immune: ["ground"]
  },
  psychic: {
    weak: ["bug", "ghost", "dark"],
    resist: ["fighting", "psychic"],
    immune: []
  },
  bug: {
    weak: ["fire", "flying", "rock"],
    resist: ["grass", "fighting", "ground"],
    immune: []
  },
  rock: {
    weak: ["water", "grass", "fighting", "ground", "steel"],
    resist: ["normal", "fire", "poison", "flying"],
    immune: []
  },
  ghost: {
    weak: ["ghost", "dark"],
    resist: ["poison", "bug"],
    immune: ["normal", "fighting"]
  },
  dragon: {
    weak: ["ice", "dragon", "fairy"],
    resist: ["fire", "water", "grass", "electric"],
    immune: []
  },
  dark: {
    weak: ["fighting", "bug", "fairy"],
    resist: ["ghost", "dark"],
    immune: ["psychic"]
  },
  steel: {
    weak: ["fire", "fighting", "ground"],
    resist: ["normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel", "fairy"],
    immune: ["poison"]
  },
  fairy: {
    weak: ["poison", "steel"],
    resist: ["fighting", "bug", "dark"],
    immune: ["dragon"]
  }
};

const getElementCounterInfo = (types) => {
  if (!types || types.length === 0) return null;

  const multipliers = {};
  ALL_TYPES.forEach((t) => {
    multipliers[t] = 1.0;
  });

  types.forEach((typeObj) => {
    const typeName = typeObj.type?.name?.toLowerCase();
    const defense = TYPE_DEFENSES[typeName];
    if (defense) {
      defense.weak.forEach((w) => {
        multipliers[w] *= 2.0;
      });
      defense.resist.forEach((r) => {
        multipliers[r] *= 0.5;
      });
      defense.immune.forEach((i) => {
        multipliers[i] *= 0.0;
      });
    }
  });

  const grouped = {
    superWeak: [],
    weak: [],
    resist: [],
    superResist: [],
    immune: []
  };

  Object.entries(multipliers).forEach(([type, value]) => {
    if (value === 4.0) {
      grouped.superWeak.push(type);
    } else if (value === 2.0) {
      grouped.weak.push(type);
    } else if (value === 0.5) {
      grouped.resist.push(type);
    } else if (value === 0.25) {
      grouped.superResist.push(type);
    } else if (value === 0.0) {
      grouped.immune.push(type);
    }
  });

  return grouped;
};

export default function DetailPage({ pokemon, onBack, onSelectPokemon }) {
  if (!pokemon) return null;

  const [speciesData, setSpeciesData] = useState(null);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [evolutionChain, setEvolutionChain] = useState([]);
  const [loadingEvolution, setLoadingEvolution] = useState(true);
  
  const [typeCompanions, setTypeCompanions] = useState([]);
  const [loadingRelations, setLoadingRelations] = useState(true);

  // Scroll to top of detail page when pokemon.id changes
  useEffect(() => {
    const el = document.getElementById("detail-page");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pokemon.id]);

  const firstType = pokemon.types?.[0]?.type?.name || "normal";

  // Fetch elemental type companions when firstType changes
  useEffect(() => {
    let active = true;
    setLoadingRelations(true);
    
    fetch(`https://pokeapi.co/api/v2/type/${firstType}`)
      .then((r) => r.json())
      .then((data) => {
        const allOfType = data.pokemon || [];
        const filtered = allOfType
          .map((p) => {
            const urlParts = p.pokemon.url.split("/").filter(Boolean);
            const pId = parseInt(urlParts[urlParts.length - 1], 10);
            return { id: pId, name: p.pokemon.name };
          })
          .filter((item) => item.id !== pokemon.id && item.id <= 1025);
        
        let selected = [];
        if (filtered.length > 0) {
          // Select up to 4 companions offset dynamically by pokemon ID so different pokemon get different recommendations
          const shift = pokemon.id % filtered.length;
          for (let i = 0; i < Math.min(4, filtered.length); i++) {
            selected.push(filtered[(shift + i) % filtered.length]);
          }
        }
        
        if (active) {
          setTypeCompanions(selected);
          setLoadingRelations(false);
        }
      })
      .catch(() => {
        if (active) setLoadingRelations(false);
      });

    return () => {
      active = false;
    };
  }, [pokemon.id, firstType]);

  useEffect(() => {
    let active = true;
    setLoadingSpecies(true);
    
    // Fetch species data from PokeAPI
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch species details");
        return res.json();
      })
      .then((data) => {
        if (active) {
          setSpeciesData(data);
          setLoadingSpecies(false);
        }
      })
      .catch((err) => {
        console.error("Species fetch error:", err);
        if (active) {
          setLoadingSpecies(false);
        }
      });

    return () => {
      active = false;
    };
  }, [pokemon.id]);

  useEffect(() => {
    if (!speciesData?.evolution_chain?.url) return;
    
    let active = true;
    setLoadingEvolution(true);
    
    fetch(speciesData.evolution_chain.url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch evolution chain");
        return res.json();
      })
      .then((data) => {
        if (active) {
          let columns = [[], [], []];
          
          function traverse(node, depth = 0) {
            if (!node) return;
            const urlParts = node.species.url.split("/").filter(Boolean);
            const idValue = parseInt(urlParts[urlParts.length - 1], 10);
            const triggerDesc = getTriggerDescription(node.evolution_details);
            
            const pokemonObj = {
              name: node.species.name,
              id: idValue,
              trigger: triggerDesc,
            };
            
            if (depth < 3) {
              if (!columns[depth].some(p => p.id === idValue)) {
                columns[depth].push(pokemonObj);
              }
            }
            
            if (node.evolves_to) {
              node.evolves_to.forEach(child => traverse(child, depth + 1));
            }
          }
          
          traverse(data.chain, 0);
          
          const cleanedColumns = columns.filter(col => col.length > 0);
          setEvolutionChain(cleanedColumns);
          setLoadingEvolution(false);
        }
      })
      .catch((err) => {
        console.error("Evolution fetch error:", err);
        if (active) {
          setLoadingEvolution(false);
        }
      });
      
    return () => {
      active = false;
    };
  }, [speciesData]);

  const counters = getElementCounterInfo(pokemon.types);

  // Build Description text
  const indonesianFlavor = speciesData?.flavor_text_entries?.find(
    (entry) => entry.language.name === "id"
  );
  const englishEntries = speciesData?.flavor_text_entries?.filter(
    (entry) => entry.language.name === "en"
  ) || [];
  
  const mainDesc = cleanText(
    (englishEntries.length > 0 ? englishEntries[0].flavor_text : "") ||
    indonesianFlavor?.flavor_text ||
    "Species description information is not available for this Pokémon."
  );

  // Build alternative fact story (Fakta Menarik)
  const alternativeEntry = englishEntries.length > 1 ? englishEntries[englishEntries.length - 1] : null;
  const alternativeDesc = alternativeEntry ? cleanText(alternativeEntry.flavor_text) : "";
  const alternativeVersion = alternativeEntry ? alternativeEntry.version.name.replace("-", " ") : "";

  // Genera category
  const genusEn = speciesData?.genera?.find((g) => g.language.name === "en")?.genus || "";
  const genusId = speciesData?.genera?.find((g) => g.language.name === "id")?.genus || "";
  const genus = genusEn || genusId || null;

  // Other species fields
  const habitat = speciesData?.habitat?.name
    ? speciesData.habitat.name.charAt(0).toUpperCase() + speciesData.habitat.name.slice(1)
    : "Unknown/Rare";
  const captureRate = speciesData?.capture_rate ?? null;
  const growthRate = speciesData?.growth_rate?.name
    ? speciesData.growth_rate.name.replace("-", " ")
    : "Unknown";
  const baseHappiness = speciesData?.base_happiness ?? null;
  
  const isLegendary = speciesData?.is_legendary;
  const isMythical = speciesData?.is_mythical;
  const isBaby = speciesData?.is_baby;

  return (
    <div className="detail-page" id="detail-page">
      <div className="detail-navigation" id="detail-navigation">
        <button className="detail-back-btn" id="detail-back-btn" onClick={onBack}>
          <svg className="back-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Pokédex</span>
        </button>
      </div>

      <div className={`detail-card-container type-${firstType}`} id="detail-card-container">
        {/* Decorative elements inside the card */}
        <div className="detail-bg-pattern" id="detail-bg-pattern"></div>
        <div className="detail-light-glow" id="detail-light-glow"></div>

        <div className="detail-header-section" id="detail-header-section">
          <div className="detail-image-wrapper" id="detail-image-wrapper">
            <div className="detail-image-ring" id="detail-image-ring"></div>
            <img
              className="detail-hero-img"
              id="detail-hero-img"
              src={
                pokemon.sprites?.other?.["official-artwork"]?.front_default ||
                pokemon.sprites?.front_default ||
                "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png"
              }
              alt={pokemon.name}
            />
          </div>
          
          <div className="detail-identity" id="detail-identity">
            <span className="detail-hero-id" id="detail-hero-id">#{pokemon.id.toString().padStart(3, '0')}</span>
            <h1 className="detail-hero-name" id="detail-hero-name">
              {pokemon.name}
            </h1>
            <div className="detail-hero-types" id="detail-hero-types">
              {pokemon.types?.map((t) => (
                <span key={t.type.name} className={`type-badge ${t.type.name}`} id={`type-badge-${t.type.name}`}>
                  {t.type.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="detail-content-section" id="detail-content-section">
          {/* Main Grid for Height, Weight & Base Experience */}
          <div className="detail-info-row" id="detail-info-row">
            <div className="detail-info-box" id="detail-info-box-height">
              <div className="detail-info-icon-wrapper height-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="10" rx="2" />
                  <line x1="6" y1="7" x2="6" y2="11" />
                  <line x1="10" y1="7" x2="10" y2="13" />
                  <line x1="14" y1="7" x2="14" y2="11" />
                  <line x1="18" y1="7" x2="18" y2="13" />
                </svg>
              </div>
              <div className="detail-info-text">
                <p className="detail-info-label">Height</p>
                <p className="detail-info-value">{(pokemon.height / 10).toFixed(1)} m</p>
              </div>
            </div>
            <div className="detail-info-box" id="detail-info-box-weight">
              <div className="detail-info-icon-wrapper weight-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m16 16 3-8 3 8c-.87.65-2.24 1-3.5 1s-2.63-.35-3.5-1Z" />
                  <path d="m2 16 3-8 3 8c-.87.65-2.24 1-3.5 1s-2.63-.35-3.5-1Z" />
                  <path d="M7 21h10" />
                  <path d="M12 3v18" />
                  <path d="M3 7h18" />
                </svg>
              </div>
              <div className="detail-info-text">
                <p className="detail-info-label">Weight</p>
                <p className="detail-info-value">{(pokemon.weight / 10).toFixed(1)} kg</p>
              </div>
            </div>
            <div className="detail-info-box" id="detail-info-box-exp">
              <div className="detail-info-icon-wrapper exp-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div className="detail-info-text">
                <p className="detail-info-label">Base Exp</p>
                <p className="detail-info-value">{pokemon.base_experience ?? "-"}</p>
              </div>
            </div>
          </div>

          {/* Description & Fun Facts Row */}
          <div className="detail-about-row" id="detail-about-row">
            <div className="glass-panel about-main-panel" id="about-main-panel">
              <h2 className="detail-section-title">
                <svg className="section-title-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Pokémon Description
              </h2>
              {loadingSpecies ? (
                <div className="panel-loading">
                  <div className="small-spinner"></div>
                  <span>Loading Description...</span>
                </div>
              ) : (
                <div className="about-content">
                  {genus && <span className="genus-tag">{genus}</span>}
                  <p className="description-text">{mainDesc}</p>
                  
                  {/* Status badges */}
                  {(isLegendary || isMythical || isBaby) && (
                    <div className="species-status-badges">
                      {isLegendary && <span className="status-badge legendary-badge">⭐ Legendary</span>}
                      {isMythical && <span className="status-badge mythical-badge">🔮 Mythical</span>}
                      {isBaby && <span className="status-badge baby-badge">👶 Baby Pokémon</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="glass-panel about-facts-panel" id="about-facts-panel">
              <h2 className="detail-section-title">
                <svg className="section-title-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
                Fun Facts
              </h2>
              {loadingSpecies ? (
                <div className="panel-loading">
                  <div className="small-spinner"></div>
                  <span>Loading Fun Facts...</span>
                </div>
              ) : (
                <div className="facts-content">
                  {alternativeDesc && (
                    <div className="alternative-fact-story">
                      <span className="fact-version-label">Information from Pokémon {alternativeVersion}:</span>
                      <p className="fact-speech-bubble">"{alternativeDesc}"</p>
                    </div>
                  )}
                  
                  <div className="facts-grid">
                    <div className="fact-item">
                      <span className="fact-label">Habitat</span>
                      <span className="fact-value">{habitat}</span>
                    </div>
                    {captureRate !== null && (
                      <div className="fact-item">
                        <span className="fact-label">Capture Rate</span>
                        <span className="fact-value">
                          {captureRate} <span className="capture-percentage">({Math.round((captureRate / 255) * 100)}%)</span>
                        </span>
                      </div>
                    )}
                    <div className="fact-item">
                      <span className="fact-label">Growth Rate</span>
                      <span className="fact-value" style={{ textTransform: "capitalize" }}>{growthRate}</span>
                    </div>
                    {baseHappiness !== null && (
                      <div className="fact-item">
                        <span className="fact-label">Base Happiness</span>
                        <span className="fact-value">{baseHappiness}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pokémon Evolution Chain Section */}
          <div className="detail-section glass-panel detail-evolution-section" id="detail-evolution-section">
            <h2 className="detail-section-title">
              <svg className="section-title-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
              Evolution Chain
            </h2>
            {loadingEvolution ? (
              <div className="panel-loading">
                <div className="small-spinner"></div>
                <span>Loading Evolution Chain...</span>
              </div>
            ) : evolutionChain.length <= 1 ? (
              <p className="no-evolutions-text">This Pokémon does not evolve.</p>
            ) : (
              <div className="evolution-chain-container" id="evolution-chain-container">
                <div className="evolution-columns">
                  {evolutionChain.map((column, colIdx) => (
                    <div key={colIdx} className="evolution-column-wrapper">
                      {colIdx > 0 && (
                        <div className="evolution-arrow-container">
                          <svg className="evolution-arrow-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                          {column[0]?.trigger && (
                            <span className="evolution-trigger-badge" title={column[0].trigger}>{column[0].trigger}</span>
                          )}
                        </div>
                      )}
                      
                      <div className="evolution-nodes">
                        {column.map((node) => {
                          const isCurrent = node.id === pokemon.id;
                          return (
                            <div 
                              key={node.id} 
                              className={`evolution-node-card ${isCurrent ? "current-evo-node" : ""}`}
                              onClick={() => {
                                if (!isCurrent && onSelectPokemon) {
                                  onSelectPokemon(node.id);
                                }
                              }}
                              style={{ cursor: isCurrent ? "default" : "pointer" }}
                            >
                              <div className="evo-image-wrapper">
                                <img
                                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${node.id}.png`}
                                  alt={node.name}
                                  className="evo-node-img"
                                  loading="lazy"
                                />
                              </div>
                              <span className="evo-node-id">#{node.id.toString().padStart(3, '0')}</span>
                              <span className="evo-node-name">{node.name}</span>
                              {node.trigger && colIdx > 0 && column.length > 1 && (
                                <span className="evo-node-trigger-desc">{node.trigger}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pokémon Relations Section */}
          {typeCompanions.length > 0 && (
            <div className="detail-section glass-panel detail-relations-section" id="detail-relations-section">
              <h2 className="detail-section-title">
                <svg className="section-title-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Similar Pokémon
              </h2>
              <p className="relations-caption">Other Pokémon sharing the same {firstType.toUpperCase()} type:</p>
              {loadingRelations ? (
                <div className="panel-loading">
                  <div className="small-spinner"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="relations-cards-row" style={{ justifyContent: 'flex-start' }}>
                  {typeCompanions.map((tc) => (
                    <div 
                      key={tc.id} 
                      className="relation-node-card companion-card"
                      onClick={() => onSelectPokemon && onSelectPokemon(tc.id)}
                    >
                      <div className="relation-img-wrapper">
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${tc.id}.png`}
                          alt={tc.name}
                          className="relation-node-img"
                          loading="lazy"
                        />
                      </div>
                      <span className="relation-node-name">{tc.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="detail-grid-layout" id="detail-grid-layout">
            <div className="detail-left-column" id="detail-left-column">
              <div className="detail-section glass-panel" id="detail-section-abilities">
                <h2 className="detail-section-title">
                  <svg className="section-title-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" />
                    <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
                  </svg>
                  Abilities
                </h2>
                <div className="detail-abilities" id="detail-abilities">
                  {pokemon.abilities?.map((a) => (
                    <div 
                      key={a.ability.name} 
                      className={`detail-ability-card ${a.is_hidden ? "hidden-ability" : ""}`} 
                      id={`ability-card-${a.ability.name}`}
                    >
                      <span className="ability-name">{a.ability.name.replace("-", " ")}</span>
                      {a.is_hidden && <span className="ability-badge">Hidden</span>}
                    </div>
                  ))}
                </div>
              </div>

              {pokemon.cries?.latest && (
                <div className="detail-section glass-panel" id="detail-section-cry">
                  <h2 className="detail-section-title">
                    <svg className="section-title-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                    Pokémon Cry
                  </h2>
                  <div className="cry-player-wrapper">
                    <button
                      className="detail-cry-btn"
                      id="detail-cry-btn"
                      onClick={() => {
                        const audio = new Audio(pokemon.cries?.latest || "");
                        audio.volume = 0.35;
                        audio.play().catch(() => {});
                      }}
                    >
                      <div className="cry-pulsing-wave">
                        <span className="wave-bar bar-1"></span>
                        <span className="wave-bar bar-2"></span>
                        <span className="wave-bar bar-3"></span>
                      </div>
                      <span>Play Cry Audio</span>
                    </button>
                    <p className="cry-details-caption">Listen to the original sound recorded from PokeAPI database</p>
                  </div>
                </div>
              )}

              {counters && (
                <div className="detail-section glass-panel detail-counters-section" id="detail-section-counters">
                  <h2 className="detail-section-title">
                    <svg className="section-title-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
                      <line x1="12" y1="22" x2="12" y2="15.5" />
                      <polyline points="22 8.5 12 15.5 2 8.5" />
                      <polyline points="2 15.5 12 15.5 22 15.5" />
                      <line x1="12" y1="2" x2="12" y2="15.5" />
                    </svg>
                    Element Counters
                  </h2>
                  <p className="counters-caption">Defensive multipliers when hit by these attack elements:</p>
                  <div className="counters-container">
                    {(counters.superWeak.length > 0 || counters.weak.length > 0) && (
                      <div className="counter-group-box vulnerability">
                        <div className="counter-group-header">
                          <span className="counter-group-color-dot weak-dot"></span>
                          <span className="counter-group-title">Weaknesses (Takes More Damage)</span>
                        </div>
                        <div className="counter-badges-grid">
                          {counters.superWeak.map((t) => (
                            <div key={t} className={`counter-badge-item type-${t} super-weak`}>
                              <span className="counter-badge-type">{t}</span>
                              <span className="counter-badge-value">4x</span>
                            </div>
                          ))}
                          {counters.weak.map((t) => (
                            <div key={t} className={`counter-badge-item type-${t} weak`}>
                              <span className="counter-badge-type">{t}</span>
                              <span className="counter-badge-value">2x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(counters.resist.length > 0 || counters.superResist.length > 0) && (
                      <div className="counter-group-box resistance">
                        <div className="counter-group-header">
                          <span className="counter-group-color-dot resist-dot"></span>
                          <span className="counter-group-title">Resistances (Takes Reduced Damage)</span>
                        </div>
                        <div className="counter-badges-grid">
                          {counters.resist.map((t) => (
                            <div key={t} className={`counter-badge-item type-${t} resist`}>
                              <span className="counter-badge-type">{t}</span>
                              <span className="counter-badge-value">0.5x</span>
                            </div>
                          ))}
                          {counters.superResist.map((t) => (
                            <div key={t} className={`counter-badge-item type-${t} super-resist`}>
                              <span className="counter-badge-type">{t}</span>
                              <span className="counter-badge-value">0.25x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {counters.immune.length > 0 && (
                      <div className="counter-group-box immunity">
                        <div className="counter-group-header">
                          <span className="counter-group-color-dot immune-dot"></span>
                          <span className="counter-group-title">Immunities (Takes No Damage)</span>
                        </div>
                        <div className="counter-badges-grid">
                          {counters.immune.map((t) => (
                            <div key={t} className={`counter-badge-item type-${t} immune`}>
                              <span className="counter-badge-type">{t}</span>
                              <span className="counter-badge-value">0x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="detail-right-column" id="detail-right-column">
              <div className="detail-section glass-panel" id="detail-section-stats">
                <h2 className="detail-section-title">
                  <svg className="section-title-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Base Stats
                </h2>
                <div className="detail-stats-list" id="detail-stats-list">
                  {pokemon.stats?.map((s) => {
                    const names = {
                      hp: "HP",
                      attack: "ATK",
                      defense: "DEF",
                      "special-attack": "SP.ATK",
                      "special-defense": "SP.DEF",
                      speed: "SPD",
                    };
                    const colors = {
                      hp: "#22c55e",
                      attack: "#f97316",
                      defense: "#eab308",
                      "special-attack": "#3b82f6",
                      "special-defense": "#a855f7",
                      speed: "#f43f5e",
                    };
                    const percent = Math.min(100, (s.base_stat / 255) * 100);
                    return (
                      <div key={s.stat.name} className="detail-stat-row" id={`stat-row-${s.stat.name}`}>
                        <div className="detail-stat-header">
                          <span className="detail-stat-name">{names[s.stat.name] || s.stat.name}</span>
                          <span className="detail-stat-val">{s.base_stat}</span>
                        </div>
                        <div className="detail-stat-bar-bg">
                          <div
                            className="detail-stat-bar"
                            id={`stat-bar-${s.stat.name}`}
                            style={{
                              width: `${percent}%`,
                              backgroundColor: colors[s.stat.name] || "#94a3b8",
                              boxShadow: `0 0 10px ${colors[s.stat.name] || "#94a3b8"}50`
                            }}
                          >
                            <span className="bar-shine"></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
