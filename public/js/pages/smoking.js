// ═══════════ SMOKING LOG PAGE ═══════════
const SmokingPage = {
  render() {
    return `
      <div class="page" id="page-smoking">
        <div class="page-header">
          <div class="page-title">🚬 Registro</div>
          <div class="page-subtitle">Lleva un control de tu consumo</div>
        </div>

        <div class="craving-stats" id="smoking-stats">
          <div class="mini-stat">
            <div class="mini-value" id="ss-today">-</div>
            <div class="mini-label">Hoy</div>
          </div>
          <div class="mini-stat">
            <div class="mini-value" id="ss-week">-</div>
            <div class="mini-label">Esta semana</div>
          </div>
          <div class="mini-stat">
            <div class="mini-value" id="ss-spent">-€</div>
            <div class="mini-label">Gastado total</div>
          </div>
        </div>

        <div class="craving-form">
          <h3>➕ Registrar una peta</h3>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Tipo de sustancia</label>
            <div class="toggle-group" id="smoke-substance">
              <button class="toggle-btn active" data-val="marihuana">🌿 María</button>
              <button class="toggle-btn" data-val="hachis">🟤 Hachís</button>
            </div>
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Cantidad aprox (gramos)</label>
            <input type="number" class="input-field" id="smoke-grams" placeholder="0.3" step="0.1" min="0">
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Situación</label>
            <div class="toggle-group" id="smoke-situation" style="flex-wrap:wrap;">
              <button class="toggle-btn" data-val="solo">Solo</button>
              <button class="toggle-btn" data-val="amigos">Con amigos</button>
              <button class="toggle-btn" data-val="casa">En casa</button>
              <button class="toggle-btn" data-val="calle">En la calle</button>
            </div>
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Cómo te sentías antes?</label>
            <div class="mood-selector" id="smoke-mood">
              <button class="mood-btn" data-mood="1">😢</button>
              <button class="mood-btn" data-mood="2">😕</button>
              <button class="mood-btn" data-mood="3">😐</button>
              <button class="mood-btn" data-mood="4">🙂</button>
              <button class="mood-btn" data-mood="5">😄</button>
            </div>
          </div>

          <div class="input-group" style="margin-bottom:16px;">
            <label>Nota (opcional)</label>
            <input type="text" class="input-field" id="smoke-note" placeholder="¿Por qué fumaste?">
          </div>

          <button class="btn-primary" id="btn-log-smoke">📝 Registrar</button>
        </div>

        <div class="section-title" style="margin-top:20px;">📋 Historial reciente</div>
        <div class="craving-list" id="smoking-list"></div>
      </div>
    `;
  },

  async load() {
    let substance = 'marihuana';
    let situation = null;
    let mood = null;

    // Substance toggle
    document.querySelectorAll('#smoke-substance .toggle-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#smoke-substance .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        substance = btn.dataset.val;
      };
    });

    // Situation toggle
    document.querySelectorAll('#smoke-situation .toggle-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#smoke-situation .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        situation = btn.dataset.val;
      };
    });

    // Mood buttons
    document.querySelectorAll('#smoke-mood .mood-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#smoke-mood .mood-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mood = parseInt(btn.dataset.mood);
      };
    });

    // Submit
    document.getElementById('btn-log-smoke').onclick = async () => {
      const grams = document.getElementById('smoke-grams').value;
      const note = document.getElementById('smoke-note').value;

      try {
        await API.logSmoke({
          grams: grams ? parseFloat(grams) : null,
          substance,
          situation,
          mood,
          note: note || null,
        });

        App.showToast('🚬 Peta registrada', 'success');

        // Reset
        document.getElementById('smoke-grams').value = '';
        document.getElementById('smoke-note').value = '';
        document.querySelectorAll('#smoke-situation .toggle-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#smoke-mood .mood-btn').forEach(b => b.classList.remove('active'));
        situation = null;
        mood = null;

        SmokingPage.loadStats();
        SmokingPage.loadList();
      } catch (err) {
        App.showToast(err.message, 'error');
      }
    };

    await Promise.all([SmokingPage.loadStats(), SmokingPage.loadList()]);
  },

  async loadStats() {
    try {
      const stats = await API.getSmokingStats();
      document.getElementById('ss-today').textContent = stats.today;
      document.getElementById('ss-week').textContent = stats.thisWeek;
      document.getElementById('ss-spent').textContent = stats.totalSpent.toFixed(2) + '€';
    } catch (err) {
      console.error('Smoking stats error:', err);
    }
  },

  async loadList() {
    try {
      const logs = await API.getSmokingLogs();
      const listEl = document.getElementById('smoking-list');

      if (logs.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <p>No hay registros aún</p>
          </div>`;
        return;
      }

      const moods = ['', '😢', '😕', '😐', '🙂', '😄'];
      const substances = { marihuana: '🌿', hachis: '🟤' };

      listEl.innerHTML = logs.slice(0, 20).map(l => {
        const date = new Date(l.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return `
          <div class="craving-item">
            <div class="craving-intensity low" style="font-size:20px;">${substances[l.substance] || '🚬'}</div>
            <div class="craving-details">
              <div class="craving-trigger">${l.grams ? l.grams + 'g' : 'Peta'} ${DOMPurify.sanitize(l.substance || '')}</div>
              <div class="craving-meta">${date}${l.situation ? ' · ' + DOMPurify.sanitize(l.situation) : ''}${l.mood ? ' · ' + moods[l.mood] : ''}</div>
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      console.error('Smoking list error:', err);
    }
  }
};
