const SocialPage = {
  render() {
    return `
      <div id="page-social" class="page">
        <div class="page-header">
          <div class="page-title">Comunidad 🤝</div>
          <p class="page-subtitle">Compite y motívate con tus amigos en grupos privados.</p>
        </div>

        <div class="social-actions animate-in" style="margin-top:16px;">
          <button class="btn-primary" id="btn-create-group" style="margin-top:0;">➕ Crear Grupo</button>
          <button class="btn-secondary" id="btn-join-group" style="margin-top:0;">🔑 Unirse a Grupo</button>
        </div>

        <div id="groups-list" class="groups-grid animate-in" style="animation-delay: 0.1s;">
           <!-- Grupos se cargan aquí -->
           <div class="loading-spinner">Cargando grupos...</div>
        </div>

        <!-- Modales -->
        <div class="modal-overlay" id="modal-group">
          <div class="modal-content">
            <div class="modal-handle"></div>
            <h3 id="modal-title">Grupo</h3>
            <div id="modal-body"></div>
            <button class="btn-secondary" id="btn-close-modal">Cerrar</button>
          </div>
        </div>
      </div>
    `;
  },

  async load() {
    this.closeGroup(true);
    this.bindEvents();
    await this.refreshGroups();
  },

  closeGroup(isPopState = false) {
    const modal = document.getElementById('modal-group');
    if (modal && modal.classList.contains('visible')) {
      modal.classList.remove('visible');
      if (!isPopState && history.state?.modal === 'group') {
        history.back();
      }
    }
  },

  bindEvents() {
    const btnCreate = document.getElementById('btn-create-group');
    if (btnCreate) btnCreate.onclick = () => this.showCreateModal();

    const btnJoin = document.getElementById('btn-join-group');
    if (btnJoin) btnJoin.onclick = () => this.showJoinModal();

    const btnClose = document.getElementById('btn-close-modal');
    if (btnClose) btnClose.onclick = () => this.closeGroup();

    const modal = document.getElementById('modal-group');
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) this.closeGroup();
      };
    }
  },

  async refreshGroups() {
    const listEl = document.getElementById('groups-list');
    try {
      const groups = await API.getGroups();
      if (groups.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div style="font-size:48px;margin-bottom:16px;">🏘️</div>
            <p>Aún no estás en ningún grupo.</p>
            <p style="font-size:13px;color:var(--text-muted);">Crea uno o pide el código a un amigo.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = groups.map(g => `
        <div class="card group-card" onclick="SocialPage.viewGroup(${g.id})">
          <div class="group-info">
            <h4 class="group-name">${g.name}</h4>
            <div class="group-stats">
              <span>👥 ${g.memberCount} miembros</span>
              <span>🔑 Código: <strong style="color:var(--primary);">${g.joinCode}</strong></span>
            </div>
          </div>
          <div class="group-arrow">→</div>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<p class="error">Error: ${err.message}</p>`;
    }
  },

  showCreateModal() {
    const modal = document.getElementById('modal-group');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.innerText = "Crear Nuevo Grupo";
    body.innerHTML = `
      <div class="input-group">
        <label>Nombre del grupo</label>
        <input type="text" id="new-group-name" class="input-field" placeholder="Ej: Los Invencibles">
      </div>
      <button class="btn-primary" id="btn-confirm-create" style="margin-top:16px;">Crear Grupo</button>
    `;

    modal.classList.add('visible');

    document.getElementById('btn-confirm-create').onclick = async () => {
      const name = document.getElementById('new-group-name').value;
      if (!name) return;
      try {
        await API.createGroup(name);
        modal.classList.remove('visible');
        App.showToast('✅ Grupo creado con éxito');
        this.refreshGroups();
      } catch (err) {
        alert(err.message);
      }
    };
  },

  showJoinModal() {
    const modal = document.getElementById('modal-group');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.innerText = "Unirse a un Grupo";
    body.innerHTML = `
      <div class="input-group">
        <label>Código de invitación</label>
        <input type="text" id="join-group-code" class="input-field" placeholder="ABC123" style="text-transform:uppercase;">
      </div>
      <button class="btn-primary" id="btn-confirm-join" style="margin-top:16px;">Unirse</button>
    `;

    modal.classList.add('visible');

    document.getElementById('btn-confirm-join').onclick = async () => {
      const code = document.getElementById('join-group-code').value;
      if (!code) return;
      try {
        await API.joinGroup(code);
        modal.classList.remove('visible');
        App.showToast('✅ Te has unido al grupo');
        this.refreshGroups();
      } catch (err) {
        alert(err.message);
      }
    };
  },

  async viewGroup(id) {
    const modal = document.getElementById('modal-group');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    modal.classList.add('visible');
    history.pushState({ page: 'social', modal: 'group' }, '', window.location.href);
    body.innerHTML = '<div class="loading-spinner">Cargando detalles...</div>';

    try {
      const group = await API.getGroupDetails(id);
      this.currentGroup = group; // Store for sorting
      title.innerText = group.name;

      this.renderGroupContent();
    } catch (err) {
      body.innerHTML = `<p class="error">${err.message}</p>`;
    }
  },

  renderGroupContent(sortKey = 'daysClean') {
    const body = document.getElementById('modal-body');
    const group = this.currentGroup;
    if (!group) return;

    // Sort members
    const sortedMembers = [...group.members].sort((a, b) => {
      if (sortKey === 'jointsAvoided' || sortKey === 'daysClean' || sortKey === 'moneySaved') {
        return b[sortKey] - a[sortKey];
      }
      if (sortKey === 'jointsSmoked') {
        return a[sortKey] - b[sortKey]; // Less is better
      }
      return 0;
    });

    let html = `
      <div class="group-summary-card">
        <div class="group-code-share">Código: <strong>${group.joinCode}</strong></div>
        ${group.totals ? `
          <div class="group-totals-grid">
            <div class="total-item">
              <div class="total-val">${group.totals.totalJointsAvoided}</div>
              <div class="total-lab">Evitados</div>
            </div>
            <div class="total-item">
              <div class="total-val">${group.totals.totalMoneySaved.toFixed(0)}€</div>
              <div class="total-lab">Ahorrado</div>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="leaderboard-controls" style="margin: 16px 0; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">Ranking</span>
        <select id="sort-leaderboard" class="input-field" style="width: auto; padding: 4px 8px; font-size: 12px; height: 32px;">
          <option value="daysClean" ${sortKey === 'daysClean' ? 'selected' : ''}>Más días limpio</option>
          <option value="jointsAvoided" ${sortKey === 'jointsAvoided' ? 'selected' : ''}>Más evitados</option>
          <option value="moneySaved" ${sortKey === 'moneySaved' ? 'selected' : ''}>Más ahorrado</option>
          <option value="jointsSmoked" ${sortKey === 'jointsSmoked' ? 'selected' : ''}>Menos fumados</option>
        </select>
      </div>

      <div class="leaderboard">
        ${sortedMembers.map((m, i) => `
          <div class="leaderboard-item ${m.isMe ? 'is-me' : ''}">
            <div class="rank">${i === 0 ? '🏆' : i + 1}</div>
            <div class="member-info">
              <div class="member-pname">${m.name} ${m.isMe ? '(Tú)' : ''}</div>
              <div class="member-pstats">
                <span>🔥 ${m.daysClean}d</span> | 
                <span>🚬 Evitados: ${m.jointsAvoided}</span> | 
                <span style="color:var(--accent);">💰 ${m.moneySaved.toFixed(0)}€</span>
              </div>
              <div class="member-psubstats" style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                Fumados: ${m.jointsSmoked} petas
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    body.innerHTML = html;

    // Bind sort event
    document.getElementById('sort-leaderboard').onchange = (e) => {
      this.renderGroupContent(e.target.value);
    };
  }
};
