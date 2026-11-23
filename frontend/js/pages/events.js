$(function () {
  if (!Auth.requireAuth()) return;
  Layout.init('events');

  const PAGE_SIZE = 6;
  const isAdmin = Auth.isAdmin();
  const $grid = $('#events-grid');
  let events = [];
  let registered = new Set();
  let page = 1;

  // ROLE GUARD: only admins get the create button; the backend also rejects non-admin writes.
  if (isAdmin) $('#page-actions').html('<a href="/admin/event-form.html" class="btn btn-solid">New event</a>');

  const hasEnded = (e) => new Date(e.ends_at || e.starts_at) < Date.now();

  function visibleEvents() {
    const q = $('#filter-q').val().trim().toLowerCase();
    const place = $('#filter-location').val().trim().toLowerCase();
    const from = $('#filter-date').val();

    return events
      .filter((e) => isAdmin || e.published !== false)
      .filter((e) => !q || `${e.title} ${e.description}`.toLowerCase().includes(q))
      .filter((e) => !place || (e.location || '').toLowerCase().includes(place))
      .filter((e) => !from || (e.starts_at && new Date(e.starts_at) >= new Date(from)))
      .sort((a, b) => {
        if (hasEnded(a) !== hasEnded(b)) return hasEnded(a) ? 1 : -1;
        const diff = new Date(a.starts_at) - new Date(b.starts_at);
        return hasEnded(a) ? -diff : diff;
      });
  }

  function cardHtml(e) {
    const id = esc(e.id);
    const image = e.metadata?.image_url;
    const media = image
      ? `<img src="${esc(fileUrl(image))}" alt="${esc(e.title)} event image" loading="lazy" class="h-44 w-full rounded-t-lg object-cover">`
      : `<div class="flex h-44 items-center justify-center rounded-t-lg bg-civic font-display text-4xl font-bold text-white" aria-hidden="true">${esc(initials(e.title))}</div>`;

    // ROLE GUARD: admins see Edit/Delete; normal users see Register.
    let actions;
    if (isAdmin) {
      actions = `<a class="btn btn-outline" href="/admin/event-form.html?id=${id}">Edit</a>
                 <button type="button" class="btn btn-danger" data-delete="${id}">Delete</button>`;
    } else if (registered.has(String(e.id))) {
      actions = '<span class="badge bg-green-100 text-green-900">Registered</span>';
    } else if (!hasEnded(e)) {
      actions = `<button type="button" class="btn btn-solid" data-register="${id}">Register</button>`;
    } else {
      actions = '';
    }

    return `<article class="card flex flex-col">
      ${media}
      <div class="flex flex-1 flex-col p-5">
        <div class="flex items-start justify-between gap-2"><h2 class="font-display text-lg font-bold">${esc(e.title)}</h2>
        ${hasEnded(e) ? '<span class="badge bg-slate-100 text-slate-800">Ended</span>' : ''}</div>
        <p class="mt-1 text-sm text-slate-700">${esc(fmtDateTime(e.starts_at))}</p>
        <p class="text-sm text-slate-700">${esc(e.location || 'Location to be announced')}</p>
        <p class="mt-3 flex-1 text-sm">${esc(truncate(e.description, 120))}</p>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <a class="btn btn-outline" href="/event.html?id=${id}">View<span class="sr-only"> ${esc(e.title)}</span></a>${actions}</div>
      </div></article>`;
  }

  function render() {
    const list = visibleEvents();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    page = Math.min(page, pages);
    $('#results-count').text(`${list.length} event${list.length === 1 ? '' : 's'} found`);

    if (!list.length) {
      renderState($grid, {
        title: 'No events found',
        text: events.length ? 'Try changing your filters.' : 'Check back soon for new events.',
      });
      $('#pagination').empty();
      return;
    }
    $grid.removeAttr('aria-busy').html(list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(cardHtml).join(''));
    renderPagination($('#pagination'), page, pages, (p) => {
      page = p;
      render();
      window.scrollTo({ top: 0 });
    });
  }

  async function load() {
    renderSkeletons($grid, 6, 'h-44');
    try {
      const [eventsRes, regsRes] = await Promise.all([
        Api.get(CONFIG.ENDPOINTS.events),
        isAdmin ? null : Api.get(CONFIG.ENDPOINTS.myRegistrations),
      ]);
      events = asList(eventsRes.data);
      if (regsRes) {
        registered = new Set(asList(regsRes.data).filter(isActiveRegistration).map((r) => String(r.event_id)));
      }
      render();
    } catch (err) {
      showError($grid, err, load);
    }
  }

  $('#filters').on('input change', () => {
    page = 1;
    render();
  }).on('reset', () => setTimeout(() => {
    page = 1;
    render();
  }));

  $grid.on('click', '[data-register]', async function () {
    const id = $(this).attr('data-register');
    registered.add(id);
    render();
    try {
      await Api.post(CONFIG.ENDPOINTS.register, { event_id: id });
      Toast.show('success', 'You are registered for this event.');
    } catch (err) {
      registered.delete(id);
      render();
      Toast.show('error', err.message);
    }
  });

  $grid.on('click', '[data-delete]', async function () {
    if (!isAdmin) return;
    const id = $(this).attr('data-delete');
    const event = events.find((e) => String(e.id) === id);
    const ok = await confirmDialog({ title: 'Delete event?', message: `"${event?.title}" will be permanently removed.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await Api.delete(CONFIG.ENDPOINTS.event(id));
      events = events.filter((e) => String(e.id) !== id);
      render();
      Toast.show('success', 'Event deleted.');
    } catch (err) {
      Toast.show('error', err.message);
    }
  });

  load();
});