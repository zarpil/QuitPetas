// ═══════════ PROFILE PAGE ═══════════
const ProfilePage = {
  render() {
    return `
      <div class="page" id="page-profile">
        <div class="page-header">
          <div class="page-title">⚙️ Perfil y Ajustes</div>
          <div class="page-subtitle">Modifica tus datos o cierra sesión</div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">🩺 Tu Plan Clínico</h3>
          <div id="profile-clinical-plan">
             <div style="text-align:center; padding:20px; color:var(--text-secondary);">Cargando plan...</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">Tus Datos de Consumo</h3>
          
          <div class="input-group" style="margin-bottom:12px;">
            <label>Tipo de sustancia</label>
            <div class="toggle-group" id="prof-substance">
              <button class="toggle-btn" data-val="marihuana">🌿 María</button>
              <button class="toggle-btn" data-val="hachis">🟤 Hachís</button>
              <button class="toggle-btn" data-val="ambos">🔄 Ambos</button>
            </div>
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Cuántas petas al día? (aprox)</label>
            <input type="number" class="input-field" id="prof-daily" step="0.5" min="0">
          </div>
          
          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Gramos por peta? (aprox)</label>
            <input type="number" class="input-field" id="prof-grams" step="0.05" min="0">
          </div>
          
          <div class="input-group" style="margin-bottom:12px;">
            <label>¿Precio por gramo? (€)</label>
            <input type="number" class="input-field" id="prof-price" step="0.5" min="0">
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">Tu Motivación</h3>
          <div class="input-group">
            <label>¿Por qué quieres dejarlo?</label>
            <textarea class="journal-textarea" id="prof-motivation" style="min-height:80px;"></textarea>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">Tus Notificaciones</h3>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">Activa las notificaciones push para recibir recordatorios diarios de check-in y mensajes del coach.</p>
          <button class="btn-primary" id="btn-enable-push" style="background:#2ecc71;">
            🔔 Habilitar Notificaciones
          </button>
        </div>

        <button class="btn-primary" id="btn-save-profile" style="margin-bottom:20px;">
          💾 Guardar Cambios
        </button>

        <button class="btn-primary" id="btn-logout" style="background:var(--bg-input); color:var(--text-primary); border:1px solid var(--border); width:100%; margin-bottom:20px;">
          🚪 Cerrar Sesión
        </button>

        <div class="card" style="border:1px solid rgba(255, 77, 77, 0.3); background:rgba(255, 77, 77, 0.05);">
          <h3 style="color:var(--danger); margin-bottom:8px;">⚠️ Zona de Peligro</h3>
          <p style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">Eliminar tu cuenta borrará permanentemente todo tu progreso, racha, diarios y mensajes del coach. Esta acción no se puede deshacer.</p>
          <button class="btn-primary" id="btn-delete-account" style="background:var(--danger); color:white; width:100%; font-size:13px; padding:10px;">
            Eliminar mi cuenta definitivamente
          </button>
        </div>
      </div>
    `;
  },

  async load() {
    let user = API.getUser();
    if (!user) return;

    // Fetch fresh user data directly from DB to get the live planType
    try {
      const freshUser = await API.getMe();
      if (freshUser) {
        user = freshUser;
        API.setUser(user); // Sync local cache
      }
    } catch(e) {
      console.warn('Could not fetch fresh profile data', e);
    }

    // Poblar campos
    document.getElementById('prof-daily').value = user.dailyJoints || '';
    document.getElementById('prof-grams').value = user.gramsPerJoint || '';
    document.getElementById('prof-price').value = user.pricePerGram || '';
    document.getElementById('prof-motivation').value = user.motivation || '';

    // Clinical Plan Info
    const planDiv = document.getElementById('profile-clinical-plan');
    if (planDiv) {
      let planName = '🧊 De Golpe (Cold Turkey)';
      let planDesc = 'Abstinencia total. Tu objetivo es mantener el medidor de petas fumados a cero absoluto.';
      if (user.planType === 'TAPER_FREQ') {
        planName = '📉 Reducción Gradual (Cantidad)';
        planDesc = `Tu cuerpo se está adaptando. Empezaste con ${user.dailyJoints || '?'} petas/día. Estás reduciendo 1 peta por semana automáticamente.`;
      } else if (user.planType === 'TAPER_GRAMS') {
        planName = '⚖️ Bajar Dosis (Gramos)';
        planDesc = `Mantienes el hábito físico pero reduces toxicidad. Empezaste con ${user.gramsPerJoint || '?'}g/peta. Reduces 0.1g por semana automáticamente.`;
      }

      planDiv.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="background:var(--bg-card); padding:12px; border-radius:var(--radius-sm); border-left:3px solid var(--primary);">
            <div style="font-size:11px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Estrategia Activa</div>
            <div style="font-size:16px; font-weight:600; margin-top:4px;">${planName}</div>
            <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">${planDesc}</div>
          </div>
          <div style="background:var(--bg-card); padding:12px; border-radius:var(--radius-sm); border-left:3px solid var(--danger);">
            <div style="font-size:11px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Detonante Histórico (Riesgo)</div>
            <div style="font-size:16px; font-weight:600; margin-top:4px; text-transform:capitalize;">${user.previousRelapseCause || 'No especificado'}</div>
          </div>
        </div>
      `;
    }

    let substance = user.substanceType || 'marihuana';

    const renderSubstanceToggle = () => {
      document.querySelectorAll('#prof-substance .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === substance);
        btn.onclick = () => {
          substance = btn.dataset.val;
          renderSubstanceToggle();
        };
      });
    };
    renderSubstanceToggle();

    // Guardar cambios
    document.getElementById('btn-save-profile').onclick = async () => {
      const btn = document.getElementById('btn-save-profile');
      btn.disabled = true;
      btn.textContent = 'Guardando...';
      try {
        const data = {
          substanceType: substance,
          dailyJoints: document.getElementById('prof-daily').value,
          gramsPerJoint: document.getElementById('prof-grams').value,
          pricePerGram: document.getElementById('prof-price').value,
          motivation: document.getElementById('prof-motivation').value
        };
        const updatedUser = await API.updateProfile(data);
        API.setUser(updatedUser);
        App.showToast('✅ Perfil actualizado correctamente', 'success');
      } catch (err) {
        App.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '💾 Guardar Cambios';
      }
    };

    // Notificaciones Push
    const btnPush = document.getElementById('btn-enable-push');
    
    // Check if supported and requested
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      btnPush.style.display = 'none';
    } else if (Notification.permission === 'granted') {
      btnPush.textContent = '✅ Notificaciones Activadas';
      btnPush.disabled = true;
      btnPush.style.background = 'var(--bg-card)';
      btnPush.style.color = 'var(--text-secondary)';
    }

    btnPush.onclick = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Permiso denegado');

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          const res = await API.getVapidKey();
          
          // Helper para convertir la base64 VAPID key
          const urlBase64ToUint8Array = (base64String) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
            return outputArray;
          };

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(res.publicKey)
          });
        }

        // Send to backend
        await API.subscribePush(subscription.toJSON());
        App.showToast('✅ Notificaciones habilitadas', 'success');
        
        btnPush.textContent = '✅ Notificaciones Activadas';
        btnPush.disabled = true;
        btnPush.style.background = 'var(--bg-card)';
        btnPush.style.color = 'var(--text-secondary)';

      } catch (err) {
        App.showToast('Error al habilitar notificaciones', 'error');
        console.error(err);
      }
    };

    // Logout
    document.getElementById('btn-logout').onclick = () => {
      if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        API.logout();
        window.location.reload();
      }
    };

    // Delete Account
    document.getElementById('btn-delete-account').onclick = async () => {
      const confirmed = confirm('¿ESTÁS SEGURO? Se borrarán todos tus datos permanentemente.');
      if (confirmed) {
        const finalConfirmed = confirm('Esta es la última advertencia. ¿Realmente quieres eliminar tu cuenta de QuitPetas?');
        if (finalConfirmed) {
          try {
            await API.deleteProfile();
            API.logout();
            window.location.reload();
          } catch (err) {
            App.showToast(err.message, 'error');
          }
        }
      }
    };
  }
};
