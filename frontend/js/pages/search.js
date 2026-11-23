$(function () {
  if (!Auth.requireAuth()) return;
  Layout.init('');

  const q = (queryParam('q') || '').trim();
  const isAdmin = Auth.isAdmin();
  const $results = $('#search-results');
  $('[data-search] input').val(q);
  $('#search-title').text(q ? `Results for "${q}"` : 'Search');

  const matches = (item, fields) => fields.some((f) => String(item[f] ?? '').toLowerCase().includes(q.toLowerCase()));

  function group(title, items, hrefFor, detailFor) {
    return `<section aria-labelledby="g-${title}"><h2 id="g-${title}" class="font-display text-xl font-bold">${title} (${items.length})</h2>
      ${items.length ? `<ul class="mt-3 space-y-2">${items.map((i) => `<li class="card p-4"><a class="font-semibold text-civic underline" href="${hrefFor(i)}">${esc(i.title)}</a>
        <p class="text-sm text-slate-700">${esc(detailFor(i))}</p></li>`).join('')}</ul>` : '<p class="mt-2 text-slate-700">No matches.</p>'}</section>`;
  }

  async function load() {
    if (!q) return renderState($results, { title: 'Type something to search', text: 'Use the search box above.' });
    renderSkeletons($results, 3, 'h-8');
    const [events, announcements, promos] = await Promise.allSettled([
      Api.get(CONFIG.ENDPOINTS.events), Api.get(CONFIG.ENDPOINTS.announcements), Api.get(CONFIG.ENDPOINTS.promos),
    ]);
    const pick = (res, fields) => (res.status === 'fulfilled'
      ? asList(res.value.data).filter((i) => (isAdmin || i.published !== false) && matches(i, fields)) : []);

    $results.removeAttr('aria-busy').html(
      group('Events', pick(events, ['title', 'description', 'location']), (e) => `/event.html?id=${esc(e.id)}`, (e) => `${fmtDateTime(e.starts_at)} - ${e.location || ''}`)
      + group('Announcements', pick(announcements, ['title']), (a) => `/announcement.html?id=${esc(a.id)}`, (a) => `Posted ${fmtDate(a.created_at)}`)
      + group('Promos', pick(promos, ['title', 'description']), (p) => `/promo.html?id=${esc(p.id)}`, (p) => truncate(p.description, 100))
    );
    return undefined;
  }

  load();
});