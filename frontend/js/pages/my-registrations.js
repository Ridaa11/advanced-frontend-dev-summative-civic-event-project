$(function () {
  // ROLE GUARD: registrations belong to normal users; admins are sent to their dashboard.
  if (!Auth.requireAuth()) return;
  if (Auth.isAdmin()) {
    window.location.replace(CONFIG.ROUTES.adminDashboard);
    return;
  }
  Layout.init('');

  const $grid = $('#registrations-grid');
  let rows = [];

  function cardHtml({ reg, event }) {
    const id = esc(reg.event_id);
    return `<article class="card p-5"><h2 class="font-display text-lg font-bold">${esc(event.title || 'Event')}</h2>
      <p class="mt-1 text-sm text-slate-700">${esc(fmtDateTime(event.starts_at))}</p>
      <p class="text-sm text-slate-700">${esc(event.location || '')}</p>
      <p class="mt-2 text-xs text-slate-600">Registered on ${esc(fmtDate(reg.created_at))}</p>
      <div class="mt-4 flex gap-2"><a class="btn btn-outline" href="/event.html?id=${id}">View</a>
      <button type="button" class="btn btn-danger" data-cancel="${id}">Cancel registration</button></div></article>`;
  }

  function render() {
    if (!rows.length) {
      renderState($grid, { title: 'No registrations yet', text: 'Find an event you like and register.', actionHtml: '<a class="btn btn-solid" href="/events.html">Browse events</a>' });
      return;
    }
    $grid.removeAttr('aria-busy').html(rows.map(cardHtml).join(''));
  }

  async function load() {
    renderSkeletons($grid, 3, 'h-24');
    try {
      const [regs, evs] = await Promise.all([Api.get(CONFIG.ENDPOINTS.myRegistrations), Api.get(CONFIG.ENDPOINTS.events)]);
      const events = new Map(asList(evs.data).map((e) => [String(e.id), e]));
      rows = asList(regs.data).filter(isActiveRegistration)
        .map((reg) => ({ reg, event: events.get(String(reg.event_id)) || reg }));
      render();
    } catch (err) {
      showError($grid, err, load);
    }
  }

  $grid.on('click', '[data-cancel]', async function () {
    const id = $(this).attr('data-cancel');
    const ok = await confirmDialog({ title: 'Cancel registration?', message: 'You can register again later if there is still space.', confirmText: 'Cancel registration', danger: true });
    if (!ok) return;
    const previous = rows;
    rows = rows.filter((r) => String(r.reg.event_id) !== id);
    render();
    try {
      await Api.post(CONFIG.ENDPOINTS.cancelRegistration, { event_id: id });
      Toast.show('success', 'Your registration was cancelled.');
    } catch (err) {
      rows = previous;
      render();
      Toast.show('error', err.message);
    }
  });

  load();
});