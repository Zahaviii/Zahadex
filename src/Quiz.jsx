import { useState, useEffect } from "react";
import "./Quiz.css";

export default function Quiz({ allPokemons, onBack }) {
  const [currentPokemon, setCurrentPokemon] = useState(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Game Stats
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage.getItem("zahadex_quiz_highscore");
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Sound triggers
  const playSound = (url) => {
    try {
      const audio = new Audio(url);
      audio.volume = 0.25;
      audio.play().catch(() => {});
    } catch {}
  };

  // Setup a new round
  const loadNewRound = async () => {
    if (!allPokemons || allPokemons.length === 0) return;
    setLoading(true);
    setHasAnswered(false);
    setSelectedOption(null);
    setIsCorrect(false);

    // Pick 1 random correct answer
    const randomIndex = Math.floor(Math.random() * allPokemons.length);
    const mysteryName = allPokemons[randomIndex].name;

    try {
      // Fetch details of correct Pokémon
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${mysteryName}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setCurrentPokemon(data);

      // Generate 3 wrong options
      const tempOptions = [data.name];
      while (tempOptions.length < 4) {
        const randOptIndex = Math.floor(Math.random() * allPokemons.length);
        const randName = allPokemons[randOptIndex].name;
        if (!tempOptions.includes(randName)) {
          tempOptions.push(randName);
        }
      }

      // Shuffle options
      const shuffled = tempOptions.sort(() => Math.random() - 0.5);
      setOptions(shuffled);
      setLoading(false);
    } catch (e) {
      console.error(e);
      // Retry automatically on failure
      setTimeout(loadNewRound, 1000);
    }
  };

  // Start game on mount
  useEffect(() => {
    loadNewRound();
  }, [allPokemons]);

  // Handle choice submission
  const handleOptionSelect = (option) => {
    if (hasAnswered) return;
    
    setHasAnswered(true);
    setSelectedOption(option);
    
    const correct = option === currentPokemon.name;
    setIsCorrect(correct);

    if (correct) {
      const newScore = score + 10 + Math.min(streak * 2, 20); // active streak bonus
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      
      if (newScore > highScore) {
        setHighScore(newScore);
        try {
          localStorage.setItem("zahadex_quiz_highscore", newScore.toString());
        } catch {}
      }
      
      // Play correct answer sound
      playSound("https://play.pokemonshowdown.com/audio/sfx/pokeball-open.mp3");
    } else {
      setStreak(0);
      // Play wrong answer sound
      playSound("https://play.pokemonshowdown.com/audio/sfx/faint.mp3");
    }
  };

  return (
    <div className="quiz-container">
      {/* Quiz Header Panel */}
      <div className="quiz-header">
        <button className="quiz-back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Zahadex</span>
        </button>
        <span className="quiz-title-main">🔥 Guess The Silhouette Mode</span>
        <div style={{ width: "120px" }}></div>
      </div>

      {/* Main Scoreboard Track */}
      <div className="quiz-scoreboard">
        <div className="score-box-p">
          <span className="score-lbl">CURRENT SCORE</span>
          <span className="score-val">{score}</span>
        </div>
        
        {streak > 1 && (
          <div className="score-box-p streak-blip animate-pulse">
            <span className="score-lbl">🔥 HOT STREAK</span>
            <span className="score-val">{streak}x</span>
          </div>
        )}

        <div className="score-box-p">
          <span className="score-lbl">HIGH SCORE</span>
          <span className="score-val">👑 {highScore}</span>
        </div>
      </div>

      {/* Primary Battle Arena Board */}
      <div className="quiz-battleground-floor">
        
        {/* Silhouette Center Screen */}
        <div className={`quiz-canvas-card ${hasAnswered ? "unveiled" : "shadowed"}`}>
          {loading ? (
            <div className="quiz-canvas-loading">
              <div className="quiz-sprite-pokeball-spinner"></div>
              <span>Summoning Mystery Pokémon...</span>
            </div>
          ) : (
            <div className="quiz-image-frame-inner">
              <div className="retro-tech-grid"></div>
              
              {/* Question Banner */}
              {!hasAnswered && (
                <div className="whos-that-banner">
                  WHO'S THAT POKÉMON?
                </div>
              )}

              {/* The Pokémon Silhouette */}
              <img
                src={
                  currentPokemon?.sprites?.other?.["official-artwork"]?.front_default ||
                  currentPokemon?.sprites?.front_default ||
                  ""
                }
                alt="mystery silhoutte"
                className={`mystery-sprite-img ${hasAnswered ? "reveal" : "silhouette"}`}
              />

              {/* Holographic scanner ring effect */}
              {!hasAnswered && <div className="holographic-laser-beam"></div>}
            </div>
          )}
        </div>

        {/* Options & Controls Container */}
        <div className="quiz-interaction-panel">
          {loading ? (
            <div className="options-loading-pulse">
              <div className="skeleton-option"></div>
              <div className="skeleton-option"></div>
              <div className="skeleton-option"></div>
              <div className="skeleton-option"></div>
            </div>
          ) : (
            <div className="options-interactive-grid">
              
              {/* Options buttons */}
              <div className="quiz-options-list">
                {options.map((option, idx) => {
                  let btnClass = "quiz-opt-btn";
                  if (hasAnswered) {
                    if (option === currentPokemon.name) {
                      btnClass += " correct-reveal"; // highlights correct choice green
                    } else if (option === selectedOption) {
                      btnClass += " incorrect-choice"; // highlights wrong chosen red
                    } else {
                      btnClass += " dim-choice"; // dims others
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className={btnClass}
                      disabled={hasAnswered}
                      onClick={() => handleOptionSelect(option)}
                    >
                      <span className="opt-letter-bullet">{String.fromCharCode(65 + idx)}</span>
                      <span className="opt-text-name">{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* Anwer Verdict Banner */}
              {hasAnswered && (
                <div className={`quiz-feedback-box ${isCorrect ? "is-correct-box" : "is-wrong-box"}`}>
                  <div className="feedback-emoticon">
                    {isCorrect ? "🎉 Correct Answer! (+10 pts)" : "⚡ Opps! Fainted."}
                  </div>
                  <p className="feedback-desc">
                    It's <strong>{currentPokemon.name.toUpperCase()}</strong>, a 
                    {" "}{currentPokemon.types?.map(t => t.type.name).join("/")} type Pokémon from Generation database registry.
                  </p>

                  <button className="quiz-next-round-btn" onClick={loadNewRound}>
                    Next Challenge
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
