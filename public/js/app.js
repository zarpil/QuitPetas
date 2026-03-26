// ═══════════ MAIN APP ═══════════
const App = {
  currentPage: 'dashboard',

  pages: {
    dashboard: DashboardPage,
    coach: CoachPage,
    smoking: SmokingPage,
    cravings: CravingsPage,
    journal: JournalPage,
    achievements: AchievementsPage,
    profile: ProfilePage,
    social: SocialPage,
  },

  async init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    if (API.isLoggedIn()) {
      try {
        const user = await API.getMe();
        API.setUser(user);
        if (!user.onboarded) {
          this.renderOnboarding();
        } else {
          this.renderApp();
        }
      } catch {
        API.logout();
        this.renderAuth('login');
      }
    } else {
      this.renderAuth('login');
    }

    this.hideLoading();
  },

  hideLoading() {
    const el = document.getElementById('loading');
    if (el) {
      el.classList.add('hidden');
      setTimeout(() => el.remove(), 300);
    }
  },

  // ═══════════ AUTH SCREEN (solo email + password + confirm) ═══════════
  renderAuth(mode = 'login') {
    const app = document.getElementById('app');
    const isLogin = mode === 'login';

    let authHTML = `
      <div class="auth-container">
        <div class="auth-logo">🌿</div>
        <div class="auth-title">QuitPetas</div>
        <div class="auth-subtitle">${isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta y empieza hoy'}</div>

        <div class="auth-error" id="auth-error"></div>

        <form class="auth-form" id="auth-form">
          <div class="input-group">
            <label>Email</label>
            <input type="email" class="input-field" id="auth-email" placeholder="tu@email.com" required>
          </div>
          <div class="input-group">
            <label>Contraseña</label>
            <input type="password" class="input-field" id="auth-password" placeholder="••••••••" required minlength="6">
          </div>
    `;

    if (!isLogin) {
      authHTML += `
          <div class="input-group">
            <label>Confirmar contraseña</label>
            <input type="password" class="input-field" id="auth-confirm" placeholder="••••••••" required>
          </div>
      `;
    }

    authHTML += `
          <button type="submit" class="btn-primary" id="auth-submit">${isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</button>
        </form>

        <div class="auth-switch">
          ${isLogin 
            ? '¿No tienes cuenta? <a href="#" id="switch-auth">Regístrate</a>' 
            : '¿Ya tienes cuenta? <a href="#" id="switch-auth">Inicia sesión</a>'}
        </div>
      </div>
    `;

    const toast = document.getElementById('toast');
    app.innerHTML = authHTML;
    if (toast) app.appendChild(toast);
    else app.innerHTML += '<div class="toast" id="toast"></div>';

    document.getElementById('switch-auth').addEventListener('click', (e) => {
      e.preventDefault();
      this.renderAuth(isLogin ? 'register' : 'login');
    });

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('auth-error');
      const submitBtn = document.getElementById('auth-submit');

      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;

      if (!isLogin) {
        const confirm = document.getElementById('auth-confirm').value;
        if (password !== confirm) {
          errorEl.textContent = 'Las contraseñas no coinciden';
          errorEl.classList.add('visible');
          return;
        }
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Cargando...';

      try {
        let result;
        if (isLogin) {
          result = await API.login({ email, password });
        } else {
          result = await API.register({ email, password });
        }

        API.setToken(result.token);
        API.setUser(result.user);

        if (result.user.onboarded) {
          this.renderApp();
        } else {
          this.renderOnboarding();
        }
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.textContent = isLogin ? 'Iniciar Sesión' : 'Crear Cuenta';
      }
    });
  },

  // ═══════════ ONBOARDING WIZARD ═══════════
  renderOnboarding() {
    const app = document.getElementById('app');
    let step = 0;

    const state = {
      name: '', age: '', substanceType: 'marihuana', dailyJoints: '',
      gramsPerJoint: '', pricePerGram: '', yearsSmoked: '',
      smokeAlone: null, smokeTrigger: '', motivation: '',
      previousAttempts: '', tobaccoMix: null,
      previousRelapseCause: '', planType: 'COLD_TURKEY'
    };

    const steps = [
      // Step 0: Intro
      () => `
        <div class="ob-step animate-in">
          <div style="font-size:64px;margin-bottom:16px;">🌿</div>
          <h2 class="ob-title">¡Bienvenido a QuitPetas!</h2>
          <p class="ob-desc">Antes de empezar, queremos conocerte un poco para personalizar tu experiencia y ayudarte mejor.</p>
          <p class="ob-desc" style="color:var(--text-muted);font-size:13px;">Solo tardarás 1 minuto ⏱️</p>
        </div>
      `,
      // Step 1: Nombre y edad
      () => `
        <div class="ob-step animate-in">
          <div style="font-size:40px;margin-bottom:12px;">👤</div>
          <h2 class="ob-title">¿Cómo te llamas?</h2>
          <div class="input-group" style="margin-bottom:12px;">
            <label>Tu nombre</label>
            <input type="text" class="input-field" id="ob-name" placeholder="Tu nombre" value="${state.name}">
          </div>
          <div class="input-group">
            <label>Edad</label>
            <input type="number" class="input-field" id="ob-age" placeholder="25" min="13" max="99" value="${state.age}">
          </div>
        </div>
      `,
      // Step 2: Tipo de sustancia
      () => `
        <div class="ob-step animate-in">
          <div style="font-size:40px;margin-bottom:12px;">🍃</div>
          <h2 class="ob-title">¿Qué sueles fumar?</h2>
          <p class="ob-desc">Selecciona el tipo de sustancia que consumes habitualmente</p>
          <div class="ob-options" id="ob-substance">
            <button class="ob-option ${state.substanceType === 'marihuana' ? 'active' : ''}" data-val="marihuana">
              <span style="font-size:32px">🌿</span>
              <span class="ob-option-title">Marihuana</span>
              <span class="ob-option-desc">Hierba / cogollos</span>
            </button>
            <button class="ob-option ${state.substanceType === 'hachis' ? 'active' : ''}" data-val="hachis">
              <span style="font-size:32px">🟤</span>
              <span class="ob-option-title">Hachís</span>
              <span class="ob-option-desc">Resina / polen / bellota</span>
            </button>
            <button class="ob-option ${state.substanceType === 'ambos' ? 'active' : ''}" data-val="ambos">
              <span style="font-size:32px">🔄</span>
              <span class="ob-option-title">Ambos</span>
              <span class="ob-option-desc">Depende del momento</span>
            </button>
          </div>
        </div>
      `,
      // Step 3: Consumo
      () => `
        <div class="ob-step animate-in">
          <div style="font-size:40px;margin-bottom:12px;">📊</div>
          <h2 class="ob-title">Tu consumo</h2>
          <p class="ob-desc">Cuéntanos sobre tus hábitos de consumo</p>
          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Cuántas petas al día? (aprox)</label>
            <input type="number" class="input-field" id="ob-daily" placeholder="3" step="0.5" min="0" value="${state.dailyJoints}">
          </div>
          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Gramos por peta? (aprox)</label>
            <input type="number" class="input-field" id="ob-grams" placeholder="0.3" step="0.05" min="0" value="${state.gramsPerJoint}">
          </div>
          <div class="input-group">
            <label>¿Precio por gramo? (€)</label>
            <input type="number" class="input-field" id="ob-price" placeholder="8" step="0.5" min="0" value="${state.pricePerGram}">
          </div>
        </div>
      `,
      // Step 4: Historial
      () => `
        <div class="ob-step animate-in">
          <div style="font-size:40px;margin-bottom:12px;">📅</div>
          <h2 class="ob-title">Tu historial</h2>
          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Cuántos años llevas fumando?</label>
            <input type="number" class="input-field" id="ob-years" placeholder="5" min="0" value="${state.yearsSmoked}">
          </div>
          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Intentos previos de dejarlo?</label>
            <input type="number" class="input-field" id="ob-attempts" placeholder="0" min="0" value="${state.previousAttempts}">
          </div>
          <div class="input-group" style="margin-bottom:12px;">
            <label>Si recaíste antes, ¿cuál fue el motivo? (Opcional)</label>
            <select class="input-field" id="ob-relapse" style="background:#1d211d;">
              <option value="" ${state.previousRelapseCause === '' ? 'selected' : ''}>Ninguno / No he recaído</option>
              <option value="ansiedad" ${state.previousRelapseCause === 'ansiedad' ? 'selected' : ''}>Ansiedad o insomnio</option>
              <option value="social" ${state.previousRelapseCause === 'social' ? 'selected' : ''}>Presión social o amigos</option>
              <option value="aburrimiento" ${state.previousRelapseCause === 'aburrimiento' ? 'selected' : ''}>Aburrimiento</option>
              <option value="estres" ${state.previousRelapseCause === 'estres' ? 'selected' : ''}>Estrés emocional</option>
            </select>
          </div>
          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Mezclas con tabaco?</label>
            <div class="toggle-group" id="ob-tobacco">
              <button class="toggle-btn ${state.tobaccoMix === true ? 'active' : ''}" data-val="true">Sí</button>
              <button class="toggle-btn ${state.tobaccoMix === false ? 'active' : ''}" data-val="false">No</button>
            </div>
          </div>
        </div>
      `,
      // Step 5: Hábitos
      () => `
        <div class="ob-step animate-in">
          <div style="font-size:40px;margin-bottom:12px;">🕐</div>
          <h2 class="ob-title">Tus hábitos</h2>
          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Cuándo sueles fumar más?</label>
            <div class="ob-options small" id="ob-trigger">
              <button class="ob-option small ${state.smokeTrigger === 'mañana' ? 'active' : ''}" data-val="mañana">🌅 Mañana</button>
              <button class="ob-option small ${state.smokeTrigger === 'tarde' ? 'active' : ''}" data-val="tarde">☀️ Tarde</button>
              <button class="ob-option small ${state.smokeTrigger === 'noche' ? 'active' : ''}" data-val="noche">🌙 Noche</button>
              <button class="ob-option small ${state.smokeTrigger === 'todo el dia' ? 'active' : ''}" data-val="todo el dia">🔄 Todo el día</button>
            </div>
          </div>
          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Sueles fumar solo o acompañado?</label>
            <div class="toggle-group" id="ob-alone">
              <button class="toggle-btn ${state.smokeAlone === true ? 'active' : ''}" data-val="true">Solo</button>
              <button class="toggle-btn ${state.smokeAlone === false ? 'active' : ''}" data-val="false">Acompañado</button>
            </div>
          </div>
        </div>
      `,
      // Step 6: Estrategia de Abandono (Nuevo)
      () => {
        const scores = { COLD_TURKEY: 0, TAPER_FREQ: 0, TAPER_GRAMS: 0 };
        const joints = parseFloat(state.dailyJoints || 0);
        const attempts = parseInt(state.previousAttempts || 0);
        
        // Base points
        if (joints <= 2 && attempts === 0) scores.COLD_TURKEY += 3;
        
        // Quantity
        if (joints >= 5) {
          scores.TAPER_FREQ += 3;
          scores.TAPER_GRAMS += 1;
          scores.COLD_TURKEY -= 2;
        } else if (joints >= 3) {
          scores.TAPER_FREQ += 1;
        }

        // Relapse history & Causes
        if (attempts > 1) {
          scores.COLD_TURKEY -= 2;
          scores.TAPER_FREQ += 2;
          scores.TAPER_GRAMS += 1;
        }
        
        if (state.previousRelapseCause === 'ansiedad' || state.previousRelapseCause === 'estres') {
          scores.TAPER_FREQ += 3;
          scores.COLD_TURKEY -= 3;
        } else if (state.previousRelapseCause === 'social') {
          scores.TAPER_GRAMS += 2; 
        }

        // Tobacco mix
        if (state.tobaccoMix) {
          scores.TAPER_GRAMS += 3;
        }

        // Determine best plan
        let bestPlan = 'COLD_TURKEY';
        let maxScore = scores.COLD_TURKEY;
        if (scores.TAPER_FREQ > maxScore) { bestPlan = 'TAPER_FREQ'; maxScore = scores.TAPER_FREQ; }
        if (scores.TAPER_GRAMS > maxScore) { bestPlan = 'TAPER_GRAMS'; maxScore = scores.TAPER_GRAMS; }
        
        // Autoseleccionar solo si el usuario aún no hizo click manual
        if (!state.planSelectedManual) {
          state.planType = bestPlan;
        }

        let recTitle = "🧊 De Golpe (Cold Turkey)";
        let recReason = "Parece que tienes fuerza suficiente para cortar hoy mismo sin una fuerte abstinencia.";
        
        if (bestPlan === 'TAPER_FREQ') {
          recTitle = "📉 Reducir Cantidad Semanal";
          recReason = "Tu cuerpo podría sentir mucha ansiedad de rebote. Es mejor bajar el ritmo paulatinamente.";
        } else if (bestPlan === 'TAPER_GRAMS') {
          recTitle = "⚖️ Bajar Dosis (Gramos)";
          recReason = "Mantén el gesto de fumar, pero reduce el compuesto tóxico. Ideal para desenganchar nicotina.";
        }
        
        return `
        <div class="ob-step animate-in">
          <div style="font-size:40px;margin-bottom:12px;">🧠</div>
          <h2 class="ob-title">Elige tu Estrategia</h2>
          <p class="ob-desc">Según tu perfil, te recomendamos: <strong>${recTitle}</strong></p>
          <p class="ob-desc" style="font-size:12px; margin-top:-10px; opacity:0.8;">${recReason}</p>
          <div class="ob-options" id="ob-plan" style="display:flex; flex-direction:column; gap:8px;">
            
            <button class="ob-option ${state.planType === 'COLD_TURKEY' ? 'active' : ''}" data-val="COLD_TURKEY" style="text-align:left; padding:12px;">
              <div style="font-weight:600; margin-bottom:4px; color:#ffffff;">🧊 De Golpe (Cold Turkey)</div>
              <div style="font-size:13px; color:var(--text-secondary); line-height:1.4;">Cortas 100% hoy. Racha por días limpios reales. Recomendado si tienes alta motivación.</div>
            </button>
            
            <button class="ob-option ${state.planType === 'TAPER_FREQ' ? 'active' : ''}" data-val="TAPER_FREQ" style="text-align:left; padding:12px;">
              <div style="font-weight:600; margin-bottom:4px; color:#ffffff;">📉 Reducir Cantidad Semanal</div>
              <div style="font-size:13px; color:var(--text-secondary); line-height:1.4;">Fumas menos petas cada semana para que la ansiedad no te venza. Fumando no rompes racha si estás dentro del límite de tu dieta.</div>
            </button>
            
            <button class="ob-option ${state.planType === 'TAPER_GRAMS' ? 'active' : ''}" data-val="TAPER_GRAMS" style="text-align:left; padding:12px;">
              <div style="font-weight:600; margin-bottom:4px; color:#ffffff;">⚖️ Bajar Dosis (Gramos)</div>
              <div style="font-size:13px; color:var(--text-secondary); line-height:1.4;">Mantienes el gesto de fumar, pero bajas la hierba que le pones. Te premiaremos por la toxicidad evitada sin juzgarte.</div>
            </button>

          </div>
        </div>
      `},
      // Step 7: Motivación
      () => {
        const spend = (parseFloat(state.dailyJoints || 0) * parseFloat(state.gramsPerJoint || 0) * parseFloat(state.pricePerGram || 0) * 30).toFixed(0);
        return `
        <div class="ob-step animate-in">
          <div style="font-size:40px;margin-bottom:12px;">💪</div>
          <h2 class="ob-title">Tu motivación</h2>
          ${spend > 0 ? `<div class="card" style="text-align:center;margin-bottom:16px;padding:16px;">
            <div style="font-size:13px;color:var(--text-secondary);">Gasto mensual estimado</div>
            <div style="font-size:32px;font-weight:800;color:var(--danger);">${spend}€</div>
            <div style="font-size:12px;color:var(--text-muted);">${(spend * 12).toLocaleString()}€ al año</div>
          </div>` : ''}
          <div class="input-group">
            <label>¿Por qué quieres dejarlo?</label>
            <textarea class="journal-textarea" id="ob-motivation" placeholder="Salud, dinero, rendimiento, familia... cuéntanos tu razón" style="min-height:80px;">${state.motivation}</textarea>
          </div>
        </div>
      `},
      // Step 8: Ready
      () => {
        const spend = (parseFloat(state.dailyJoints || 0) * parseFloat(state.gramsPerJoint || 0) * parseFloat(state.pricePerGram || 0) * 30).toFixed(0);
        return `
        <div class="ob-step animate-in" style="text-align:center;">
          <div style="font-size:64px;margin-bottom:16px;">🚀</div>
          <h2 class="ob-title">¡Todo listo, ${state.name || 'campeón'}!</h2>
          <p class="ob-desc">Tu perfil está configurado. Hoy empieza tu camino hacia la libertad.</p>
          <div class="stats-grid" style="margin-top:20px;">
            <div class="stat-card">
              <div class="stat-icon">${state.substanceType === 'hachis' ? '🟤' : '🌿'}</div>
              <div class="stat-value" style="font-size:16px;">${state.substanceType || '-'}</div>
              <div class="stat-label">Sustancia</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🚬</div>
              <div class="stat-value">${state.dailyJoints || '-'}</div>
              <div class="stat-label">Petas/día</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">💰</div>
              <div class="stat-value">${spend}€</div>
              <div class="stat-label">€/mes</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📅</div>
              <div class="stat-value">${state.yearsSmoked || '-'}</div>
              <div class="stat-label">Años fumando</div>
            </div>
          </div>
        </div>
      `},
    ];

    const render = () => {
      const html = `
        <div class="auth-container" style="justify-content:flex-start;padding-top:calc(var(--safe-top) + 32px);">
          <div class="ob-progress">
            <div class="ob-progress-bar" style="width:${((step + 1) / steps.length) * 100}%"></div>
          </div>
          <div class="ob-content">
            ${steps[step]()}
          </div>
          <div class="ob-actions">
            ${step > 0 ? '<button class="toggle-btn" id="ob-back" style="padding:14px 24px;color:var(--text-secondary);">← Atrás</button>' : '<div></div>'}
            <button class="btn-primary" id="ob-next" style="width:auto;padding:14px 32px;">
              ${step === steps.length - 1 ? '🌿 Empezar mi viaje' : 'Siguiente →'}
            </button>
          </div>
        </div>
      `;

      const toast = document.getElementById('toast');
      app.innerHTML = html;
      if (toast) app.appendChild(toast);
      else app.innerHTML += '<div class="toast" id="toast"></div>';

      // Back button
      const backBtn = document.getElementById('ob-back');
      if (backBtn) {
        backBtn.addEventListener('click', () => { step--; render(); });
      }

      // Next button
      document.getElementById('ob-next').addEventListener('click', async () => {
        saveStepData();
        if (step === steps.length - 1) {
          // Submit onboarding
          try {
            const user = await API.saveOnboarding(state);
            API.setUser(user);
            App.showToast('🌿 ¡Perfil guardado! Tu viaje empieza ahora', 'success');
            App.renderApp();
          } catch (err) {
            App.showToast(err.message, 'error');
          }
        } else {
          step++;
          render();
        }
      });

      // Bind option selectors
      bindOptions();
    };

    const saveStepData = () => {
      const get = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
      if (step === 1) {
        state.name = get('ob-name') || '';
        state.age = get('ob-age') || '';
      }
      if (step === 3) {
        state.dailyJoints = get('ob-daily') || '';
        state.gramsPerJoint = get('ob-grams') || '';
        state.pricePerGram = get('ob-price') || '';
      }
      if (step === 4) {
        state.yearsSmoked = get('ob-years') || '';
        state.previousAttempts = get('ob-attempts') || '';
        state.previousRelapseCause = get('ob-relapse') || '';
      }
      if (step === 7) {
        state.motivation = get('ob-motivation') || '';
      }
    };

    const bindOptions = () => {
      // Substance type
      document.querySelectorAll('#ob-substance .ob-option').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#ob-substance .ob-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.substanceType = btn.dataset.val;
        });
      });

      // Tobacco mix
      document.querySelectorAll('#ob-tobacco .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#ob-tobacco .toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.tobaccoMix = btn.dataset.val === 'true';
        });
      });

      // Smoke trigger
      document.querySelectorAll('#ob-trigger .ob-option').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#ob-trigger .ob-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.smokeTrigger = btn.dataset.val;
        });
      });

      // Smoke alone
      document.querySelectorAll('#ob-alone .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#ob-alone .toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.smokeAlone = btn.dataset.val === 'true';
        });
      });

      // Plan Type
      document.querySelectorAll('#ob-plan .ob-option').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#ob-plan .ob-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.planType = btn.dataset.val;
          state.planSelectedManual = true;
        });
      });
    };

    render();
  },

  // ═══════════ MAIN APP ═══════════
  renderApp() {
    const app = document.getElementById('app');

    let html = '<div class="app-shell">';
    for (const [key, page] of Object.entries(this.pages)) {
      html += page.render();
    }
    html += '</div>';

    html += `
      <nav class="bottom-nav">
        <button class="nav-item active" data-page="dashboard">
          <span class="nav-icon">🏠</span>
          <span>Inicio</span>
        </button>
        <button class="nav-item" data-page="coach">
          <span class="nav-icon">🤖</span>
          <span>Coach</span>
        </button>
        
        <button class="smart-fab" id="btn-smart-logger">
          <span>➕</span>
        </button>

        <button class="nav-item" data-page="journal">
          <span class="nav-icon">📓</span>
          <span>Diario</span>
        </button>
        <button class="nav-item" data-page="social">
          <span class="nav-icon">🤝</span>
          <span>Social</span>
        </button>
        <button class="nav-item" data-page="profile">
          <span class="nav-icon">⚙️</span>
          <span>Perfil</span>
        </button>
      </nav>
    `;

    const toast = document.getElementById('toast');
    app.innerHTML = html;
    if (toast) app.appendChild(toast);
    else app.innerHTML += '<div class="toast" id="toast"></div>';

    // Inject SOS overlay
    app.insertAdjacentHTML('beforeend', SOSPage.render());

    // Inject SOS floating button
    app.insertAdjacentHTML('beforeend', '<button class="sos-fab" id="btn-sos-fab">🆘</button>');

    // Inject Smart Logger Modal
    const smartLoggerHTML = `
      <div class="smart-logger-overlay" id="smart-logger-modal">
        <div class="smart-logger-container">
           <button class="smart-logger-close" id="smart-logger-close">✕</button>
           <h3 style="margin-bottom:16px; text-align:center;">¿Qué está pasando?</h3>
           <div class="smart-logger-options">
              <button class="smart-logger-option" data-action="checkin">
                <span class="slo-icon">✅</span>
                <div class="slo-text">
                   <div class="slo-title">Check-in Diario</div>
                   <div class="slo-desc">Registra cómo ha ido tu día general</div>
                </div>
              </button>
              <button class="smart-logger-option" data-action="craving">
                <span class="slo-icon">😰</span>
                <div class="slo-text">
                   <div class="slo-title">Tengo ansiedad (Craving)</div>
                   <div class="slo-desc">Registra un episodio de mono o ansia</div>
                </div>
              </button>
              <button class="smart-logger-option" data-action="smoking">
                <span class="slo-icon">🚬</span>
                <div class="slo-text">
                   <div class="slo-title">He fumado / Voy a fumar</div>
                   <div class="slo-desc">Registra una recaída o consumo de límite</div>
                </div>
              </button>
           </div>
        </div>
      </div>
    `;
    app.insertAdjacentHTML('beforeend', smartLoggerHTML);

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.navigate(item.dataset.page);
      });
    });

    // SOS button handler
    document.getElementById('btn-sos-fab')?.addEventListener('click', () => SOSPage.open());

    // Smart Logger Handlers
    const smartModal = document.getElementById('smart-logger-modal');
    document.getElementById('btn-smart-logger')?.addEventListener('click', () => {
      smartModal.classList.add('visible');
    });
    document.getElementById('smart-logger-close')?.addEventListener('click', () => {
      smartModal.classList.remove('visible');
    });

    document.querySelectorAll('.smart-logger-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        smartModal.classList.remove('visible');
        const action = btn.dataset.action;
        if (action === 'checkin') {
          // Si el usuario quiere hacer checkin, debe estar en el dashboard
          this.navigate('dashboard');
          setTimeout(() => {
            const checkinBtn = document.getElementById('btn-checkin');
            if (checkinBtn) checkinBtn.click();
            else App.showToast('Ya hiciste el Check-in hoy', 'info');
          }, 100);
        } else if (action === 'craving') {
          this.navigate('cravings');
        } else if (action === 'smoking') {
          this.navigate('smoking');
        }
      });
    });

    this.navigate('dashboard');
  },

  async navigate(page, pushState = true) {
    if (!this.pages[page]) return;
    
    // Concurrency guard to prevent multiple simultaneous loads
    if (this._isNavigating && this.currentPage === page) return;
    this._isNavigating = true;
    this.currentPage = page;

    if (pushState) {
      history.pushState({ page }, '', `/#${page}`);
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });

    try {
      await this.pages[page].load();
    } catch (err) {
      console.error(`Error loading ${page}:`, err);
    } finally {
      this._isNavigating = false;
    }
  },

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    if (this._toastTimeout) clearTimeout(this._toastTimeout);

    toast.textContent = message;
    toast.className = `toast ${type} visible`;

    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
      this._toastTimeout = null;
    }, 3000);
  },
};

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.page) {
    App.navigate(e.state.page, false);
  } else {
    // If no state, try hash or default to dashboard
    const hash = window.location.hash.replace('#', '');
    App.navigate(hash || 'dashboard', false);
  }
});

document.addEventListener('DOMContentLoaded', () => App.init());
