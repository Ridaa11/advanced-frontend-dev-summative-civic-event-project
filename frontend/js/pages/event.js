$(function () {
  if (!Auth.requireAuth()) return;
  Layout.init('events');

  const id = queryParam('id');
  const isAdmin = Auth.isAdmin();
  const $page = $('#event-page');
  let event = null;
  let registered = false;
  let myFeedback = null;

  const hasEnded = () => new Date(event.ends_at || event.starts_at) < Date.now();

  function actionsHtml() {
    // ROLE GUARD: admins manage the event; normal users register or cancel.
    if (isAdmin) {
      return `<a class="btn btn-outline" href="/admin/event-form.html?id=${esc(id)}">Edit</a>
              <button type="button" class="btn btn-danger" id="delete-event">Delete</button>`;
    }
    if (registered) {
      return `<span class="badge bg-green-100 text-green-900">You are registered</span>
              <button type="button" class="btn btn-outline" id="cancel-registration">Cancel registration</button>`;
    }
    return hasEnded() ? '<span class="badge bg-slate-100 text-slate-800">This event has ended</span>'
      : '<button type="button" class="btn btn-solid" id="register">Register</button>';
  }

  function stars(rating) {
    return `<span aria-hidden="true" class="text-amber-500">${'&#9733;'.repeat(rating)}<span class="text-slate-300">${'&#9733;'.repeat(5 - rating)}</span></span><span class="sr-only">${rating} out of 5</span>`;
  }

  function feedbackFormHtml() {
    const starInputs = [1, 2, 3, 4, 5].map((n) =>
      `<label class="cursor-pointer"><input type="radio" name="rating" value="${n}" class="peer sr-only" ${myFeedback?.rating === n ? 'checked' : ''}>
       <span class="star text-3xl text-slate-400 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-civic" aria-hidden="true">&#9733;</span>
       <span class="sr-only">${n} star${n > 1 ? 's' : ''}</span></label>`).join('');
    return `<form id="feedback-form" class="card mt-4 max-w-xl space-y-4 p-5" novalidate>
      <p id="form-error" role="alert" class="hidden rounded-md border border-alert bg-red-50 px-3 py-2 text-sm text-alert"></p>
      <fieldset><legend class="text-sm font-medium">Rating</legend><div class="mt-1 flex gap-1">${starInputs}</div>
        <p id="rating-error" class="field-error"></p></fieldset>
      <div><label for="comment" class="block text-sm font-medium">Comment</label>
        <textarea id="comment" rows="3" maxlength="500" class="field" aria-describedby="comment-error">${esc(myFeedback?.comment || '')}</textarea>
        <p id="comment-error" class="field-error"></p></div>
      <button type="submit" class="btn btn-solid">${myFeedback ? 'Update feedback' : 'Submit feedback'}</button></form>`;
  }

  function paintStars() {
    const value = Number($('#feedback-form input[name="rating"]:checked').val() || 0);
    $('#feedback-form .star').each((i, el) => {
      $(el).toggleClass('text-amber-500', i < value).toggleClass('text-slate-400', i >= value);
    });
  }

  function renderFeedback() {
    const $f = $('#feedback');
    if (isAdmin) {
      $f.html('<h2 class="font-display text-2xl font-bold">Feedback</h2><div id="feedback-admin" class="mt-4"></div>');
      return;
    }
    $f.html(`<h2 class="font-display text-2xl font-bold">Your feedback</h2>
      <p class="mt-1 text-sm text-slate-700">You can leave one rating per event. Everyone's feedback is visible to organisers.</p>${feedbackFormHtml()}`);
    paintStars();
  }

  function render() {
    const image = event.metadata?.image_url;
    const map = event.location
      ? ` <a class="text-civic underline" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}">View on map</a>` : '';
    $page.removeAttr('aria-busy').html(`
      <a href="/events.html" class="text-sm font-medium text-civic underline">&larr; All events</a>
      ${image ? `<img src="${esc(fileUrl(image))}" alt="${esc(event.title)} event image" class="mt-4 max-h-96 w-full rounded-lg object-cover">` : ''}
      <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 class="font-display text-3xl font-bold">${esc(event.title)}</h1>
          <dl class="mt-3 space-y-1">
            <div class="flex gap-2"><dt class="font-semibold">Starts</dt><dd>${esc(fmtDateTime(event.starts_at))}</dd></div>
            <div class="flex gap-2"><dt class="font-semibold">Ends</dt><dd>${esc(fmtDateTime(event.ends_at))}</dd></div>
            <div class="flex gap-2"><dt class="font-semibold">Where</dt><dd>${esc(event.location || 'To be announced')}${map}</dd></div>
          </dl></div>
        <div id="event-actions" class="flex flex-wrap items-center gap-3">${actionsHtml()}</div>
      </div>
      <p class="mt-6 max-w-3xl whitespace-pre-line">${esc(event.description || 'No description provided.')}</p>
      <section id="feedback" class="mt-12" aria-label="Feedback"></section>
      ${isAdmin ? '<section id="attendees" class="mt-12" aria-label="Registered attendees"></section>' : ''}`);
    renderFeedback();
  }

  // ROLE GUARD: attendee list and all-feedback list are only requested for admins.
  async function loadAdminSections() {
    const [attendees, feedback] = await Promise.allSettled([
      Api.get(CONFIG.ENDPOINTS.attendees(id)),
      Api.get(CONFIG.ENDPOINTS.eventFeedback(id)),
    ]);

    const $att = $('#attendees');
    if (attendees.status === 'rejected') {
      showError($att, attendees.reason, loadAdminSections);
    } else {
      const rows = asList(attendees.value.data);
      $att.html(`<h2 class="font-display text-2xl font-bold">Registered attendees (${rows.length})</h2>` + (rows.length
        ? `<div class="card mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-civic-light"><tr><th class="px-4 py-2">Name</th><th class="px-4 py-2">Email</th><th class="px-4 py-2">Registered</th></tr></thead><tbody>
          ${rows.map((a) => `<tr class="border-t border-slate-200"><td class="px-4 py-2">${esc(a.full_name || a.name || a.user_id)}</td><td class="px-4 py-2">${esc(a.email || '')}</td><td class="px-4 py-2">${esc(fmtDate(a.created_at))}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="mt-2 text-slate-700">Nobody has registered yet.</p>'));
    }

    const $fb = $('#feedback-admin');
    if (feedback.status === 'rejected') {
      showError($fb, feedback.reason, loadAdminSections);
    } else {
      const rows = asList(feedback.value.data);
      const avg = rows.length ? rows.reduce((sum, f) => sum + Number(f.rating), 0) / rows.length : 0;
      $fb.html(rows.length
        ? `<p class="text-lg"><span class="font-semibold">${avg.toFixed(1)}</span> / 5 average from ${rows.length} review${rows.length > 1 ? 's' : ''}</p>
           <ul class="mt-4 space-y-3">${rows.map((f) => `<li class="card p-4">${stars(Number(f.rating))}
           <p class="mt-1 whitespace-pre-line">${esc(f.comment || '')}</p>
           <p class="mt-1 text-xs text-slate-600">${esc(f.full_name || 'Attendee')} &middot; ${esc(fmtDate(f.created_at))}</p></li>`).join('')}</ul>`
        : '<p class="text-slate-700">No feedback yet.</p>');
    }
  }

  async function load() {
    if (!id) return showError($page, { message: 'No event was selected.' });
    $page.attr('aria-busy', 'true').html('<div class="skeleton h-72"></div><div class="skeleton mt-6 h-8 w-2/3"></div><div class="skeleton mt-3 h-4 w-1/3"></div>');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.event(id));
      if (data.published === false && !isAdmin) throw { message: 'Event not found.' };
      event = data;
      if (!isAdmin) {
        const [regs, fb] = await Promise.all([Api.get(CONFIG.ENDPOINTS.myRegistrations), Api.get(CONFIG.ENDPOINTS.myFeedback)]);
        registered = asList(regs.data).some((r) => String(r.event_id) === String(id) && isActiveRegistration(r));
        myFeedback = asList(fb.data).find((f) => String(f.event_id) === String(id)) || null;
      }
      render();
      if (isAdmin) loadAdminSections();
    } catch (err) {
      showError($page, err, load);
    }
    return undefined;
  }

  async function changeRegistration($btn, endpoint, message) {
    setButtonLoading($btn, true, 'Please wait...');
    try {
      await Api.post(endpoint, { event_id: id });
      registered = endpoint === CONFIG.ENDPOINTS.register;
      $('#event-actions').html(actionsHtml());
      Toast.show('success', message);
    } catch (err) {
      setButtonLoading($btn, false);
      Toast.show('error', err.message);
    }
  }

  $page.on('click', '#register', function () {
    changeRegistration($(this), CONFIG.ENDPOINTS.register, 'You are registered for this event.');
  });

  $page.on('click', '#cancel-registration', async function () {
    const ok = await confirmDialog({ title: 'Cancel registration?', message: 'You can register again later if there is still space.', confirmText: 'Cancel registration', danger: true });
    if (ok) changeRegistration($(this), CONFIG.ENDPOINTS.cancelRegistration, 'Your registration was cancelled.');
  });

  $page.on('click', '#delete-event', async function () {
    if (!isAdmin) return;
    const ok = await confirmDialog({ title: 'Delete event?', message: `"${event.title}" will be permanently removed.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await Api.delete(CONFIG.ENDPOINTS.event(id));
      Toast.flash('success', 'Event deleted.');
      window.location.href = '/events.html';
    } catch (err) {
      Toast.show('error', err.message);
    }
  });

  $page.on('change', 'input[name="rating"]', paintStars);

  $page.on('submit', '#feedback-form', async function (e) {
    e.preventDefault();
    const $form = $(this);
    clearFieldErrors($form);
    const rating = Number($form.find('input[name="rating"]:checked').val());
    if (!rating) {
      $('#rating-error').text('Choose a rating from 1 to 5.').removeClass('hidden');
      return;
    }
    const body = { rating, comment: $('#comment').val().trim() };
    const $btn = $form.find('button[type="submit"]');
    setButtonLoading($btn, true, 'Saving...');
    try {
      const res = myFeedback
        ? await Api.put(CONFIG.ENDPOINTS.feedbackItem(myFeedback.id), body)
        : await Api.post(CONFIG.ENDPOINTS.feedback, { event_id: id, ...body });
      myFeedback = res.data || { ...myFeedback, ...body };
      Toast.show('success', 'Thanks for your feedback.');
      renderFeedback();
    } catch (err) {
      showFormError(err.message);
      setButtonLoading($btn, false);
    }
  });

  load();
});