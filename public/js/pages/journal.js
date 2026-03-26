// ═══════════ JOURNAL PAGE ═══════════
const JournalPage = {
  render() {
    return `
      <div class="page" id="page-journal">
        <div class="page-header">
          <div class="page-title">📓 Diario</div>
          <div class="page-subtitle">Reflexiona sobre tu proceso</div>
        </div>

        <div class="journal-compose animate-in">
          <div class="mood-selector" id="journal-mood">
            <button class="mood-btn" data-mood="1">😢</button>
            <button class="mood-btn" data-mood="2">😕</button>
            <button class="mood-btn" data-mood="3">😐</button>
            <button class="mood-btn" data-mood="4">🙂</button>
            <button class="mood-btn" data-mood="5">😄</button>
          </div>
          <textarea class="journal-textarea" id="journal-text" placeholder="¿Cómo te sientes hoy? ¿Qué has aprendido? ¿Qué retos has enfrentado?"></textarea>
          <button class="btn-primary" id="btn-save-journal">💾 Guardar entrada</button>
        </div>

        <div class="section-title animate-in" style="animation-delay: 0.1s;">📝 Entradas anteriores</div>
        <div class="journal-list animate-in" id="journal-list" style="animation-delay: 0.2s;"></div>
      </div>
    `;
  },

  async load() {
    let selectedMood = null;

    document.querySelectorAll('#journal-mood .mood-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#journal-mood .mood-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMood = parseInt(btn.dataset.mood);
      };
    });

    document.getElementById('btn-save-journal').onclick = async () => {
      const content = document.getElementById('journal-text').value.trim();
      if (!content) {
        App.showToast('Escribe algo en tu diario', 'error');
        return;
      }

      try {
        await API.addJournal({ content, mood: selectedMood });
        App.showToast('📓 Entrada guardada', 'success');
        document.getElementById('journal-text').value = '';
        document.querySelectorAll('#journal-mood .mood-btn').forEach(b => b.classList.remove('active'));
        selectedMood = null;
        JournalPage.loadList();
      } catch (err) {
        App.showToast(err.message, 'error');
      }
    };

    await JournalPage.loadList();
  },

  async loadList() {
    try {
      const entries = await API.getJournal();
      const listEl = document.getElementById('journal-list');

      if (entries.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📖</div>
            <p>Aún no hay entradas. ¡Empieza a escribir!</p>
          </div>`;
        return;
      }

      const moods = ['', '😢', '😕', '😐', '🙂', '😄'];

      listEl.innerHTML = entries.map(e => {
        const date = new Date(e.createdAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return `
          <div class="journal-item">
            <div class="journal-item-header">
              <span class="journal-date">${date}</span>
              <div style="display:flex;align-items:center;gap:8px;">
                ${e.mood ? `<span class="journal-mood">${moods[e.mood]}</span>` : ''}
                <button class="journal-delete" data-id="${e.id}">✕</button>
              </div>
            </div>
            <div class="journal-content">${DOMPurify.sanitize(e.content)}</div>
          </div>`;
      }).join('');

      // Delete handlers
      listEl.querySelectorAll('.journal-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('¿Eliminar esta entrada?')) {
            try {
              await API.deleteJournal(btn.dataset.id);
              App.showToast('Entrada eliminada', 'success');
              JournalPage.loadList();
            } catch (err) {
              App.showToast(err.message, 'error');
            }
          }
        });
      });
    } catch (err) {
      console.error('Journal list error:', err);
    }
  }
};
