$(function () {
  // ROLE GUARD: user management is admin-only. Roles are never editable from this page.
  if (!Auth.requireAdmin()) return;
  Layout.init('users');

  const LIMIT = 10;
  const me = Auth.getUser();
  const $table = $('#users-table');
  let users = [];
  let total = null;
  let page = 1;

  function rowHtml(u) {
    const active = u.is_active !== false;
    const isSelf = String(u.id) === String(me.id);
    const toggle = isSelf ? '<span class="text-xs text-slate-600">This is you</span>'
      : `<button type="button" class="btn ${active ? 'btn-outline' : 'btn-solid'} !py-1" data-toggle="${esc(u.id)}">${active ? 'Disable' : 'Enable'}<span class="sr-only"> ${esc(u.full_name)}</span></button>`;
    return `<tr class="border-t border-slate-200">
      <td class="px-4 py-3 font-medium">${esc(u.full_name)}</td><td class="px-4 py-3">${esc(u.email)}</td>
      <td class="px-4 py-3"><span class="badge bg-civic-light text-civic-dark">${esc(u.role)}</span></td>
      <td class="px-4 py-3"><span class="badge ${active ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}">${active ? 'Active' : 'Disabled'}</span></td>
      <td class="px-4 py-3">${esc(fmtDate(u.created_at))}</td>
      <td class="flex gap-2 px-4 py-3"><button type="button" class="btn btn-outline !py-1" data-view="${esc(u.id)}">View<span class="sr-only"> ${esc(u.full_name)}</span></button>${toggle}</td></tr>`;
  }

  function render() {
    if (!users.length) {
      renderState($table, { title: 'No users on this page', text: page > 1 ? 'Go back to the previous page.' : 'No users were found.' });
    } else {
      $table.removeAttr('aria-busy').html(`<table class="w-full text-left text-sm"><caption class="sr-only">Registered users</caption>
        <thead class="bg-civic-light"><tr>${['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => `<th scope="col" class="px-4 py-3">${h}</th>`).join('')}</tr></thead>
        <tbody>${users.map(rowHtml).join('')}</tbody></table>`);
    }
    // The API may or may not report a total, so "next" falls back to checking for a full page.
    const hasNext = total ? page * LIMIT < total : users.length === LIMIT;
    $('#pagination').html(`<button type="button" class="btn btn-outline" data-dir="-1" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      <span class="text-sm" aria-current="page">Page ${page}</span>
      <button type="button" class="btn btn-outline" data-dir="1" ${hasNext ? '' : 'disabled'}>Next</button>`);
  }

  async function load() {
    $table.attr('aria-busy', 'true').html('<div class="space-y-3 p-4"><div class="skeleton h-8"></div><div class="skeleton h-8"></div><div class="skeleton h-8"></div></div>');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.users, { page, limit: LIMIT });
      users = asList(data);
      total = Number(data?.total ?? data?.pagination?.total) || null;
      render();
    } catch (err) {
      showError($table, err, load);
    }
  }

  $('#pagination').on('click', '[data-dir]', function () {
    page += Number($(this).attr('data-dir'));
    load();
  });

  $table.on('click', '[data-view]', async function () {
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.user($(this).attr('data-view')));
      const row = (label, value) => `<div class="flex justify-between gap-4"><dt class="font-medium">${label}</dt><dd>${value}</dd></div>`;
      openModal({
        title: data.full_name,
        body: `<dl class="space-y-2 text-sm">${row('Email', esc(data.email))}${row('Role', esc(data.role))}
          ${row('Status', data.is_active === false ? 'Disabled' : 'Active')}${row('Joined', esc(fmtDateTime(data.created_at)))}${row('User ID', esc(data.id))}</dl>`,
      });
    } catch (err) {
      Toast.show('error', err.message);
    }
  });

  $table.on('click', '[data-toggle]', async function () {
    const id = $(this).attr('data-toggle');
    const user = users.find((u) => String(u.id) === id);
    const disabling = user.is_active !== false;
    if (disabling) {
      const ok = await confirmDialog({ title: 'Disable account?', message: `${user.full_name} will no longer be able to use their account.`, confirmText: 'Disable', danger: true });
      if (!ok) return;
    }
    setButtonLoading($(this), true, 'Saving...');
    try {
      await Api.patch(disabling ? CONFIG.ENDPOINTS.disableUser(id) : CONFIG.ENDPOINTS.enableUser(id));
      user.is_active = !disabling;
      render();
      Toast.show('success', `${user.full_name} was ${disabling ? 'disabled' : 'enabled'}.`);
    } catch (err) {
      setButtonLoading($(this), false);
      Toast.show('error', err.message);
    }
  });

  load();
});