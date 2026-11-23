$(function () {
  // ROLE GUARD: the whole dashboard is admin-only. The API also rejects non-admins on /dashboard/admin.
  if (!Auth.requireAdmin()) return;
  Layout.init('dashboard');

  const $root = $('#dashboard');

  function toSeries(rows) {
    const sample = rows[0] || {};
    const keys = Object.keys(sample);
    const labelKey = keys.find((k) => typeof sample[k] === 'string' && !isNumeric(sample[k])) ?? keys[0];
    const valueKey = keys.find((k) => k !== labelKey && isNumeric(sample[k]));
    if (!valueKey) return [];
    return rows.map((r) => ({ label: String(r[labelKey]), value: Number(r[valueKey]) }));
  }

  // The stats shape is read generically: numbers become cards, lists and number-maps become charts.
  function collect(stats) {
    const cards = [];
    const charts = [];
    Object.entries(stats || {}).forEach(([key, value]) => {
      if (isNumeric(value)) {
        cards.push({ label: humanize(key), value: Number(value) });
      } else if (Array.isArray(value)) {
        const series = toSeries(value);
        if (series.length) charts.push({ title: humanize(key), series });
      } else if (value && typeof value === 'object') {
        const series = Object.entries(value).filter(([, v]) => isNumeric(v)).map(([k, v]) => ({ label: humanize(k), value: Number(v) }));
        if (series.length) charts.push({ title: humanize(key), series });
      }
    });
    return { cards, charts };
  }

  function chartHtml(title, series) {
    const max = Math.max(...series.map((s) => s.value), 1);
    return `<section class="card p-5"><h2 class="font-display text-lg font-bold">${esc(title)}</h2>
      <ul class="mt-4 space-y-3">${series.map((s) => `<li>
        <div class="flex justify-between text-sm"><span>${esc(s.label)}</span><span class="font-semibold">${s.value}</span></div>
        <div class="mt-1 h-3 rounded bg-slate-200" aria-hidden="true"><div class="h-3 rounded bg-civic" style="width:${(s.value / max) * 100}%"></div></div></li>`).join('')}</ul></section>`;
  }

  function render(stats) {
    const { cards, charts } = collect(stats);
    if (!cards.length && !charts.length) {
      renderState($root, { title: 'No statistics available', text: 'The server did not return any numbers yet.' });
      return;
    }
    const overview = cards.length > 1 ? [{ title: 'Overview', series: cards.map((c) => ({ label: c.label, value: c.value })) }] : [];
    $root.removeAttr('aria-busy').html(`
      <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${cards.map((c) =>
        `<div class="card p-5"><dt class="text-sm text-slate-700">${esc(c.label)}</dt><dd class="mt-1 font-display text-3xl font-bold">${c.value}</dd></div>`).join('')}</dl>
      <div class="mt-6 grid gap-6 lg:grid-cols-2">${[...overview, ...charts].map((c) => chartHtml(c.title, c.series)).join('')}</div>`);
  }

  async function load(initial = false) {
    if (initial) renderSkeletons($root, 3, 'h-16');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.adminStats);
      render(data);
      $('#updated').text(`Updated at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      if (initial) showError($root, err, () => load(true));
      else Toast.show('error', `Could not refresh the dashboard. ${err.message}`);
    }
  }

  $('#refresh').on('click', () => load());
  load(true);
  setInterval(load, 60000);
});