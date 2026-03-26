// ═══════════ CRAVINGS PAGE ═══════════
const CravingsPage = {
  render() {
    return `
      <div class="page" id="page-cravings">
        <div class="page-header">
          <div class="page-title">🔥 Cravings</div>
          <div class="page-subtitle">Registra y gestiona tus momentos de ansiedad</div>
        </div>

        <div class="craving-stats" id="craving-stats">
          <div class="mini-stat">
            <div class="mini-value" id="cs-total">-</div>
            <div class="mini-label">Total</div>
          </div>
          <div class="mini-stat">
            <div class="mini-value" id="cs-rate">-</div>
            <div class="mini-label">% Resistidos</div>
          </div>
          <div class="mini-stat">
            <div class="mini-value" id="cs-avg">-</div>
            <div class="mini-label">Intensidad Méd</div>
          </div>
        </div>
        
        <div id="cs-top-trigger-container" style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px; margin-bottom:20px; text-align:center; display:none;">
          <div style="font-size:11px; color:var(--text-secondary); text-transform:uppercase; font-weight:600; margin-bottom:4px;">Tu talón de Aquiles</div>
          <div id="cs-top-trigger" style="font-size:16px; font-weight:700; color:var(--warning);"></div>
        </div>

        <div class="craving-form">
          <h3>➕ Registrar Craving</h3>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Intensidad (1-10)</label>
            <div class="intensity-selector" id="craving-intensity"></div>
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Qué lo provocó?</label>
            <div id="craving-trigger-chips" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
              <button class="toggle-btn" data-val="Estrés">Estrés</button>
              <button class="toggle-btn" data-val="Ansiedad">Ansiedad</button>
              <button class="toggle-btn" data-val="Social">Social</button>
              <button class="toggle-btn" data-val="Aburrimiento">Aburrimiento</button>
              <button class="toggle-btn" data-val="Insomnio">Insomnio</button>
            </div>
            <input type="text" class="input-field" id="craving-trigger-other" placeholder="Otro motivo...">
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Cómo lo gestionaste?</label>
            <input type="text" class="input-field" id="craving-strategy" placeholder="Respiración, ejercicio, distracción...">
          </div>

          <div class="input-group" style="margin-bottom:16px;">
            <label>¿Resististe?</label>
            <div class="toggle-group" id="craving-resisted">
              <button class="toggle-btn active" data-val="true">Sí 💪</button>
              <button class="toggle-btn" data-val="false">No</button>
            </div>
          </div>

          <button class="btn-primary" id="btn-add-craving">Registrar</button>
        </div>

        <div class="section-title">📋 Historial</div>
        <div class="craving-list" id="craving-list"></div>
      </div>
    `;
  },

  async load() {
    // Render intensity buttons
    const intensityEl = document.getElementById('craving-intensity');
    intensityEl.innerHTML = Array.from({length: 10}, (_, i) => 
      `<button class="intensity-btn" data-intensity="${i+1}">${i+1}</button>`
    ).join('');

    let selectedIntensity = null;
    let selectedTriggerChip = null;
    let resisted = true;

    intensityEl.querySelectorAll('.intensity-btn').forEach(btn => {
      btn.onclick = () => {
        intensityEl.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedIntensity = parseInt(btn.dataset.intensity);
      };
    });

    document.querySelectorAll('#craving-trigger-chips .toggle-btn').forEach(btn => {
      btn.onclick = () => {
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          selectedTriggerChip = null;
        } else {
          document.querySelectorAll('#craving-trigger-chips .toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedTriggerChip = btn.dataset.val;
          document.getElementById('craving-trigger-other').value = ''; // clean text input
        }
      };
    });

    document.querySelectorAll('#craving-resisted .toggle-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#craving-resisted .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        resisted = btn.dataset.val === 'true';
      };
    });

    // Submit
    document.getElementById('btn-add-craving').onclick = async () => {
      if (!selectedIntensity) {
        App.showToast('Selecciona la intensidad', 'error');
        return;
      }

      const otherTrigger = document.getElementById('craving-trigger-other').value.trim();
      const finalTrigger = selectedTriggerChip || otherTrigger || null;

      try {
        await API.addCraving({
          intensity: selectedIntensity,
          trigger: finalTrigger,
          strategy: document.getElementById('craving-strategy').value || null,
          resisted,
        });

        // Reset form
        selectedIntensity = null;
        selectedTriggerChip = null;
        intensityEl.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#craving-trigger-chips .toggle-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('craving-trigger-other').value = '';
        document.getElementById('craving-strategy').value = '';

        CravingsPage.loadList();
        CravingsPage.loadStats();

        // Si es una recaída brutal no resistida, recargar el dashboard/layout para machacar la racha visualmente
        if (!resisted) {
          App.showToast('Recaída registrada. No te rindas, mañana será otro día.', 'error');
          setTimeout(() => window.location.reload(), 1500);
          return;
        }

        // Si resistió pero era MUY fuerte, forzar SOS
        if (selectedIntensity >= 8 && resisted) {
            App.showToast('¡Resistido! Detectamos alta ansiedad. Activando protocolo SOS...', 'success');
            setTimeout(() => {
                if (typeof App.openSOS === 'function') App.openSOS();
            }, 1000);
        } else {
            App.showToast('💪 ¡Craving resistido!', 'success');
        }

      } catch (err) {
        App.showToast(err.message, 'error');
      }
    };

    await Promise.all([CravingsPage.loadList(), CravingsPage.loadStats()]);
  },

  async loadStats() {
    try {
      const stats = await API.getCravingStats();
      document.getElementById('cs-total').textContent = stats.total;
      document.getElementById('cs-rate').textContent = stats.successRate + '%';
      document.getElementById('cs-avg').textContent = stats.avgIntensity;
      
      if (stats.topTriggers && stats.topTriggers.length > 0) {
        const top = stats.topTriggers[0];
        document.getElementById('cs-top-trigger-container').style.display = 'block';
        document.getElementById('cs-top-trigger').textContent = `${top.trigger} (${top.count} veces)`;
      } else {
        document.getElementById('cs-top-trigger-container').style.display = 'none';
      }
    } catch (err) {
      console.error('Craving stats error:', err);
    }
  },

  async loadList() {
    try {
      const cravings = await API.getCravings();
      const listEl = document.getElementById('craving-list');

      if (cravings.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🧘</div>
            <p>No hay cravings registrados. ¡Genial!</p>
          </div>`;
        return;
      }

      listEl.innerHTML = cravings.map(c => {
        const level = c.intensity <= 3 ? 'low' : c.intensity <= 6 ? 'medium' : 'high';
        const date = new Date(c.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return `
          <div class="craving-item">
            <div class="craving-intensity ${level}">${c.intensity}</div>
            <div class="craving-details">
              <div class="craving-trigger">${DOMPurify.sanitize(c.trigger || 'Sin trigger especificado')}</div>
              <div class="craving-meta">${date}${c.strategy ? ' · ' + DOMPurify.sanitize(c.strategy) : ''}</div>
            </div>
            <div class="craving-badge ${c.resisted ? 'resisted' : 'failed'}">${c.resisted ? 'Resistido' : 'Caída'}</div>
          </div>`;
      }).join('');
    } catch (err) {
      console.error('Craving list error:', err);
    }
  }
};
