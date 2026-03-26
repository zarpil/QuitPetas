// ═══════════ SOS MODE PAGE ═══════════
const SOSPage = {
  timer: null,
  seconds: 0,
  breathingInterval: null,

  render() {
    return `
      <div class="sos-overlay" id="sos-overlay" style="display:none;">
        <div class="sos-container">
          <button class="sos-close" id="sos-close">✕</button>

          <!-- Step tabs -->
          <div class="sos-tabs">
            <button class="sos-tab active" data-step="breathe">🫁 Respirar</button>
            <button class="sos-tab" data-step="ground">🧘 Grounding</button>
            <button class="sos-tab" data-step="distract">⚡ Distracción</button>
            <button class="sos-tab" data-step="chat">💬 Coach</button>
          </div>

          <!-- STEP 1: Breathing -->
          <div class="sos-step active" id="sos-breathe">
            <div class="sos-breath-circle" id="breath-circle">
              <div class="sos-breath-text" id="breath-text">Empezar</div>
              <div class="sos-breath-count" id="breath-count"></div>
            </div>
            <div class="sos-timer">
              <span>⏱️ El craving dura ~15 min. Llevas </span>
              <span class="sos-timer-value" id="sos-timer">0:00</span>
            </div>
            <p class="sos-hint">Técnica 4-7-8: Inhala 4s → Aguanta 7s → Exhala 8s</p>
            <button class="btn-primary" id="btn-start-breathe">🫁 Empezar respiración</button>
          </div>

          <!-- STEP 2: Grounding 5-4-3-2-1 -->
          <div class="sos-step" id="sos-ground">
            <h3 class="sos-step-title">Técnica 5-4-3-2-1</h3>
            <p class="sos-desc">Conecta con tu entorno ahora mismo:</p>
            <div class="sos-grounding-list">
              <div class="sos-ground-item">
                <span class="sos-ground-num">5</span>
                <span>cosas que puedes <strong>VER</strong> 👀</span>
              </div>
              <div class="sos-ground-item">
                <span class="sos-ground-num">4</span>
                <span>cosas que puedes <strong>TOCAR</strong> ✋</span>
              </div>
              <div class="sos-ground-item">
                <span class="sos-ground-num">3</span>
                <span>cosas que puedes <strong>OÍR</strong> 👂</span>
              </div>
              <div class="sos-ground-item">
                <span class="sos-ground-num">2</span>
                <span>cosas que puedes <strong>OLER</strong> 👃</span>
              </div>
              <div class="sos-ground-item">
                <span class="sos-ground-num">1</span>
                <span>cosa que puedes <strong>SABOREAR</strong> 👅</span>
              </div>
            </div>
            <p class="sos-hint">Tómate tu tiempo. Nombra cada cosa en voz alta.</p>
          </div>

          <!-- STEP 3: Distraction -->
          <div class="sos-step" id="sos-distract">
            <h3 class="sos-step-title">⚡ Acción rápida</h3>
            <p class="sos-desc">Elige una y hazla AHORA:</p>
            <div class="sos-actions-grid" id="sos-actions">
              <button class="sos-action-card" data-action="walk">
                <span class="sos-action-icon">🚶</span>
                <span class="sos-action-text">Sal a andar 5 min</span>
              </button>
              <button class="sos-action-card" data-action="water">
                <span class="sos-action-icon">💧</span>
                <span class="sos-action-text">Bebe un vaso de agua fría</span>
              </button>
              <button class="sos-action-card" data-action="pushups">
                <span class="sos-action-icon">💪</span>
                <span class="sos-action-text">Haz 20 flexiones</span>
              </button>
              <button class="sos-action-card" data-action="call">
                <span class="sos-action-icon">📞</span>
                <span class="sos-action-text">Llama a alguien</span>
              </button>
              <button class="sos-action-card" data-action="shower">
                <span class="sos-action-icon">🚿</span>
                <span class="sos-action-text">Ducha de agua fría</span>
              </button>
              <button class="sos-action-card" data-action="music">
                <span class="sos-action-icon">🎵</span>
                <span class="sos-action-text">Pon tu canción favorita</span>
              </button>
            </div>
          </div>

          <!-- STEP 4: Quick chat -->
          <div class="sos-step" id="sos-chat">
            <h3 class="sos-step-title">💬 Chat express con Verde</h3>
            <div class="sos-chat-messages" id="sos-chat-messages">
              <div class="chat-bubble assistant">
                Estoy aquí contigo. Cuéntame qué está pasando 💚
              </div>
            </div>
            <div class="chat-input-area">
              <textarea class="chat-input" id="sos-chat-input" placeholder="Escribe cómo te sientes..." rows="1"></textarea>
              <button class="chat-send" id="sos-chat-send">→</button>
            </div>
          </div>

          <!-- Final: I resisted! -->
          <div class="sos-footer">
            <button class="btn-primary sos-resist-btn" id="btn-resisted">
              💪 ¡Lo he resistido!
            </button>
          </div>
        </div>
      </div>
    `;
  },

  open() {
    const overlay = document.getElementById('sos-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.classList.add('visible');
    SOSPage.seconds = 0;
    SOSPage.startTimer();
    SOSPage.bindEvents();
    SOSPage.switchStep('breathe');
  },

  close() {
    const overlay = document.getElementById('sos-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('visible');
    SOSPage.stopTimer();
    SOSPage.stopBreathing();
  },

  bindEvents() {
    // Close
    document.getElementById('sos-close')?.addEventListener('click', () => SOSPage.close());

    // Tabs
    document.querySelectorAll('.sos-tab').forEach(tab => {
      tab.addEventListener('click', () => SOSPage.switchStep(tab.dataset.step));
    });

    // Start breathing
    document.getElementById('btn-start-breathe')?.addEventListener('click', () => SOSPage.startBreathing());

    // Distraction actions
    document.querySelectorAll('.sos-action-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.sos-action-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        App.showToast(`💪 ¡Hazlo ahora! ${card.querySelector('.sos-action-text').textContent}`, 'success');
      });
    });

    // Chat send
    document.getElementById('sos-chat-send')?.addEventListener('click', () => SOSPage.sendSOSMessage());
    document.getElementById('sos-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        SOSPage.sendSOSMessage();
      }
    });

    // Resisted button
    document.getElementById('btn-resisted')?.addEventListener('click', () => SOSPage.markResisted());
  },

  switchStep(step) {
    document.querySelectorAll('.sos-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sos-step').forEach(s => s.classList.remove('active'));
    document.querySelector(`.sos-tab[data-step="${step}"]`)?.classList.add('active');
    document.getElementById(`sos-${step}`)?.classList.add('active');
  },

  startTimer() {
    SOSPage.timer = setInterval(() => {
      SOSPage.seconds++;
      const min = Math.floor(SOSPage.seconds / 60);
      const sec = SOSPage.seconds % 60;
      const el = document.getElementById('sos-timer');
      if (el) el.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    }, 1000);
  },

  stopTimer() {
    if (SOSPage.timer) {
      clearInterval(SOSPage.timer);
      SOSPage.timer = null;
    }
  },

  startBreathing() {
    const circle = document.getElementById('breath-circle');
    const text = document.getElementById('breath-text');
    const count = document.getElementById('breath-count');
    const btn = document.getElementById('btn-start-breathe');

    if (SOSPage.breathingInterval) {
      SOSPage.stopBreathing();
      return;
    }

    btn.textContent = '⏹️ Parar';
    let phase = 0; // 0=inhale, 1=hold, 2=exhale
    let counter = 0;
    const durations = [4, 7, 8]; // 4-7-8 technique
    const labels = ['Inhala...', 'Aguanta...', 'Exhala...'];
    const classes = ['inhale', 'hold', 'exhale'];

    const tick = () => {
      if (counter <= 0) {
        phase = (phase + 1) % 3;
        counter = durations[phase];
        circle.className = `sos-breath-circle ${classes[phase]}`;
      }
      text.textContent = labels[phase];
      count.textContent = counter;
      counter--;
    };

    tick();
    SOSPage.breathingInterval = setInterval(tick, 1000);
  },

  stopBreathing() {
    if (SOSPage.breathingInterval) {
      clearInterval(SOSPage.breathingInterval);
      SOSPage.breathingInterval = null;
    }
    const circle = document.getElementById('breath-circle');
    const text = document.getElementById('breath-text');
    const count = document.getElementById('breath-count');
    const btn = document.getElementById('btn-start-breathe');
    if (circle) circle.className = 'sos-breath-circle';
    if (text) text.textContent = 'Empezar';
    if (count) count.textContent = '';
    if (btn) btn.textContent = '🫁 Empezar respiración';
  },

  async sendSOSMessage() {
    const input = document.getElementById('sos-chat-input');
    const container = document.getElementById('sos-chat-messages');
    if (!input || !container) return;

    const message = input.value.trim();
    if (!message) return;

    // Add user bubble
    container.innerHTML += `<div class="chat-bubble user">${message}</div>`;
    input.value = '';
    container.scrollTop = container.scrollHeight;

    // Typing indicator
    container.innerHTML += `<div class="typing-indicator visible" id="sos-typing">
      <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
    </div>`;
    container.scrollTop = container.scrollHeight;

    try {
      const data = await API.sendSOSMessage(message);
      document.getElementById('sos-typing')?.remove();
      container.innerHTML += `<div class="chat-bubble assistant">${data.reply}</div>`;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      document.getElementById('sos-typing')?.remove();
      container.innerHTML += `<div class="chat-bubble assistant">No puedo conectar ahora. Pero recuerda: el craving pasará en unos minutos. Respira profundo 💚</div>`;
      container.scrollTop = container.scrollHeight;
    }
  },

  async markResisted() {
    try {
      await API.addCraving({
        intensity: 8,
        trigger: 'SOS Mode activado',
        strategy: `Resistido tras ${Math.floor(SOSPage.seconds / 60)}:${(SOSPage.seconds % 60).toString().padStart(2, '0')} minutos`,
        resisted: true,
      });

      SOSPage.close();

      // Confetti effect
      SOSPage.showConfetti();
      App.showToast('🎉 ¡INCREÍBLE! Has resistido el craving. Eres más fuerte que la adicción.', 'success');
    } catch (err) {
      SOSPage.close();
      App.showToast('💪 ¡Lo has resistido!', 'success');
    }
  },

  showConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    const emojis = ['🎉', '💪', '⭐', '🌿', '🔥', '💚', '✨'];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = Math.random() * 100 + '%';
      el.style.animationDelay = Math.random() * 0.5 + 's';
      el.style.fontSize = (16 + Math.random() * 16) + 'px';
      container.appendChild(el);
    }
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 3000);
  },
};
