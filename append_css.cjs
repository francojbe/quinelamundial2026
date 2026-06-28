const fs = require('fs');
const css = `

/* UX Improvements */
.stepper-wrapper {
  display: flex;
  align-items: center;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.05);
  overflow: hidden;
}
.stepper-btn {
  background: rgba(255,255,255,0.05);
  border: none;
  color: var(--text-primary);
  width: 32px;
  height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}
.stepper-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.15);
  color: var(--accent-green);
}
.stepper-btn:active:not(:disabled) {
  background: rgba(255,255,255,0.2);
}
.stepper-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.score-input {
  width: 36px !important;
  text-align: center;
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  font-size: 1.2rem !important;
}
.match-incomplete {
  border-color: var(--accent-gold) !important;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.15);
}
.match-saved-glow {
  border-color: var(--accent-green) !important;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
}
.leaderboard-th.sticky {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  z-index: 10;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.rank-gold {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, transparent 100%) !important;
  border-left: 3px solid var(--accent-gold) !important;
}
.rank-silver {
  background: linear-gradient(90deg, rgba(161, 161, 170, 0.15) 0%, transparent 100%) !important;
  border-left: 3px solid #a1a1aa !important;
}
.rank-bronze {
  background: linear-gradient(90deg, rgba(180, 83, 9, 0.15) 0%, transparent 100%) !important;
  border-left: 3px solid #b45309 !important;
}
.fade-in-tab {
  animation: fadeInTab 0.3s ease forwards;
}
@keyframes fadeInTab {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
fs.appendFileSync('src/index.css', css);
console.log('CSS updated');
