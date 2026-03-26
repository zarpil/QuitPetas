// ═══════════ COACH / CHAT PAGE ═══════════
const CoachPage = {
  render() {
    return `
      <div class="page" id="page-coach">
        <div class="page-header">
          <div class="page-title">🤖 Coach Verde</div>
          <div class="page-subtitle">Tu asistente personal para dejar de fumar</div>
        </div>

        <div class="chat-container">
          <div class="chat-messages" id="chat-messages">
            <div class="chat-bubble assistant">
              ¡Hola! 👋 Soy <strong>Verde</strong>, tu coach personal. Estoy aquí para ayudarte en tu camino para dejar los porros. ¿En qué puedo ayudarte hoy?
            </div>
          </div>

          <div class="typing-indicator" id="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>

          <div class="chat-input-area">
            <textarea class="chat-input" id="chat-input" placeholder="Escribe tu mensaje..." rows="1"></textarea>
            <button class="chat-send" id="chat-send" title="Enviar">➤</button>
          </div>
        </div>
      </div>
    `;
  },

  async load() {
    const messagesEl = document.getElementById('chat-messages');
    const inputEl = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const typingEl = document.getElementById('typing-indicator');

    // Load history
    try {
      const history = await API.getChatHistory();
      if (history.length > 0) {
        messagesEl.innerHTML = '';
        history.forEach(msg => {
          CoachPage.addBubble(msg.role, msg.content, msg.createdAt);
        });
        CoachPage.scrollToBottom();
      }
    } catch (err) {
      console.error('Chat history error:', err);
    }

    // Auto-resize input
    inputEl.oninput = () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
    };

    // Enter to send
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        CoachPage.sendMessage();
      }
    };

    sendBtn.onclick = () => CoachPage.sendMessage();
  },

  async sendMessage() {
    const inputEl = document.getElementById('chat-input');
    const typingEl = document.getElementById('typing-indicator');
    const sendBtn = document.getElementById('chat-send');
    const message = inputEl.value.trim();

    if (!message) return;

    // Add user bubble
    CoachPage.addBubble('user', message);
    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendBtn.disabled = true;

    // Show typing
    typingEl.classList.add('visible');
    CoachPage.scrollToBottom();

    try {
      const data = await API.sendMessage(message);
      typingEl.classList.remove('visible');
      CoachPage.addBubble('assistant', data.reply);
      CoachPage.scrollToBottom();
    } catch (err) {
      typingEl.classList.remove('visible');
      CoachPage.addBubble('assistant', '❌ Lo siento, ha habido un error. Inténtalo de nuevo.');
      console.error('Chat error:', err);
    }

    sendBtn.disabled = false;
    inputEl.focus();
  },

  addBubble(role, content, timestamp = null) {
    const messagesEl = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;

    const time = timestamp ? new Date(timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

    bubble.innerHTML = `${CoachPage.formatText(content)}<span class="time">${time}</span>`;
    messagesEl.appendChild(bubble);
    CoachPage.scrollToBottom();
  },

  formatText(text) {
    // Basic markdown-like formatting combined with XSS sanitization
    const sanitized = DOMPurify.sanitize(text);
    return sanitized
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  },

  scrollToBottom() {
    const el = document.getElementById('chat-messages');
    if (el) {
      setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
    }
  }
};
