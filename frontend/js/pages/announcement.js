$(function () {
  if (!Auth.requireAuth()) return;
  Layout.init('announcements');

  const id = queryParam('id');
  const isAdmin = Auth.isAdmin();
  const $page = $('#announcement-page');
  const MIME = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg' };

  function render(a) {
    const url = fileUrl(a.audio_url);
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    // ROLE GUARD: admin-only controls.
    const adminActions = isAdmin
      ? `<div class="mt-6 flex gap-3"><a class="btn btn-outline" href="/admin/announcement-form.html?id=${esc(a.id)}">Edit</a>
         <button type="button" class="btn btn-danger" id="delete">Delete</button></div>` : '';

    $page.removeAttr('aria-busy').html(`
      <a href="/announcements.html" class="text-sm font-medium text-civic underline">&larr; All announcements</a>
      <div class="mt-4 flex items-start gap-3"><h1 class="font-display text-3xl font-bold">${esc(a.title)}</h1>
        ${a.published === false ? '<span class="badge bg-amber-100 text-amber-900">Draft</span>' : ''}</div>
      <p class="mt-1 text-slate-700">Posted ${esc(fmtDate(a.created_at))}</p>
      <div class="card mt-6 p-5">
        <audio id="audio" controls preload="metadata" class="w-full" aria-label="Audio for ${esc(a.title)}">
          <source src="${esc(url)}"${MIME[ext] ? ` type="${MIME[ext]}"` : ''}>
          Your browser cannot play this audio. <a href="${esc(url)}" download>Download the file instead</a>.
        </audio>
        <p id="time-readout" class="mt-2 text-sm text-slate-700">0:00 / --:--</p>
      </div>
      ${a.transcript ? `<section class="mt-8"><h2 class="font-display text-xl font-bold">Transcript</h2><p class="mt-2 whitespace-pre-line">${esc(a.transcript)}</p></section>` : ''}
      ${adminActions}`);

    const audio = document.getElementById('audio');
    const readout = () => $('#time-readout').text(`${fmtDuration(audio.currentTime)} / ${fmtDuration(audio.duration)}`);
    ['loadedmetadata', 'timeupdate'].forEach((name) => audio.addEventListener(name, readout));
    audio.addEventListener('error', () => Toast.show('error', 'This audio could not be loaded.'));
  }

  async function load() {
    if (!id) return showError($page, { message: 'No announcement was selected.' });
    $page.attr('aria-busy', 'true').html('<div class="skeleton h-10 w-2/3"></div><div class="skeleton mt-6 h-24"></div>');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.announcement(id));
      if (data.published === false && !isAdmin) throw { message: 'Announcement not found.' };
      render(data);
    } catch (err) {
      showError($page, err, load);
    }
    return undefined;
  }

  $page.on('click', '#delete', async () => {
    if (!isAdmin) return;
    const ok = await confirmDialog({ title: 'Delete announcement?', message: 'It will be permanently removed.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await Api.delete(CONFIG.ENDPOINTS.announcement(id));
      Toast.flash('success', 'Announcement deleted.');
      window.location.href = '/announcements.html';
    } catch (err) {
      Toast.show('error', err.message);
    }
  });

  load();
});