$(function () {
  if (!Auth.requireAuth()) return;
  Layout.init('announcements');

  const isAdmin = Auth.isAdmin();
  const $grid = $('#announcements-grid');
  const player = new Audio();
  let items = [];
  let playingId = null;

  // ROLE GUARD: only admins get the create button.
  if (isAdmin) $('#page-actions').html('<a href="/admin/announcement-form.html" class="btn btn-solid">New announcement</a>');

  function cardHtml(a) {
    const id = esc(a.id);
    const draft = a.published === false;

    // ROLE GUARD: edit, publish and delete controls are admin-only.
    const adminActions = isAdmin
      ? `<a class="btn btn-outline" href="/admin/announcement-form.html?id=${id}">Edit</a>
         <button type="button" class="btn btn-outline" data-toggle="${id}">${draft ? 'Publish' : 'Unpublish'}</button>
         <button type="button" class="btn btn-danger" data-delete="${id}">Delete</button>`
      : '';

    return `<article class="card p-5">
      <div class="flex items-start justify-between gap-3">
        <h2 class="font-display text-lg font-bold"><a href="/announcement.html?id=${id}" class="hover:underline">${esc(a.title)}</a></h2>
        ${draft ? '<span class="badge bg-amber-100 text-amber-900">Draft</span>' : ''}</div>
      <p class="mt-1 text-sm text-slate-700">${esc(fmtDate(a.created_at))} &middot; <span data-duration="${id}">--:--</span></p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button type="button" class="btn btn-solid" data-play="${id}" aria-pressed="false"><span data-label>Play</span><span class="sr-only"> ${esc(a.title)}</span></button>
        <a class="btn btn-outline" href="/announcement.html?id=${id}">Details</a>${adminActions}</div></article>`;
  }

  function render() {
    const list = items.filter((a) => isAdmin || a.published !== false);
    if (!list.length) {
      renderState($grid, { title: 'No announcements yet', text: 'New audio announcements will show up here.' });
      return;
    }
    $grid.removeAttr('aria-busy').html(list.map(cardHtml).join(''));
    list.forEach((a) => {
      const probe = new Audio();
      probe.preload = 'metadata';
      probe.addEventListener('loadedmetadata', () => $(`[data-duration="${a.id}"]`).text(fmtDuration(probe.duration)));
      probe.src = fileUrl(a.audio_url);
    });
    syncButtons();
  }

  function syncButtons() {
    $grid.find('[data-play]').each(function () {
      const on = $(this).attr('data-play') === playingId && !player.paused;
      $(this).attr('aria-pressed', on).find('[data-label]').text(on ? 'Pause' : 'Play');
    });
  }

  async function load() {
    renderSkeletons($grid, 3, 'h-8');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.announcements);
      items = asList(data);
      render();
    } catch (err) {
      showError($grid, err, load);
    }
  }

  ['play', 'pause', 'ended'].forEach((name) => player.addEventListener(name, syncButtons));

  $grid.on('click', '[data-play]', function () {
    const id = $(this).attr('data-play');
    if (playingId === id && !player.paused) {
      player.pause();
      return;
    }
    if (playingId !== id) {
      player.src = fileUrl(items.find((a) => String(a.id) === id).audio_url);
      playingId = id;
    }
    player.play().catch(() => Toast.show('error', 'This audio could not be played.'));
  });

  $grid.on('click', '[data-toggle]', async function () {
    if (!isAdmin) return;
    const id = $(this).attr('data-toggle');
    const item = items.find((a) => String(a.id) === id);
    const wasDraft = item.published === false;
    item.published = wasDraft;
    render();
    try {
      await Api.patch(wasDraft ? CONFIG.ENDPOINTS.publishAnnouncement(id) : CONFIG.ENDPOINTS.unpublishAnnouncement(id));
      Toast.show('success', wasDraft ? 'Announcement published.' : 'Announcement unpublished.');
    } catch (err) {
      item.published = !wasDraft;
      render();
      Toast.show('error', err.message);
    }
  });

  $grid.on('click', '[data-delete]', async function () {
    if (!isAdmin) return;
    const id = $(this).attr('data-delete');
    const item = items.find((a) => String(a.id) === id);
    const ok = await confirmDialog({ title: 'Delete announcement?', message: `"${item.title}" will be permanently removed.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await Api.delete(CONFIG.ENDPOINTS.announcement(id));
      if (playingId === id) player.pause();
      items = items.filter((a) => String(a.id) !== id);
      render();
      Toast.show('success', 'Announcement deleted.');
    } catch (err) {
      Toast.show('error', err.message);
    }
  });

  load();
});