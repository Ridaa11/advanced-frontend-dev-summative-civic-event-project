$(function () {
  if (!Auth.requireAuth()) return;
  Layout.init('promos');

  const isAdmin = Auth.isAdmin();
  const $grid = $('#promos-grid');
  let items = [];

  // ROLE GUARD: only admins get the create button.
  if (isAdmin) $('#page-actions').html('<a href="/admin/promo-form.html" class="btn btn-solid">New promo</a>');

  function cardHtml(p) {
    const id = esc(p.id);
    const draft = p.published === false;

    // ROLE GUARD: edit, publish and delete controls are admin-only.
    const adminActions = isAdmin
      ? `<a class="btn btn-outline" href="/admin/promo-form.html?id=${id}">Edit</a>
         <button type="button" class="btn btn-outline" data-toggle="${id}">${draft ? 'Publish' : 'Unpublish'}</button>
         <button type="button" class="btn btn-danger" data-delete="${id}">Delete</button>`
      : '';

    // The #t=0.1 fragment makes the browser show a frame as the thumbnail.
    return `<article class="card overflow-hidden">
      <a href="/promo.html?id=${id}" class="block bg-black" tabindex="-1" aria-hidden="true">
        <video data-src="${esc(fileUrl(p.video_url))}#t=0.1" preload="metadata" muted playsinline class="aspect-video w-full object-cover"></video></a>
      <div class="p-5"><div class="flex items-start justify-between gap-3">
        <h2 class="font-display text-lg font-bold">${esc(p.title)}</h2>
        ${draft ? '<span class="badge bg-amber-100 text-amber-900">Draft</span>' : ''}</div>
        <p class="mt-2 text-sm">${esc(truncate(p.description, 110))}</p>
        <div class="mt-4 flex flex-wrap gap-2"><a class="btn btn-solid" href="/promo.html?id=${id}">Play<span class="sr-only"> ${esc(p.title)}</span></a>${adminActions}</div>
      </div></article>`;
  }

  function render() {
    const list = items.filter((p) => isAdmin || p.published !== false);
    if (!list.length) {
      renderState($grid, { title: 'No promos yet', text: 'New promo videos will show up here.' });
      return;
    }
    $grid.removeAttr('aria-busy').html(list.map(cardHtml).join(''));
    lazyLoadMedia($grid);
  }

  async function load(force = false) {
    const cached = force ? null : PageCache.get('promos');
    if (cached) {
      items = cached;
      render();
      return;
    }
    renderSkeletons($grid, 3, 'h-40');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.promos);
      items = asList(data);
      PageCache.set('promos', items);
      render();
    } catch (err) {
      showError($grid, err, () => load(true));
    }
  }

  $grid.on('click', '[data-toggle]', async function () {
    if (!isAdmin) return;
    const id = $(this).attr('data-toggle');
    const item = items.find((p) => String(p.id) === id);
    const wasDraft = item.published === false;
    item.published = wasDraft;
    render();
    try {
      await Api.patch(wasDraft ? CONFIG.ENDPOINTS.publishPromo(id) : CONFIG.ENDPOINTS.unpublishPromo(id));
      PageCache.clear('promos');
      Toast.show('success', wasDraft ? 'Promo published.' : 'Promo unpublished.');
    } catch (err) {
      item.published = !wasDraft;
      render();
      Toast.show('error', err.message);
    }
  });

  $grid.on('click', '[data-delete]', async function () {
    if (!isAdmin) return;
    const id = $(this).attr('data-delete');
    const item = items.find((p) => String(p.id) === id);
    const ok = await confirmDialog({ title: 'Delete promo?', message: `"${item.title}" will be permanently removed.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await Api.delete(CONFIG.ENDPOINTS.promo(id));
      PageCache.clear('promos');
      items = items.filter((p) => String(p.id) !== id);
      render();
      Toast.show('success', 'Promo deleted.');
    } catch (err) {
      Toast.show('error', err.message);
    }
  });

  load();
});