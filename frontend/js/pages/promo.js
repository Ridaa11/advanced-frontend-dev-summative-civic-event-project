$(function () {
  if (!Auth.requireAuth()) return;
  Layout.init('promos');

  const id = queryParam('id');
  const isAdmin = Auth.isAdmin();
  const $page = $('#promo-page');

  const stamp = (s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = (Math.floor((s % 60) * 1000) / 1000).toFixed(3).padStart(6, '0');
    return `${h}:${m}:${sec}`;
  };

  // The backend stores captions as plain text, so timed cues are spread across the video by sentence length.
  function buildVtt(text, duration) {
    const lines = (text.match(/[^.!?\n]+[.!?]*/g) || []).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return null;
    const total = Number.isFinite(duration) && duration > 0 ? duration : lines.length * 4;
    const weight = lines.reduce((sum, l) => sum + l.length, 0);
    let cursor = 0;
    const cues = lines.map((line, i) => {
      const start = cursor;
      cursor += (line.length / weight) * total;
      return `${stamp(start)} --> ${stamp(i === lines.length - 1 ? total : cursor)}\n${line}`;
    });
    return `WEBVTT\n\n${cues.join('\n\n')}\n`;
  }

  function attachCaptions(video, captionText) {
    const add = () => {
      const vtt = buildVtt(captionText, video.duration);
      if (!vtt) return;
      const url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
      $(video).append(`<track kind="captions" srclang="en" label="English" src="${url}" default>`);
      if (video.textTracks[0]) video.textTracks[0].mode = 'showing';
    };
    if (video.readyState >= 1) add();
    else video.addEventListener('loadedmetadata', add, { once: true });
  }

  function render(p) {
    // ROLE GUARD: admin-only controls.
    const adminActions = isAdmin
      ? `<div class="mt-6 flex flex-wrap gap-3"><a class="btn btn-outline" href="/admin/promo-form.html?id=${esc(p.id)}">Edit</a>
         <button type="button" class="btn btn-outline" id="toggle">${p.published === false ? 'Publish' : 'Unpublish'}</button>
         <button type="button" class="btn btn-danger" id="delete">Delete</button></div>` : '';

    $page.removeAttr('aria-busy').html(`
      <a href="/promos.html" class="text-sm font-medium text-civic underline">&larr; All promos</a>
      <div class="mt-4 flex items-start gap-3"><h1 class="font-display text-3xl font-bold">${esc(p.title)}</h1>
        ${p.published === false ? '<span class="badge bg-amber-100 text-amber-900">Draft</span>' : ''}</div>
      <video id="video" controls preload="metadata" class="mt-6 aspect-video w-full rounded-lg bg-black" aria-label="Video: ${esc(p.title)}">
        <source src="${esc(fileUrl(p.video_url))}">
        Your browser cannot play this video. <a href="${esc(fileUrl(p.video_url))}" download>Download it instead</a>.
      </video>
      <p class="mt-4 max-w-3xl whitespace-pre-line">${esc(p.description || '')}</p>
      ${p.caption_text ? `<details class="card mt-6 p-4"><summary class="cursor-pointer font-semibold">Transcript</summary><p class="mt-3 whitespace-pre-line">${esc(p.caption_text)}</p></details>` : ''}
      ${adminActions}`);

    if (p.caption_text) attachCaptions(document.getElementById('video'), p.caption_text);

    $('#toggle').on('click', async function () {
      const wasDraft = p.published === false;
      setButtonLoading($(this), true);
      try {
        await Api.patch(wasDraft ? CONFIG.ENDPOINTS.publishPromo(id) : CONFIG.ENDPOINTS.unpublishPromo(id));
        PageCache.clear('promos');
        p.published = wasDraft;
        Toast.show('success', wasDraft ? 'Promo published.' : 'Promo unpublished.');
        const video = document.getElementById('video');
        const time = video.currentTime;
        render(p);
        document.getElementById('video').currentTime = time;
      } catch (err) {
        setButtonLoading($(this), false);
        Toast.show('error', err.message);
      }
    });

    $('#delete').on('click', async () => {
      if (!isAdmin) return;
      const ok = await confirmDialog({ title: 'Delete promo?', message: 'It will be permanently removed.', confirmText: 'Delete', danger: true });
      if (!ok) return;
      try {
        await Api.delete(CONFIG.ENDPOINTS.promo(id));
        PageCache.clear('promos');
        Toast.flash('success', 'Promo deleted.');
        window.location.href = '/promos.html';
      } catch (err) {
        Toast.show('error', err.message);
      }
    });
  }

  async function load() {
    if (!id) return showError($page, { message: 'No promo was selected.' });
    $page.attr('aria-busy', 'true').html('<div class="skeleton h-10 w-2/3"></div><div class="skeleton mt-6 aspect-video w-full"></div>');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.promo(id));
      if (data.published === false && !isAdmin) throw { message: 'Promo not found.' };
      render(data);
    } catch (err) {
      showError($page, err, load);
    }
    return undefined;
  }

  load();
});