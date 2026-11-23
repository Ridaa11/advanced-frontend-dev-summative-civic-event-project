const Layout = (() => {
  const NAV = [
    { key: 'events', label: 'Events', href: '/events.html' },
    { key: 'announcements', label: 'Announcements', href: '/announcements.html' },
    { key: 'promos', label: 'Promos', href: '/promos.html' },
  ];
  const ADMIN_LINKS = [
    { label: 'Manage users', href: '/admin/users.html' },
    { label: 'New event', href: '/admin/event-form.html' },
    { label: 'New announcement', href: '/admin/announcement-form.html' },
    { label: 'New promo', href: '/admin/promo-form.html' },
  ];
  const BELL_ICON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-6 w-6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></svg>';

  // The API has no "mark as read" route, so read state is remembered per user in this browser.
  const state = { items: [], read: new Set(), loaded: false, error: null, mounts: [] };
  const readKey = () => `civic_read_${Auth.getUser()?.id}`;

  function loadRead() {
    try {
      state.read = new Set(JSON.parse(localStorage.getItem(readKey())) || []);
    } catch {
      state.read = new Set();
    }
  }

  function saveRead() {
    try {
      localStorage.setItem(readKey(), JSON.stringify([...state.read]));
    } catch { /* read state then only lasts for this page view */ }
  }

  const isRead = (n) => n.read === true || state.read.has(n.id);

  /* ---------- header, footer, sidebar ---------- */

  function searchForm(id) {
    return `<form role="search" data-search class="flex w-full">
      <label for="${id}" class="sr-only">Search events, announcements and promos</label>
      <input id="${id}" type="search" name="q" placeholder="Search..." class="w-full min-w-0 rounded-l-md border-0 px-3 py-1.5 text-sm text-ink placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-signal">
      <button type="submit" class="rounded-r-md bg-signal px-3 text-sm font-semibold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-white">Search</button>
    </form>`;
  }

  function headerHtml(active) {
    const user = Auth.getUser() || {};
    const admin = Auth.isAdmin();
    const current = (key) => (key === active ? 'bg-white/15" aria-current="page' : '');
    const links = NAV.map((i) => `<a href="${i.href}" class="nav-link ${current(i.key)}">${i.label}</a>`).join('');

    // ROLE GUARD: admin navigation is only rendered when the stored user is an admin.
    const adminDesktop = admin
      ? `<a href="/admin/dashboard.html" class="nav-link ${current('dashboard')}">Dashboard</a>
         <div class="relative" data-dropdown>
           <button type="button" class="nav-link" data-dropdown-toggle aria-expanded="false" aria-haspopup="true">Admin &#9662;</button>
           <div class="absolute left-0 z-40 mt-1 hidden w-52 rounded-md bg-white py-1 shadow-lg" data-dropdown-menu>
             ${ADMIN_LINKS.map((l) => `<a class="menu-item" href="${l.href}">${l.label}</a>`).join('')}
           </div></div>`
      : '';
    const adminMobile = admin
      ? [{ label: 'Dashboard', href: '/admin/dashboard.html' }, ...ADMIN_LINKS]
          .map((l) => `<a href="${l.href}" class="nav-link block">${l.label}</a>`).join('')
      : '';

    return `<div class="bg-civic-dark text-white">
      <div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <a href="${Auth.homeFor(user)}" class="font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-signal">CivicEvents+</a>
        <nav aria-label="Main" class="hidden flex-1 items-center gap-2 md:flex">${links}${adminDesktop}</nav>
        <div class="hidden w-64 md:block">${searchForm('search-desktop')}</div>
        <div class="ml-auto flex items-center gap-1 md:ml-0">
          <button type="button" id="bell" class="relative rounded-md p-2 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal" aria-label="Notifications" aria-haspopup="dialog" aria-expanded="false">
            ${BELL_ICON}<span id="bell-count" class="absolute -right-0.5 -top-0.5 hidden min-w-[1.25rem] rounded-full bg-signal px-1 text-center text-xs font-bold text-ink"></span>
          </button>
          <div class="relative" data-dropdown>
            <button type="button" class="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal" data-dropdown-toggle aria-expanded="false" aria-haspopup="true" aria-label="Account menu">
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-signal font-bold text-ink" aria-hidden="true">${esc(initials(user.full_name))}</span>
              <span id="user-name" class="hidden max-w-[10rem] truncate sm:inline">${esc(user.full_name)}</span>
            </button>
            <div class="absolute right-0 z-40 mt-1 hidden w-56 rounded-md bg-white py-1 text-ink shadow-lg" data-dropdown-menu>
              <p class="border-b border-slate-200 px-4 py-2 text-xs text-slate-600">Signed in as ${esc(user.role)}</p>
              <a class="menu-item" href="/profile.html">My profile</a>
              ${admin ? '' : '<a class="menu-item" href="/my-registrations.html">My registrations</a>'}
              <button type="button" class="menu-item" data-logout>Log out</button>
            </div>
          </div>
          <button type="button" id="menu-toggle" class="rounded-md px-2 py-1 text-sm hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal md:hidden" aria-expanded="false" aria-controls="mobile-panel">Menu</button>
        </div>
      </div>
      <div id="mobile-panel" class="hidden space-y-2 border-t border-white/10 px-4 py-3 md:hidden">
        ${searchForm('search-mobile')}${links.replace(/class="nav-link/g, 'class="nav-link block')}${adminMobile}
      </div></div>`;
  }

  function footerHtml() {
    const links = NAV.map((i) => `<li><a class="underline hover:text-white" href="${i.href}">${i.label}</a></li>`).join('');
    return `<div class="bg-civic-dark text-civic-light"><div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
      <div><p class="font-display text-lg font-bold text-white">CivicEvents+</p>
        <p class="mt-2 text-sm">Events, announcements and updates for your community, all in one place.</p></div>
      <nav aria-label="Footer"><h2 class="text-sm font-semibold text-white">Explore</h2><ul class="mt-2 space-y-1 text-sm">${links}</ul></nav>
      <div><h2 class="text-sm font-semibold text-white">Contact and help</h2><ul class="mt-2 space-y-1 text-sm">
        <li><a class="underline hover:text-white" href="mailto:${CONFIG.SUPPORT_EMAIL}">${CONFIG.SUPPORT_EMAIL}</a></li>
        <li>Help desk: Monday to Friday, 8:00 to 17:00</li></ul></div></div>
      <p class="border-t border-white/10 py-4 text-center text-xs">&copy; ${new Date().getFullYear()} CivicEvents+. All rights reserved.</p></div>`;
  }

  function sidebarHtml(active) {
    const items = [
      ['dashboard', 'Dashboard', '/admin/dashboard.html'],
      ['users', 'Users', '/admin/users.html'],
      ['events', 'Events', '/events.html'],
      ['announcements', 'Announcements', '/announcements.html'],
      ['promos', 'Promos', '/promos.html'],
      ['notifications', 'Notifications', '/notifications.html'],
    ];
    return `<nav aria-label="Admin" class="card mb-6 flex gap-1 overflow-x-auto p-2 lg:mb-0 lg:flex-col lg:overflow-visible">
      ${items.map(([key, label, href]) =>
        `<a href="${href}" class="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${key === active ? 'bg-civic text-white' : 'hover:bg-civic-light'}" ${key === active ? 'aria-current="page"' : ''}>${label}</a>`
      ).join('')}</nav>`;
  }

  function drawerHtml() {
    return `<div id="notif-overlay" class="fixed inset-0 z-40 hidden bg-black/40"></div>
      <aside id="notif-drawer" role="dialog" aria-modal="true" aria-labelledby="notif-title" class="fixed inset-y-0 right-0 z-50 hidden w-full max-w-md flex-col bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="notif-title" class="font-display text-xl font-bold">Notifications</h2>
          <div class="flex gap-2"><button type="button" class="btn btn-outline !px-2 !py-1" data-mark-all>Mark all read</button>
          <button type="button" id="drawer-close" class="btn btn-outline !px-2 !py-1" aria-label="Close notifications">&times;</button></div></div>
        <div id="drawer-list" class="flex-1 overflow-y-auto"></div>
        <div class="border-t border-slate-200 p-3 text-center"><a href="/notifications.html" class="text-sm font-medium text-civic underline">View all notifications</a></div>
      </aside>`;
  }

  /* ---------- notifications ---------- */

  function resourceLink(n) {
    const m = n.metadata || {};
    if (m.event_id) return `/event.html?id=${encodeURIComponent(m.event_id)}`;
    if (m.promo_id) return `/promo.html?id=${encodeURIComponent(m.promo_id)}`;
    if (m.announcement_id) return `/announcement.html?id=${encodeURIComponent(m.announcement_id)}`;
    return { event: '/events.html', promo: '/promos.html', announcement: '/announcements.html' }[n.type] || null;
  }

  function itemHtml(n) {
    const unread = !isRead(n);
    // ROLE GUARD: only admins get a delete button on notifications.
    const del = Auth.isAdmin()
      ? `<button type="button" class="btn btn-outline !px-2 !py-1" data-notif-delete="${esc(n.id)}" aria-label="Delete notification: ${esc(n.title)}">Delete</button>`
      : '';
    return `<li class="border-b border-slate-200 last:border-0"><div class="flex items-start gap-2 p-2">
      <button type="button" class="flex-1 rounded-md p-2 text-left hover:bg-civic-light focus:outline-none focus-visible:ring-2 focus-visible:ring-civic" data-notif-id="${esc(n.id)}">
        <span class="flex flex-wrap items-center gap-2">
          ${unread ? '<span class="h-2 w-2 rounded-full bg-civic" aria-hidden="true"></span><span class="sr-only">Unread.</span>' : ''}
          <span class="${unread ? 'font-semibold' : ''}">${esc(n.title)}</span>
          <span class="badge bg-slate-100 text-slate-800">${esc(n.type)}</span></span>
        <span class="mt-1 block text-sm text-slate-700">${esc(truncate(n.message, 100))}</span>
        <span class="mt-1 block text-xs text-slate-600">${esc(fmtDateTime(n.created_at))}</span></button>${del}</div></li>`;
  }

  function renderList($el) {
    if (state.error) return showError($el, state.error, refresh);
    if (!state.loaded) {
      $el.html('<div class="space-y-3 p-4" aria-busy="true"><div class="skeleton h-16"></div><div class="skeleton h-16"></div><div class="skeleton h-16"></div></div>');
      return undefined;
    }
    if (!state.items.length) {
      return renderState($el, { title: 'No notifications yet', text: 'New events, announcements and promos will appear here.' });
    }
    $el.removeAttr('aria-busy').html(`<ul>${state.items.map(itemHtml).join('')}</ul>`);
    return undefined;
  }

  const renderAll = () => state.mounts.forEach(renderList);

  function updateBell() {
    const count = state.items.filter((n) => !isRead(n)).length;
    $('#bell-count').text(count > 99 ? '99+' : count).toggleClass('hidden', count === 0);
    $('#bell').attr('aria-label', count ? `Notifications, ${count} unread` : 'Notifications');
  }

  async function refresh() {
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.notifications);
      state.items = asList(data).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      state.error = null;
    } catch (err) {
      state.error = err;
    }
    state.loaded = true;
    updateBell();
    renderAll();
  }

  function markRead(ids) {
    ids.forEach((id) => state.read.add(id));
    saveRead();
    updateBell();
    renderAll();
  }

  function openDetail(id) {
    const n = state.items.find((x) => String(x.id) === String(id));
    if (!n) return;
    markRead([n.id]);
    const link = resourceLink(n);
    openModal({
      title: n.title,
      body: `<p class="text-xs text-slate-600">${esc(n.type)} &middot; ${esc(fmtDateTime(n.created_at))}</p>
             <p class="mt-3 whitespace-pre-line">${esc(n.message)}</p>`,
      footer: link ? `<a class="btn btn-solid" href="${link}">Open</a>` : '',
    });
  }

  async function removeNotification(id) {
    // Client-side guard; the backend independently restricts DELETE to admins.
    if (!Auth.isAdmin()) return;
    const ok = await confirmDialog({
      title: 'Delete notification?',
      message: 'This removes it for every user and cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;

    const previous = state.items;
    state.items = previous.filter((n) => String(n.id) !== String(id));
    updateBell();
    renderAll();
    try {
      await Api.delete(CONFIG.ENDPOINTS.notification(id));
      Toast.show('success', 'Notification deleted.');
    } catch (err) {
      state.items = previous;
      updateBell();
      renderAll();
      Toast.show('error', err.message);
    }
  }

  /* ---------- drawer and dropdown behaviour ---------- */

  function openDrawer() {
    $('#notif-overlay').removeClass('hidden');
    $('#notif-drawer').removeClass('hidden').addClass('flex');
    $('#bell').attr('aria-expanded', 'true');
    $('#drawer-close').trigger('focus');
    refresh();
  }

  function closeDrawer() {
    $('#notif-overlay').addClass('hidden');
    $('#notif-drawer').addClass('hidden').removeClass('flex');
    $('#bell').attr('aria-expanded', 'false').trigger('focus');
  }

  function closeDropdowns() {
    $('[data-dropdown-menu]').addClass('hidden');
    $('[data-dropdown-toggle]').attr('aria-expanded', 'false');
  }

  function bindEvents() {
    $(document)
      .on('click', '[data-dropdown-toggle]', function (e) {
        e.stopPropagation();
        const $menu = $(this).siblings('[data-dropdown-menu]');
        const wasHidden = $menu.hasClass('hidden');
        closeDropdowns();
        if (wasHidden) {
          $menu.removeClass('hidden');
          $(this).attr('aria-expanded', 'true');
        }
      })
      .on('click', closeDropdowns)
      .on('click', '[data-logout]', () => {
        Toast.flash('info', 'You have been logged out.');
        Auth.logout();
      })
      .on('click', '#menu-toggle', function () {
        const open = $('#mobile-panel').toggleClass('hidden').hasClass('hidden') === false;
        $(this).attr('aria-expanded', open);
      })
      .on('submit', '[data-search]', function (e) {
        e.preventDefault();
        const q = $(this).find('input').val().trim();
        if (q) window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
      })
      .on('click', '#bell', openDrawer)
      .on('click', '#drawer-close, #notif-overlay', closeDrawer)
      .on('click', '[data-mark-all]', () => markRead(state.items.map((n) => n.id)))
      .on('click', '[data-notif-id]', function () {
        openDetail($(this).attr('data-notif-id'));
      })
      .on('click', '[data-notif-delete]', function () {
        removeNotification($(this).attr('data-notif-delete'));
      })
      .on('keydown', (e) => {
        if (e.key !== 'Escape') return;
        closeDropdowns();
        if (!$('#notif-drawer').hasClass('hidden') && !document.querySelector('dialog[open]')) closeDrawer();
      });

    // Keep Tab inside the drawer while it is open.
    $('#notif-drawer').on('keydown', function (e) {
      if (e.key !== 'Tab') return;
      const focusable = $(this).find('button, a[href]').not('[disabled]').toArray();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  function mount($el) {
    state.mounts.push($el);
    renderList($el);
  }

  function init(active = '') {
    loadRead();
    $('#site-header').html(headerHtml(active));
    $('#site-footer').html(footerHtml());
    $('#admin-sidebar').html(sidebarHtml(active));
    $('body').append(drawerHtml());
    mount($('#drawer-list'));
    bindEvents();
    refresh();
    setInterval(refresh, 60000);
  }

  return {
    init,
    mount,
    markAllRead: () => markRead(state.items.map((n) => n.id)),
    setUserName: (name) => $('#user-name').text(name),
  };
})();