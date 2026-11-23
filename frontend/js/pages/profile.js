$(function () {
  if (!Auth.requireAuth()) return;
  Layout.init('');

  const $page = $('#profile-page');
  let profile = null;

  function render() {
    $page.removeAttr('aria-busy').html(`
      <section class="card p-6" aria-labelledby="account-title"><h2 id="account-title" class="font-display text-xl font-bold">Account</h2>
        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex justify-between"><dt class="font-medium">Role</dt><dd><span class="badge bg-civic-light text-civic-dark">${esc(profile.role)}</span></dd></div>
          <div class="flex justify-between"><dt class="font-medium">Status</dt><dd><span class="badge ${profile.is_active === false ? 'bg-red-100 text-red-900' : 'bg-green-100 text-green-900'}">${profile.is_active === false ? 'Disabled' : 'Active'}</span></dd></div>
          <div class="flex justify-between"><dt class="font-medium">Member since</dt><dd>${esc(fmtDate(profile.created_at))}</dd></div>
        </dl><p class="mt-4 text-xs text-slate-600">Your role and status can only be changed by an administrator.</p></section>
      <form id="profile-form" class="card space-y-5 p-6" novalidate aria-labelledby="edit-title">
        <h2 id="edit-title" class="font-display text-xl font-bold">Edit details</h2>
        <p id="form-error" role="alert" class="hidden rounded-md border border-alert bg-red-50 px-3 py-2 text-sm text-alert"></p>
        <div><label for="full_name" class="block text-sm font-medium">Full name</label>
          <input id="full_name" class="field" value="${esc(profile.full_name)}" aria-describedby="full_name-error"><p id="full_name-error" class="field-error"></p></div>
        <div><label for="email" class="block text-sm font-medium">Email</label>
          <input id="email" type="email" class="field" value="${esc(profile.email)}" aria-describedby="email-error"><p id="email-error" class="field-error"></p></div>
        <button type="submit" class="btn btn-solid">Save changes</button></form>`);
  }

  async function load() {
    $page.attr('aria-busy', 'true').html('<div class="skeleton h-48"></div><div class="skeleton h-48"></div>');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.myProfile);
      profile = data;
      render();
    } catch (err) {
      showError($page, err, load);
    }
  }

  $page.on('submit', '#profile-form', async function (e) {
    e.preventDefault();
    const $form = $(this);
    const $name = $('#full_name');
    const $email = $('#email');
    clearFieldErrors($form);

    const name = $name.val().trim();
    const email = $email.val().trim();
    if (!name) return setFieldError($name, 'Full name cannot be empty.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setFieldError($email, 'Enter a valid email address.');

    // Only role-free fields are ever sent; the backend rejects role and is_active.
    const changes = {};
    if (name !== profile.full_name) changes.full_name = name;
    if (email !== profile.email) changes.email = email;
    if (!Object.keys(changes).length) return Toast.show('info', 'Nothing to update.');

    const $btn = $form.find('button[type="submit"]');
    setButtonLoading($btn, true, 'Saving...');
    try {
      const { data } = await Api.patch(CONFIG.ENDPOINTS.myProfile, changes);
      profile = { ...profile, ...changes, ...(data || {}) };
      Auth.updateUser({ full_name: profile.full_name });
      Layout.setUserName(profile.full_name);
      Toast.show('success', 'Profile updated.');
      render();
    } catch (err) {
      if (err.status === 409) {
        setFieldError($email, 'That email is already used by another account.');
        Toast.show('error', 'Email already in use. Choose a different one.');
      } else {
        showFormError(err.message);
      }
      setButtonLoading($btn, false);
    }
    return undefined;
  });

  load();
});