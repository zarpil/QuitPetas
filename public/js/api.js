// ═══════════ API CLIENT ═══════════
const API = {
  BASE: '',
  
  getToken() {
    return localStorage.getItem('qp_token');
  },

  setToken(token) {
    localStorage.setItem('qp_token', token);
  },

  setUser(user) {
    localStorage.setItem('qp_user', JSON.stringify(user));
  },

  getUser() {
    const u = localStorage.getItem('qp_user');
    return u ? JSON.parse(u) : null;
  },

  logout() {
    localStorage.removeItem('qp_token');
    localStorage.removeItem('qp_user');
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${this.BASE}${path}`, opts);
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        this.logout();
        window.location.reload();
      }
      throw new Error(data.error || 'Error en la petición');
    }
    return data;
  },

  // Auth & Profile
  register(data) { return this.request('POST', '/api/auth/register', data); },
  login(data) { return this.request('POST', '/api/auth/login', data); },
  getMe() { return this.request('GET', '/api/auth/me'); },
  updateProfile(data) { return this.request('PUT', '/api/profile', data); },
  deleteProfile() { return this.request('DELETE', '/api/profile'); },

  // Notifications
  getVapidKey() { return this.request('GET', '/api/notifications/vapidPublicKey'); },
  subscribePush(sub) { return this.request('POST', '/api/notifications/subscribe', sub); },

  // Onboarding
  saveOnboarding(data) { return this.request('POST', '/api/onboarding', data); },

  // Progress
  getProgress() { return this.request('GET', '/api/progress'); },
  getChartData() { return this.request('GET', '/api/progress/chart'); },
  checkIn(data) { return this.request('POST', '/api/progress/checkin', data); },

  // Cravings
  getCravings() { return this.request('GET', '/api/cravings'); },
  getCravingStats() { return this.request('GET', '/api/cravings/stats'); },
  addCraving(data) { return this.request('POST', '/api/cravings', data); },

  // Journal
  getJournal() { return this.request('GET', '/api/journal'); },
  addJournal(data) { return this.request('POST', '/api/journal', data); },
  deleteJournal(id) { return this.request('DELETE', `/api/journal/${id}`); },

  // Chat
  sendMessage(message) { return this.request('POST', '/api/chat', { message }); },
  sendSOSMessage(message) { return this.request('POST', '/api/chat', { message, mode: 'sos' }); },
  getChatHistory() { return this.request('GET', '/api/chat/history'); },

  // Achievements
  getAchievements() { return this.request('GET', '/api/achievements'); },

  // Smoking logs
  getSmokingLogs() { return this.request('GET', '/api/smoking'); },
  getSmokingStats() { return this.request('GET', '/api/smoking/stats'); },
  logSmoke(data) { return this.request('POST', '/api/smoking', data); },

  // Groups (Social)
  getGroups() { return this.request('GET', '/api/groups'); },
  getGroupDetails(id) { return this.request('GET', `/api/groups/${id}`); },
  createGroup(name) { return this.request('POST', '/api/groups', { name }); },
  joinGroup(joinCode) { return this.request('POST', '/api/groups/join', { joinCode }); },
};
