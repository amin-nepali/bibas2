(function () {
  const loginScreen = document.getElementById('loginScreen');
  const appShell = document.getElementById('appShell');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginAttemptsBanner = document.getElementById('loginAttempts');
  const attemptValue = document.getElementById('attemptValue');
  const loginButton = document.getElementById('loginButton');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminOpenBtn = document.getElementById('adminOpenBtn');
  const sessionUsername = document.getElementById('sessionUsername');
  const timeLeftBadge = document.getElementById('timeLeftBadge');

  const adminPanel = document.getElementById('adminPanel');
  const closeAdminBtn = document.getElementById('closeAdminBtn');
  const createUserForm = document.getElementById('createUserForm');
  const refreshCustomersBtn = document.getElementById('refreshCustomersBtn');
  const deleteExpiredBtn = document.getElementById('deleteExpiredBtn');
  const usersList = document.getElementById('usersList');
  const adminSearchInput = document.getElementById('adminSearchInput');
  const adminEmptyState = document.getElementById('adminEmptyState');
  const totalUsersStat = document.getElementById('totalUsersStat');
  const activeUsersStat = document.getElementById('activeUsersStat');
  const waitingUsersStat = document.getElementById('waitingUsersStat');
  const expiringUsersStat = document.getElementById('expiringUsersStat');

  // Offline admin mode removed - always use server authentication

  let loginAttempts = 0;
  let countdownInterval = null;
  let heartbeatInterval = null;
  let customerRefreshInterval = null;
  let currentUser = null;
  let cachedUsers = [];

  const API_BASE = '';

  const AUTH_ENDPOINTS = {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    status: '/api/auth/status',
    users: '/api/users',
  };

  const apiUrl = (path) => `${API_BASE}${path}`;

  function generateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).slice(2) + '_' + Date.now();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  function updateAttemptsUI() {
    if (!attemptValue || !loginAttemptsBanner) return;
    attemptValue.textContent = loginAttempts.toString();
    if (loginAttempts > 0) {
      loginAttemptsBanner.classList.remove('hidden');
    } else {
      loginAttemptsBanner.classList.add('hidden');
    }
  }

  // Removed offline admin mode

  function showLoginError(message) {
    if (!loginError) return;
    loginError.textContent = message;
    loginError.classList.remove('hidden');
  }

  function clearLoginError() {
    if (!loginError) return;
    loginError.classList.add('hidden');
    loginError.textContent = '';
  }

  function formatTimeLeft(milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
      return 'Expired';
    }
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days >= 30) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      return remainingDays
        ? `${months}mo ${remainingDays}d`
        : `${months}mo`;
    }
    if (days > 0) {
      const remainingHours = hours % 24;
      return remainingHours
        ? `${days}d ${remainingHours}h`
        : `${days}d`;
    }
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
    }
    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return remainingSeconds
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }
    return `${seconds}s`;
  }

  function formatDurationLabel(durationMinutes = 30) {
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return '30 minutes';
    }
    if (durationMinutes >= 1440) {
      const days = durationMinutes / 1440;
      if (days >= 30) {
        const months = days / 30;
        return `${months >= 12 ? (months / 12).toFixed(1) + ' years' : months.toFixed(1) + ' months'}`;
      }
      return `${days.toFixed(1)} days`;
    }
    if (durationMinutes >= 60) {
      const hours = durationMinutes / 60;
      return `${hours.toFixed(1)} hours`;
    }
    return `${durationMinutes} minutes`;
  }

  function stopCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function startCountdown(expiresAt) {
    stopCountdown();

    if (!timeLeftBadge) return;

    if (!expiresAt) {
      timeLeftBadge.textContent = 'Awaiting activation';
      timeLeftBadge.classList.remove('hidden');
      return;
    }

    const expiry = new Date(expiresAt).getTime();

    function tick() {
      const diff = expiry - Date.now();
      if (diff <= 0) {
        timeLeftBadge.textContent = 'Expired';
        stopCountdown();
        handleUnauthenticated();
        return;
      }
      timeLeftBadge.textContent = `Time left: ${formatTimeLeft(diff)}`;
      timeLeftBadge.classList.remove('hidden');
    }

    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  async function performLogin(username, password) {
    try {
      const response = await fetch(apiUrl(AUTH_ENDPOINTS.login), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, deviceId: generateDeviceId() }),
      });

      const data = await response.json();

      if (!response.ok) {
        loginAttempts += 1;
        updateAttemptsUI();

        if (response.status === 429) {
          showLoginError(data.error || 'Too many attempts. Try again shortly.');
        } else {
          showLoginError(data.error || 'Invalid username or password');
        }
        return false;
      }

      loginAttempts = 0;
      updateAttemptsUI();
      clearLoginError();
      await fetchAuthStatus();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      showLoginError('Network issue. Please try again.');
      return false;
    }
  }

  async function handleLogout() {
    try {
      await fetch(apiUrl(AUTH_ENDPOINTS.logout), {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Logout error:', error);
    }
    localStorage.removeItem('deviceId');
    
    // Close admin panel if open before logging out
    if (adminPanel && adminPanel.classList.contains('active')) {
      adminPanel.classList.remove('active');
      document.body.style.overflow = '';
      if (customerRefreshInterval) {
        clearInterval(customerRefreshInterval);
        customerRefreshInterval = null;
      }
    }
    
    handleUnauthenticated();
  }

  function handleAuthenticated(user) {
    currentUser = user;
    if (loginScreen) loginScreen.classList.add('hidden');

    // If user is admin, show admin panel directly instead of pay shell
    if (user.role === 'admin') {
      if (appShell) appShell.classList.add('hidden');
      openAdminPanel();
      return;
    }

    // Regular customer: show pay shell
    if (appShell) appShell.classList.remove('hidden');

    if (sessionUsername) {
      sessionUsername.textContent = `@${user.username}`;
      sessionUsername.classList.remove('hidden');
    }

    if (logoutBtn) {
      logoutBtn.classList.remove('hidden');
    }

    if (adminOpenBtn) {
      if (user.role === 'admin') {
        adminOpenBtn.classList.remove('hidden');
      } else {
        adminOpenBtn.classList.add('hidden');
      }
    }

    if (user.role === 'admin') {
      stopCountdown();
      if (timeLeftBadge) {
        timeLeftBadge.textContent = 'Admin access';
        timeLeftBadge.classList.remove('hidden');
      }
    } else if (user.expiresAt) {
      startCountdown(user.expiresAt);
      // Dispatch event for popup notification with time left
      const timeLeft = formatTimeLeft(new Date(user.expiresAt).getTime() - Date.now());
      window.dispatchEvent(new CustomEvent('userAuthenticated', {
        detail: { timeLeft: timeLeft }
      }));
    } else if (timeLeftBadge) {
      timeLeftBadge.textContent = 'Activates on first login';
      timeLeftBadge.classList.remove('hidden');
    }

    if (!heartbeatInterval) {
      heartbeatInterval = setInterval(fetchAuthStatus, 15000);
    }
  }

  function handleUnauthenticated() {
    currentUser = null;
    stopCountdown();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    if (sessionUsername) sessionUsername.classList.add('hidden');
    if (timeLeftBadge) timeLeftBadge.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (adminOpenBtn) adminOpenBtn.classList.add('hidden');

    if (appShell) appShell.classList.add('hidden');
    if (loginScreen) loginScreen.classList.remove('hidden');

    closeAdminPanel();
  }

  async function fetchAuthStatus() {
    try {
      const response = await fetch(apiUrl(AUTH_ENDPOINTS.status), {
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok || !data.authenticated) {
        // If we were logged in but now we're not, we were kicked out
        if (currentUser && !data.authenticated) {
          console.log('🚪 Session kicked out - logged in from another device');
          showLoginError('You have been logged out. Someone logged in from another device.');
        }
        handleUnauthenticated();
        return null;
      }

      handleAuthenticated(data.user);
      return data.user;
    } catch (error) {
      console.warn('Auth status error:', error);
      return null;
    }
  }

  function openAdminPanel() {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (!adminPanel) return;

    adminPanel.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadCustomers();

    if (!customerRefreshInterval) {
      customerRefreshInterval = setInterval(loadCustomers, 30000);
    }
  }

  function closeAdminPanel() {
    if (!adminPanel) return;
    adminPanel.classList.remove('active');
    document.body.style.overflow = '';
    if (customerRefreshInterval) {
      clearInterval(customerRefreshInterval);
      customerRefreshInterval = null;
    }
    // If current user is admin, return to login screen
    if (currentUser && currentUser.role === 'admin') {
      handleUnauthenticated();
    }
  }

  async function createCustomer(event) {
    event.preventDefault();
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    const duration = parseInt(document.getElementById('userDuration').value, 10);
    const submitButton = createUserForm?.querySelector('button[type="submit"]');

    if (!username || !password) {
      alert('Username and password are required');
      return;
    }

    if (!duration || isNaN(duration)) {
      alert('Invalid duration selected');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Saving...';
    }

    try {
      // Add timeout to prevent infinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(apiUrl(AUTH_ENDPOINTS.users), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, duration }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (data.success || response.ok) {
        alert('User created successfully!');
        event.target.reset();
        loadCustomers();
      } else {
        alert(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user error:', error);
      console.error('Error stack:', error.stack);
      if (error.name === 'AbortError') {
        alert('Request timeout. Server may not be responding.');
      } else {
        alert('Failed to create user: ' + error.message);
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Save customer';
      }
    }
  }

  async function loadCustomers() {
    if (!usersList) return;
    try {
      const response = await fetch(apiUrl(AUTH_ENDPOINTS.users), {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Load users failed:', data.error);
        return;
      }

      cachedUsers = data.users || [];
      renderCustomers(cachedUsers);
    } catch (error) {
      console.error('Load customers error:', error);
    }
  }

  function renderCustomers(users) {
    if (!usersList) return;
    usersList.innerHTML = '';

    const filtered = (users || []).filter((user) => user.role !== 'admin');
    const now = Date.now();
    const stats = {
      total: filtered.length,
      active: 0,
      waiting: 0,
      expiring: 0,
    };

    filtered.forEach((user) => {
      const row = document.createElement('div');
      row.className = 'user-row';
      row.dataset.userId = user.id;
      row.dataset.username = user.username.toLowerCase();

      const expiresAt = user.expiresAt ? new Date(user.expiresAt).getTime() : null;
      const isActive = Boolean(user.isActive);
      const isExpiringSoon = Boolean(
        expiresAt && expiresAt > now && expiresAt - now <= 6 * 60 * 60 * 1000
      );
      const timeLeft = expiresAt ? formatTimeLeft(expiresAt - now) : 'Awaiting first login';

      if (isActive) {
        stats.active += 1;
      } else {
        stats.waiting += 1;
      }
      if (isExpiringSoon) {
        stats.expiring += 1;
      }

      row.innerHTML = `
        <div>
          <strong>${user.username}</strong>
          <div class="user-meta">
            Duration: ${formatDurationLabel(user.durationMinutes)}<br />
            Time left: ${timeLeft}<br />
            Status: ${isActive ? 'Active' : user.expiresAt ? 'Inactive' : 'Pending activation'}
          </div>
          <div class="user-tags">
            <span class="user-tag ${isActive ? 'active' : 'pending'}">${isActive ? 'Active' : 'Waiting'}</span>
            ${isExpiringSoon ? '<span class="user-tag expiring">Expiring</span>' : ''}
          </div>
        </div>
        <div class="user-actions">
          <button class="add-day" data-action="add-day">+ Days</button>
          <button class="remove-day" data-action="remove-day">- Days</button>
          <button class="edit-pass" data-action="edit-pass">Edit pass</button>
          <button class="delete-user" data-action="delete-user">Delete</button>
        </div>
      `;

      usersList.appendChild(row);
    });

    if (totalUsersStat) totalUsersStat.textContent = stats.total;
    if (activeUsersStat) activeUsersStat.textContent = stats.active;
    if (waitingUsersStat) waitingUsersStat.textContent = stats.waiting;
    if (expiringUsersStat) expiringUsersStat.textContent = stats.expiring;

    if (adminEmptyState) {
      const messageNode = adminEmptyState.querySelector('p');
      if (messageNode && adminEmptyState.dataset.defaultText) {
        messageNode.textContent = adminEmptyState.dataset.defaultText;
      }
      adminEmptyState.style.display = stats.total === 0 ? 'block' : 'none';
    }
  }

  function filterCustomers(term) {
    if (!usersList) return;
    const normalized = term.trim().toLowerCase();
    let visibleCount = 0;
    const rows = usersList.querySelectorAll('.user-row');
    rows.forEach((row) => {
      const username = row.dataset.username || '';
      const matches = username.includes(normalized);
      row.style.display = matches ? 'flex' : 'none';
      if (matches) visibleCount += 1;
    });

    if (!adminEmptyState) return;
    const messageNode = adminEmptyState.querySelector('p');
    const defaultText = adminEmptyState.dataset.defaultText || 'No customers yet.';

    if (rows.length === 0) {
      adminEmptyState.style.display = 'block';
      if (messageNode) messageNode.textContent = defaultText;
      return;
    }

    if (normalized && visibleCount === 0) {
      adminEmptyState.style.display = 'block';
      if (messageNode) messageNode.textContent = `No matches for "${term}"`;
    } else {
      adminEmptyState.style.display = 'none';
      if (messageNode) messageNode.textContent = defaultText;
    }
  }

  async function extendUserDays(userId) {
    const daysInput = prompt('Enter number of days to add:');
    if (!daysInput) return;
    const days = parseInt(daysInput, 10);
    if (isNaN(days) || days <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }
    try {
      const response = await fetch(apiUrl(`/api/users/${userId}/extend`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ days }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Unable to extend user');
        return;
      }
      loadCustomers();
    } catch (error) {
      console.error('Extend user error:', error);
      alert('Network error. Please try again.');
    }
  }

  async function removeUserDays(userId) {
    const daysInput = prompt('Enter number of days to remove:');
    if (!daysInput) return;
    const days = parseInt(daysInput, 10);
    if (isNaN(days) || days <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }
    try {
      const response = await fetch(apiUrl(`/api/users/${userId}/extend`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ days: -days }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Unable to remove days');
        return;
      }
      loadCustomers();
    } catch (error) {
      console.error('Remove days error:', error);
      alert('Network error. Please try again.');
    }
  }

  async function updateUserPassword(userId) {
    const password = prompt('Enter a new password (min 6 characters):');
    if (!password) return;
    if (password.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    try {
      const response = await fetch(apiUrl(`/api/users/${userId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Unable to update password');
        return;
      }
      alert('Password updated.');
    } catch (error) {
      console.error('Update password error:', error);
      alert('Network error. Please try again.');
    }
  }

  async function deleteUser(userId) {
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    try {
      const response = await fetch(apiUrl(`/api/users/${userId}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Unable to delete user');
        return;
      }
      loadCustomers();
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Network error. Please try again.');
    }
  }

  async function deleteExpiredUsers() {
    if (!confirm('Delete all expired customers?')) return;
    try {
      const response = await fetch(apiUrl('/api/users/expired'), {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Unable to delete expired users');
        return;
      }
      alert(data.message || 'Expired users removed');
      loadCustomers();
    } catch (error) {
      console.error('Delete expired error:', error);
      alert('Network error. Please try again.');
    }
  }

  function bindEvents() {
    if (loginForm) {
      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        if (!username || !password) {
          showLoginError('Username and password are required');
          return;
        }
        if (loginButton) loginButton.disabled = true;
        await performLogin(username, password);
        if (loginButton) loginButton.disabled = false;
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    if (adminOpenBtn) {
      adminOpenBtn.addEventListener('click', openAdminPanel);
    }

    if (closeAdminBtn) {
      closeAdminBtn.addEventListener('click', closeAdminPanel);
    }

    if (createUserForm) {
      createUserForm.addEventListener('submit', createCustomer);
    }

    if (refreshCustomersBtn) {
      refreshCustomersBtn.addEventListener('click', loadCustomers);
    }

    if (deleteExpiredBtn) {
      deleteExpiredBtn.addEventListener('click', deleteExpiredUsers);
    }

    if (adminSearchInput) {
      adminSearchInput.addEventListener('input', (event) => {
        filterCustomers(event.target.value);
      });
    }

    if (usersList) {
      usersList.addEventListener('click', (event) => {
        const actionButton = event.target.closest('button[data-action]');
        if (!actionButton) return;
        const action = actionButton.getAttribute('data-action');
        const row = actionButton.closest('.user-row');
        if (!row) return;
        const userId = row.dataset.userId;
        if (!userId) return;

        if (action === 'add-day') {
          extendUserDays(userId);
        } else if (action === 'remove-day') {
          removeUserDays(userId);
        } else if (action === 'edit-pass') {
          updateUserPassword(userId);
        } else if (action === 'delete-user') {
          deleteUser(userId);
        }
      });
    }

    window.addEventListener('storage', (event) => {
      if (event.key === 'deviceId') {
        fetchAuthStatus();
      }
    });
  }

  // Password toggle functionality
  function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const toggleButton = document.querySelector(`.password-toggle[data-target="${inputId}"]`);
    
    if (!input || !toggleButton) return;
    
    const isCurrentlyPassword = input.type === 'password';
    const newType = isCurrentlyPassword ? 'text' : 'password';
    
    input.type = newType;
    
    toggleButton.setAttribute('aria-label', isCurrentlyPassword ? 'Hide password' : 'Show password');
    toggleButton.setAttribute('aria-pressed', isCurrentlyPassword ? 'true' : 'false');
    
    const openSegments = toggleButton.querySelectorAll('[data-eye-open]');
    const closedSegments = toggleButton.querySelectorAll('[data-eye-closed]');
    
    if (openSegments.length && closedSegments.length) {
      const showOpenEye = !isCurrentlyPassword;
      const showClosedEye = isCurrentlyPassword;
      
      openSegments.forEach(seg => {
        seg.style.display = showOpenEye ? '' : 'none';
      });
      
      closedSegments.forEach(seg => {
        seg.style.display = showClosedEye ? '' : 'none';
      });
    }
  }
  
  // Bind password toggle buttons
  document.querySelectorAll('.password-toggle').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetId = button.getAttribute('data-target');
      if (targetId) {
        togglePasswordVisibility(targetId);
      }
    });
  });

  bindEvents();
  fetchAuthStatus();
})();
