const Auth = (() => {
  const TOKEN_KEY = 'civic_token';
  const USER_KEY = 'civic_user';

  // The token lives in exactly one storage, so whichever holds it is the user's "remember me" choice.
  const activeStorage = () => (localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage);

  function save(token, user, remember = false) {
    clear();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify({
      id: user.id,
      full_name: user.full_name,
      role: user.role,
    }));
  }

  function clear() {
    [localStorage, sessionStorage].forEach((s) => {
      s.removeItem(TOKEN_KEY);
      s.removeItem(USER_KEY);
    });
  }

  const getToken = () => activeStorage().getItem(TOKEN_KEY);

  function getUser() {
    try {
      return JSON.parse(activeStorage().getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function updateUser(changes) {
    const user = getUser();
    if (user) activeStorage().setItem(USER_KEY, JSON.stringify({ ...user, ...changes }));
  }

  function decodeToken(token) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  function isExpired(token) {
    const exp = decodeToken(token)?.exp;
    return exp ? exp * 1000 < Date.now() : false;
  }

  const isAdmin = () => getUser()?.role === 'admin';

  const homeFor = (user) =>
    user?.role === 'admin' ? CONFIG.ROUTES.adminDashboard : CONFIG.ROUTES.home;

  function logout(message) {
    clear();
    if (message) Toast.flash('error', message);
    window.location.replace(CONFIG.ROUTES.login);
  }

  /*
   * ROLE GUARD 1: any logged-in user.
   * Call at the top of every protected page. Sends visitors without a valid token to login.
   * UX only; the backend still rejects requests without a valid token.
   */
  function requireAuth() {
    const token = getToken();
    if (!token) {
      window.location.replace(CONFIG.ROUTES.login);
      return false;
    }
    if (isExpired(token)) {
      logout('Your session has expired. Please log in again.');
      return false;
    }
    return true;
  }

  /*
   * ROLE GUARD 2: admin only.
   * Call at the top of every admin page. Normal users are bounced to their home page.
   * UX only; the backend enforces the real admin check on every admin endpoint.
   */
  function requireAdmin() {
    if (!requireAuth()) return false;
    if (!isAdmin()) {
      Toast.flash('error', 'That area is for administrators only.');
      window.location.replace(CONFIG.ROUTES.home);
      return false;
    }
    return true;
  }

  // Keeps logged-in users off the login and signup pages.
  function redirectIfLoggedIn() {
    const token = getToken();
    if (token && !isExpired(token)) {
      window.location.replace(homeFor(getUser()));
      return true;
    }
    return false;
  }

  return {
    save, clear, getToken, getUser, updateUser, decodeToken,
    isAdmin, homeFor, logout,
    requireAuth, requireAdmin, redirectIfLoggedIn,
  };
})();