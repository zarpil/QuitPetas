// ═══════════ DASHBOARD PAGE ═══════════
const DashboardPage = {
  render() {
    return `
      <div class="page" id="page-dashboard">
        <div class="page-header">
          <div class="page-title">🌿 QuitPetas</div>
          <div class="page-subtitle">Tu camino hacia la libertad</div>
        </div>

        <div class="stats-grid animate-in" id="dashboard-stats">
          <div class="stat-card streak-card" style="position:relative;">
            <div class="stat-icon">🔥</div>
            <div class="stat-value" id="stat-streak">-</div>
            <div class="stat-label">Días sin fumar</div>
            <div class="stat-sublabel" id="stat-longest-streak" style="font-size:0.8rem; color:#a0a2a0; margin-top:4px;">Récord: - días</div>
            <div id="dashboard-allowance-tracker" style="display:none; margin-top:12px; font-size:13px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.1);"></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-value" id="stat-money">-</div>
            <div class="stat-label">€ Ahorrados</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🚫</div>
            <div class="stat-value" id="stat-joints">-</div>
            <div class="stat-label">Porros evitados</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-value" id="stat-hours">-</div>
            <div class="stat-label">Horas totales</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💪</div>
            <div class="stat-value" id="stat-resisted">-</div>
            <div class="stat-label">Cravings vencidos</div>
          </div>
        </div>

        <button class="btn-primary" id="btn-checkin" style="display:none;">
          ✅ Check-in de hoy
        </button>

        <div class="card" style="margin-top:20px;margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">📉 Tu Evolución (Últimos 7 días)</h3>
          <canvas id="chart-cravings" height="150"></canvas>
        </div>

        <div class="card" style="margin-top:20px;margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">💰 Dinero Gastado (Últimos 7 días)</h3>
          <canvas id="chart-money" height="150"></canvas>
        </div>

        <div class="section-title">❤️‍🩹 Mejoras de Salud</div>
        <div class="health-timeline" id="health-timeline"></div>

        <div style="margin-top:20px">
          <div class="section-title">🎯 Próximo Hito</div>
          <div class="card" id="next-milestone"></div>
        </div>
      </div>
    `;
  },

  async load() {
    try {
      const data = await API.getProgress();

      document.getElementById('stat-streak').textContent = data.streak;
      document.getElementById('stat-longest-streak').textContent = `Récord: ${data.longestStreak} días`;
      document.getElementById('stat-money').textContent = data.moneySaved.toFixed(2);
      document.getElementById('stat-joints').textContent = data.jointsNotSmoked;
      document.getElementById('stat-hours').textContent = data.totalHours;
      document.getElementById('stat-resisted').textContent = data.resistedCravings;

      const streakLabel = document.querySelector('.streak-card .stat-label');
      if (streakLabel) {
        if (data.planType === 'TAPER_FREQ') streakLabel.textContent = 'Días bajo límite';
        else if (data.planType === 'TAPER_GRAMS') streakLabel.textContent = 'Días en el peso';
        else streakLabel.textContent = 'Días limpios';
      }

      const tracker = document.getElementById('dashboard-allowance-tracker');
      if (tracker && (data.planType === 'TAPER_FREQ' || data.planType === 'TAPER_GRAMS')) {
        tracker.style.display = 'block';
        const isOver = data.allowanceConsumedToday > data.allowanceDailyLimit;
        const color = isOver ? 'var(--danger)' : (data.allowanceConsumedToday === data.allowanceDailyLimit ? 'var(--warning)' : 'var(--success)');
        const unit = data.planType === 'TAPER_FREQ' ? 'petas' : 'g';
        tracker.innerHTML = `
          <div style="color:var(--text-secondary); margin-bottom:4px;">Límite Clínico de Hoy:</div>
          <div style="font-weight:700; font-size:15px; color:${color};">
            ${data.allowanceConsumedToday} / ${data.allowanceDailyLimit} ${unit}
          </div>
        `;
      }

      // Load Charts
      try {
        const chartData = await API.getChartData();
        
        // Cravings Chart
        const ctxCrv = document.getElementById('chart-cravings').getContext('2d');
        if (window.chartCrv) window.chartCrv.destroy();
        window.chartCrv = new Chart(ctxCrv, {
          type: 'line',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: 'Nº Cravings',
              data: chartData.cravings,
              borderColor: '#2ecc71',
              tension: 0.3,
              fill: true,
              backgroundColor: 'rgba(46, 204, 113, 0.1)'
            }]
          },
          options: { responsive: true, plugins: { legend: { display:false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });

        // Money Chart
        const ctxMon = document.getElementById('chart-money').getContext('2d');
        if (window.chartMon) window.chartMon.destroy();
        window.chartMon = new Chart(ctxMon, {
          type: 'bar',
          data: {
            labels: chartData.labels,
            datasets: [
              {
                label: 'Gastado (€)',
                data: chartData.moneySpent,
                backgroundColor: '#e74c3c',
                borderRadius: 4
              },
              {
                label: 'Ahorrado (€)',
                data: chartData.moneySaved,
                backgroundColor: '#2ecc71',
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true, position: 'bottom', labels: { color: '#a0a2a0', font: { family: 'Outfit' } } }
            },
            scales: {
              x: { stacked: true, ticks: { color: '#a0a2a0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { stacked: true, beginAtZero: true, ticks: { color: '#a0a2a0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
          }
        });
      } catch (err) {
        console.error('Charts error:', err);
      }

      // Health timeline
      const timelineEl = document.getElementById('health-timeline');
      const allMilestones = [
        { day: 1, title: 'Sin THC activo', description: 'Los efectos psicoactivos han desaparecido', icon: '🧹' },
        { day: 3, title: 'Mejor sueño', description: 'El sueño REM empieza a recuperarse', icon: '😴' },
        { day: 7, title: 'Apetito normal', description: 'Tu apetito se está regulando', icon: '🍎' },
        { day: 14, title: 'Memoria mejorada', description: 'Tu memoria a corto plazo mejora', icon: '🧠' },
        { day: 30, title: 'Pulmones limpios', description: 'La capacidad pulmonar mejora significativamente', icon: '🫁' },
        { day: 90, title: 'Receptores normalizados', description: 'Los receptores cannabinoides se han normalizado', icon: '✨' },
        { day: 180, title: 'Libertad total', description: 'Dependencia psicológica prácticamente eliminada', icon: '🦋' },
        { day: 365, title: 'Un año libre', description: 'Transformación completa de hábitos y estilo de vida', icon: '👑' },
      ];

      timelineEl.innerHTML = allMilestones.map(m => {
        const achieved = data.totalDays >= m.day;
        return `
          <div class="health-item ${achieved ? 'achieved' : 'locked'}">
            <div class="health-icon">${m.icon}</div>
            <div class="health-info">
              <div class="health-title">${m.title}</div>
              <div class="health-desc">${m.description}</div>
            </div>
            <div class="health-day">
              ${achieved ? `
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                  <span style="font-size:18px;">✅</span>
                  <button class="btn-share-milestone" data-title="${m.title}" style="background:none;border:none;cursor:pointer;font-size:18px;" title="Compartir">📤</button>
                </div>
              ` : `Día ${m.day}`}
            </div>
          </div>
        `;
      }).join('');

      // Bind share buttons
      document.querySelectorAll('.btn-share-milestone').forEach(btn => {
        btn.onclick = async () => {
          if (navigator.share) {
            try {
              await navigator.share({
                title: 'QuitPetas',
                text: `¡He superado el hito "${btn.dataset.title}" dejando los porros con QuitPetas! 🌿💪`,
                url: window.location.origin
              });
            } catch (err) { console.log('Compartir cancelado o error:', err); }
          } else {
            App.showToast('Tu navegador no soporta compartir nativo', 'error');
          }
        };
      });

      // Next milestone
      const nextEl = document.getElementById('next-milestone');
      if (data.nextMilestone) {
        const daysLeft = data.nextMilestone - data.totalDays;
        const milestone = allMilestones.find(m => m.day === data.nextMilestone);
        nextEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:32px">${milestone ? milestone.icon : '🎯'}</div>
            <div>
              <div style="font-weight:700">${milestone ? milestone.title : `Día ${data.nextMilestone}`}</div>
              <div style="font-size:13px;color:var(--text-secondary)">
                Faltan <span style="color:var(--accent);font-weight:700">${daysLeft}</span> días
              </div>
            </div>
          </div>
        `;
      } else {
        nextEl.innerHTML = '<div style="text-align:center;padding:8px">🎉 ¡Has alcanzado todos los hitos!</div>';
      }

      // Check-in button
      document.getElementById('btn-checkin').onclick = () => {
        DashboardPage.showCheckinModal();
      };

    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  },

  showCheckinModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay visible';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-handle"></div>
        <div class="modal-title">📋 Check-in Diario</div>
        
        <div class="input-group" style="margin-bottom:16px;">
          <label>¿Cómo te sientes hoy?</label>
          <div class="mood-selector" id="checkin-mood">
            <button class="mood-btn" data-mood="1">😢</button>
            <button class="mood-btn" data-mood="2">😕</button>
            <button class="mood-btn" data-mood="3">😐</button>
            <button class="mood-btn" data-mood="4">🙂</button>
            <button class="mood-btn" data-mood="5">😄</button>
          </div>
        </div>

        <div class="input-group" style="margin-bottom:16px;">
          <label>¿Has fumado hoy?</label>
          <div class="toggle-group" id="checkin-smoked">
            <button class="toggle-btn active" data-val="false">No 💚</button>
            <button class="toggle-btn" data-val="true">Sí</button>
          </div>
        </div>

        <div class="input-group" style="margin-bottom:16px;">
          <label>Nota (opcional)</label>
          <input type="text" class="input-field" id="checkin-note" placeholder="¿Cómo ha ido el día?">
        </div>

        <button class="btn-primary" id="btn-submit-checkin">Registrar Check-in</button>
        <button class="toggle-btn" style="width:100%;margin-top:8px;color:var(--text-secondary);padding:12px;" id="btn-close-checkin">Cancelar</button>
      </div>
    `;

    document.body.appendChild(overlay);

    let selectedMood = null;
    let smoked = false;

    overlay.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMood = parseInt(btn.dataset.mood);
      });
    });

    overlay.querySelectorAll('#checkin-smoked .toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('#checkin-smoked .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        smoked = btn.dataset.val === 'true';
      });
    });

    document.getElementById('btn-close-checkin').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.getElementById('btn-submit-checkin').addEventListener('click', async () => {
      try {
        const note = document.getElementById('checkin-note').value;
        const result = await API.checkIn({ smoked, mood: selectedMood, note: note || null });
        overlay.remove();

        if (result.newAchievements && result.newAchievements.length > 0) {
          result.newAchievements.forEach(ach => {
            App.showToast(`🏆 ¡Nuevo logro: ${ach.name}!`, 'success');
          });
        } else {
          App.showToast('✅ Check-in registrado', 'success');
        }

        DashboardPage.load();
      } catch (err) {
        App.showToast(err.message, 'error');
      }
    });
  }
};
