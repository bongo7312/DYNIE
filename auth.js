// Wyodrębniona logika logowania Discord i zarządzania trybem edycji
(function () {
  const STORAGE_EDITOR_KEY = 'gta_sa_is_editor';
  const STORAGE_TOKEN_KEY = 'discord_access_token';
  const STORAGE_TOKEN_EXP_KEY = 'discord_access_token_exp_ms';
  const STORAGE_USER_KEY = 'discord_user';
  const STORAGE_OAUTH_STATE = 'discord_oauth_state';

  function getQueryParam(name) {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get(name);
    } catch (_) { return null; }
  }
  function getStored(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function getDiscordClientId() {
    // Domyślna wartość ustawiona zgodnie z Twoją aplikacją Discord
    return getQueryParam('dcid') || getStored('discord_client_id') || '1440102111848300615';
  }
  function getDiscordRedirectUri() {
    // Domyślna wartość ustawiona na wskazany adres
    return getQueryParam('redirect_uri') || getStored('discord_redirect_uri') || 'https://bongo7312.github.io/DYNIE';
  }
  const DISCORD_CLIENT_ID = getDiscordClientId();
  const DISCORD_REDIRECT_URI = getDiscordRedirectUri();
  const DISCORD_SCOPES = ['identify','guilds','guilds.members.read'];
  // Whitelist edytorów — tylko te ID Discord mogą włączać tryb edycji przez logowanie
  const ALLOWED_EDITOR_IDS = ['812428903230079037','410904692256800768'];
  const REQUIRED_ROLE_IDS = ['1435742952319090708','1232458108916334733'];
  function getGuildId() {
    return getQueryParam('guild_id') || getStored('discord_guild_id') || '1225560157157588992';
  }

  // UI referencje
  const editToggleBtn = document.getElementById('editToggleBtn');
  const discordLogoutBtn = document.getElementById('discordLogoutBtn');
  const userIndicator = document.getElementById('userIndicator');

  function buildDiscordAuthUrl() {
    const badClientId = !DISCORD_CLIENT_ID || !/^\d{17,20}$/.test(DISCORD_CLIENT_ID);
    const badRedirect = !DISCORD_REDIRECT_URI || !/^https?:\/\//i.test(DISCORD_REDIRECT_URI);
    if (badClientId || badRedirect) {
      const msg = badClientId
        ? 'Brak/niepoprawny Discord Client ID (ustaw ?dcid= lub localStorage).'
        : 'Niepoprawny Redirect URI (ustaw ?redirect_uri= lub localStorage).';
      if (userIndicator) userIndicator.textContent = msg;
      throw new Error(msg);
    }
    const params = new URLSearchParams();
    params.set('client_id', DISCORD_CLIENT_ID);
    params.set('redirect_uri', DISCORD_REDIRECT_URI);
    params.set('response_type', 'token');
    params.set('scope', DISCORD_SCOPES.join(' '));
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem(STORAGE_OAUTH_STATE, state); } catch (_) {}
    params.set('state', state);
    params.set('prompt', 'consent');
    return 'https://discord.com/oauth2/authorize?' + params.toString();
  }

  async function fetchGuildMemberRoles(token) {
    const gid = getGuildId();
    if (!gid) throw new Error('Brak GUILD_ID');
    const url = 'https://discord.com/api/users/@me/guilds/' + gid + '/member';
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new Error('Guild member fetch failed');
    const json = await res.json();
    return Array.isArray(json.roles) ? json.roles.map(String) : [];
  }

  async function fetchUserGuilds(token) {
    const res = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Guilds fetch failed');
    return await res.json();
  }

  function getStoredToken() {
    try {
      const token = localStorage.getItem(STORAGE_TOKEN_KEY);
      const exp = Number(localStorage.getItem(STORAGE_TOKEN_EXP_KEY) || 0);
      if (token && exp && Date.now() < exp) return token;
    } catch (_) {}
    return null;
  }
  async function fetchDiscordUser(token) {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Discord user fetch failed');
    return await res.json();
  }

  function updateAuthUI() {
    const token = getStoredToken();
    let user = null;
    try { const raw = localStorage.getItem(STORAGE_USER_KEY); if (raw) user = JSON.parse(raw); } catch (_) {}
    if (discordLogoutBtn) discordLogoutBtn.classList.toggle('hidden', !token);
    if (userIndicator) {
      if (user) {
        const allowed = ALLOWED_EDITOR_IDS.includes(String(user.id));
        if (allowed) {
          userIndicator.textContent = `Zalogowany: ${user.username}#${user.discriminator || ''}`;
        } else {
          userIndicator.textContent = 'Brak whitelisty do edytowania';
        }
      } else if (!DISCORD_CLIENT_ID || !/^\d{17,20}$/.test(DISCORD_CLIENT_ID) || !DISCORD_REDIRECT_URI) {
        userIndicator.textContent = 'Skonfiguruj Discord OAuth (Client ID i Redirect URI).';
      } else {
        userIndicator.textContent = '';
      }
    }
    try { window.dispatchEvent(new Event('discordUserUpdated')); } catch (_) {}
  }

  function clearDiscordAuth() {
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_TOKEN_EXP_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch (_) {}
    updateAuthUI();
    try { window.dispatchEvent(new Event('discordUserUpdated')); } catch (_) {}
    window.setEditorMode?.(false);
    window.setAuthorized?.(false);
    window.setAuthGateMessage?.('Zaloguj się przez Discord, aby kontynuować.');
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}
    try { document.cookie.split(';').forEach(c => { document.cookie = c.replace(/^\s*/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'); }); } catch (_) {}
    try {
      setTimeout(() => {
        try {
          const url = window.location.pathname + window.location.search;
          window.location.replace(url);
        } catch (_) {
          try { window.history.go(0); } catch (_) {}
        }
      }, 10);
    } catch (_) {}
  }

  async function handleDiscordRedirect() {
    if (!location.hash) { updateAuthUI(); return; }
    const hash = new URLSearchParams(location.hash.slice(1));
    const accessToken = hash.get('access_token');
    const tokenType = hash.get('token_type');
    const expiresIn = Number(hash.get('expires_in') || 0);
    const stateParam = hash.get('state');
    if (!accessToken || tokenType !== 'Bearer') { updateAuthUI(); return; }
    try {
      const stored = localStorage.getItem(STORAGE_OAUTH_STATE);
      if (stored && stateParam !== stored) {
        console.warn('Discord state mismatch');
      }
      localStorage.removeItem(STORAGE_OAUTH_STATE);
    } catch (_) {}
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
      localStorage.setItem(STORAGE_TOKEN_EXP_KEY, String(Date.now() + expiresIn * 1000));
    } catch (_) {}
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    try {
      const user = await fetchDiscordUser(accessToken);
      try { localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user)); } catch (_) {}
      updateAuthUI();
      try { window.dispatchEvent(new Event('discordUserUpdated')); } catch (_) {}
      try {
        const roles = await fetchGuildMemberRoles(accessToken);
        const ok = roles.some(r => REQUIRED_ROLE_IDS.includes(String(r)));
        if (ok) {
          window.setAuthorized?.(true);
        } else {
          window.setAuthorized?.(false);
          window.setAuthGateMessage?.('Nie posiadasz wymaganej rangi aby ją otrzymać to stań na wiadomo czym.');
        }
      } catch (e) {
        // Fallback: sprawdź członkostwo w serwerze
        try {
          const gid = getGuildId();
          const guilds = await fetchUserGuilds(accessToken);
          const inGuild = Array.isArray(guilds) && guilds.some(g => String(g.id) === String(gid));
          if (inGuild) {
            window.setAuthorized?.(true);
          } else {
            window.setAuthorized?.(false);
            window.setAuthGateMessage?.('Nie wykryto członkostwa w serwerze. Dołącz do serwera lub skonfiguruj GUILD_ID.');
          }
        } catch (_) {
          window.setAuthorized?.(false);
          window.setAuthGateMessage?.('Autoryzacja wymaga konfiguracji GUILD_ID lub odpowiednich uprawnień.');
        }
      }
      if (ALLOWED_EDITOR_IDS.includes(String(user.id))) {
        window.setEditorMode?.(true);
      }
    } catch (err) {
      clearDiscordAuth();
    }
  }

  // Zdarzenia UI
  editToggleBtn?.addEventListener('click', () => {
    const isEditor = localStorage.getItem(STORAGE_EDITOR_KEY) === '1';
    if (isEditor) {
      window.setEditorMode?.(false);
      return;
    }
    try {
      const url = buildDiscordAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.warn('Discord OAuth nie skonfigurowany, użyję hasła edycji:', err);
      window.openRoleOverlay?.();
    }
  });
  window.beginDiscordOAuth = () => {
    try { window.location.href = buildDiscordAuthUrl(); } catch (e) { console.warn(e); }
  };
  discordLogoutBtn?.addEventListener('click', () => {
    clearDiscordAuth();
  });

  // Start
  updateAuthUI();
  handleDiscordRedirect();
  try {
    const tok = getStoredToken();
    if (!tok) {
      window.setAuthorized?.(false);
      window.setAuthGateMessage?.('Zaloguj się przez Discord, aby kontynuować.');
    }
  } catch (_) {}
})();
