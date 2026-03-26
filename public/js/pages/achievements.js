// ═══════════ ACHIEVEMENTS PAGE ═══════════
const AchievementsPage = {
  render() {
    return `
      <div class="page" id="page-achievements">
        <div class="page-header">
          <div class="page-title">🏆 Logros</div>
          <div class="page-subtitle">Cada día es una victoria</div>
        </div>

        <div class="achievements-grid animate-in" id="achievements-grid"></div>
      </div>
    `;
  },

  async load() {
    try {
      const achievements = await API.getAchievements();
      const gridEl = document.getElementById('achievements-grid');

      if (achievements.length === 0) {
        gridEl.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1;">
            <div class="empty-icon">🏆</div>
            <p>Los logros se irán desbloqueando con el tiempo</p>
          </div>`;
        return;
      }

      gridEl.innerHTML = achievements.map(a => {
        const unlockedDate = a.unlockedAt 
          ? new Date(a.unlockedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })
          : null;
        return `
          <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
            <span class="achievement-icon">${a.icon}</span>
            <div class="achievement-name">${a.name}</div>
            <div class="achievement-desc">${a.description}</div>
            ${a.unlocked 
              ? `<div class="achievement-days" style="color:var(--accent)">✅ ${unlockedDate}</div>` 
              : `
                <div class="achievement-progress">
                  <div class="achievement-progress-bar" style="width:${a.progress}%"></div>
                </div>
                <div class="achievement-days">${a.progress}% — Día ${a.requirement}</div>
              `
            }
          </div>`;
      }).join('');
    } catch (err) {
      console.error('Achievements load error:', err);
    }
  }
};
