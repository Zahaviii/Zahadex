import { useState } from "react";
import "./Login.css";

const PARTNERS = [
  { id: "pikachu", name: "Pikachu", emoji: "⚡", color: "#fef08a", border: "#eab308" },
  { id: "charmander", name: "Charmander", emoji: "🔥", color: "#ffedd5", border: "#f97316" },
  { id: "squirtle", name: "Squirtle", emoji: "💧", color: "#e0f2fe", border: "#3b82f6" },
  { id: "bulbasaur", name: "Bulbasaur", emoji: "🌿", color: "#f0fdf4", border: "#22c55e" },
  { id: "eevee", name: "Eevee", emoji: "🦊", color: "#fef3c7", border: "#d97706" },
  { id: "gengar", name: "Gengar", emoji: "😈", color: "#f3e8ff", border: "#a855f7" },
  { id: "mew", name: "Mew", emoji: "✨", color: "#fdf2f8", border: "#ec4899" },
  { id: "snorlax", name: "Snorlax", emoji: "💤", color: "#f1f5f9", border: "#64748b" },
];

export default function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [selectedPartner, setSelectedPartner] = useState(PARTNERS[0]);
  const [errorChat, setErrorChat] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      setErrorChat("Trainer name cannot be empty!");
      return;
    }

    if (cleanName.length < 2) {
      setErrorChat("Name must be at least 2 characters!");
      return;
    }

    if (cleanName.length > 20) {
      setErrorChat("Name must be at most 20 characters!");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate interactive login animation
    setTimeout(() => {
      onLogin(cleanName, selectedPartner.emoji);
      setIsSubmitting(false);
    }, 850);
  };

  return (
    <div className="login-screen-overlay">
      <div className="login-container-card">
        {/* Animated Pokeball Header */}
        <div className="login-pokeball-header">
          <div className="login-pokeball-rotator">
            <div className="pokeball-top-half"></div>
            <div className="pokeball-line-mid">
              <div className="pokeball-center-circle">
                <div className="pokeball-center-dot"></div>
              </div>
            </div>
            <div className="pokeball-bottom-half"></div>
          </div>
        </div>

        <div className="login-welcome-text">
          <h1>ZAHADEX TRAINER PORTAL</h1>
          <p>Register as a certified Pokémon Trainer to access the ultimate database.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Label Group */}
          <div className="input-group">
            <label className="input-label">TRAINER NAME</label>
            <div className="input-wrapper">
              <span className="input-prefix-icon">🎒</span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorChat) setErrorChat("");
                }}
                placeholder="Enter your Trainer name..."
                maxLength={20}
                autoFocus
                className="trainer-name-input"
              />
            </div>
            {errorChat && <span className="login-error-toast">⚠️ {errorChat}</span>}
          </div>

          {/* Partner Picker */}
          <div className="picker-section">
            <span className="input-label">CHOOSE FOOTPRINT PARTNER</span>
            <div className="partner-avatar-grid">
              {PARTNERS.map((partner) => {
                const isSelected = selectedPartner.id === partner.id;
                return (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => setSelectedPartner(partner)}
                    className={`partner-bubble-btn ${isSelected ? "selected" : ""}`}
                    style={{
                      "--partner-color": partner.color,
                      "--partner-border": partner.border,
                    }}
                    title={partner.name}
                  >
                    <span className="partner-emoji">{partner.emoji}</span>
                    <span className="partner-badge-name">{partner.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Call To Action Buttons */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`login-submit-action-btn ${isSubmitting ? "loading" : ""}`}
            id="login-submit-btn"
          >
            {isSubmitting ? (
              <span className="spinner-loader-action"></span>
            ) : (
              <>
                <span>REGISTER TRAINER PASS</span>
                <span className="btn-shine-overlay"></span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="login-background-deco">
        <span className="deco-dot dot-1"></span>
        <span className="deco-dot dot-2"></span>
        <span className="deco-dot dot-3"></span>
      </div>
    </div>
  );
}
