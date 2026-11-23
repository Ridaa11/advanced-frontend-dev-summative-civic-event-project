const Toast = (() => {
  const FLASH_KEY = 'civic_flash';
  const STYLES = {
    success: 'bg-green-700',
    error: 'bg-red-700',
    info: 'bg-slate-800',
  };

  function region() {
    let el = document.getElementById('toast-region');
    if (!el) {
      el = $('<div id="toast-region" class="fixed top-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"></div>')
        .appendTo('body')[0];
    }
    return el;
  }

  function show(type, message, duration = 4500) {
    const $toast = $('<div class="rounded-md px-4 py-3 text-sm text-white shadow-lg"></div>')
      .addClass(STYLES[type] || STYLES.info)
      .attr('role', type === 'error' ? 'alert' : 'status')
      .text(message)
      .appendTo(region());

    setTimeout(() => $toast.fadeOut(200, () => $toast.remove()), duration);
  }

  // Redirects wipe the page, so a message meant for the next page is parked in sessionStorage.
  function flash(type, message) {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ type, message }));
  }

  function showPendingFlash() {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);
    const { type, message } = JSON.parse(raw);
    show(type, message);
  }

  $(showPendingFlash);

  return { show, flash };
})();

function setButtonLoading($btn, isLoading, loadingText = 'Please wait...') {
  if (isLoading) {
    $btn.data('label', $btn.text()).text(loadingText).prop('disabled', true).attr('aria-busy', 'true');
  } else {
    $btn.text($btn.data('label')).prop('disabled', false).removeAttr('aria-busy');
  }
}

function setFieldError($input, message) {
  $input.attr('aria-invalid', 'true');
  $(`#${$input.attr('id')}-error`).text(message).removeClass('hidden');
}

function clearFieldErrors($form) {
  $form.find('[aria-invalid]').removeAttr('aria-invalid');
  $form.find('[id$="-error"]').addClass('hidden').text('');
}

function showFormError(message) {
  $('#form-error').text(message).removeClass('hidden');
}

$(document).on('click', '[data-toggle-password]', function () {
  const $btn = $(this);
  const $input = $($btn.data('togglePassword'));
  const reveal = $input.attr('type') === 'password';
  $input.attr('type', reveal ? 'text' : 'password');
  $btn.text(reveal ? 'Hide' : 'Show').attr('aria-pressed', reveal);
});

function validateFile(file, rule) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!rule.exts.includes(ext)) return `Unsupported ${rule.label}. Allowed types: ${rule.exts.join(', ')}.`;
  if (file.size > rule.maxMB * 1024 * 1024) {
    return `That ${rule.label} is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${rule.maxMB} MB.`;
  }
  return null;
}

function renderSkeletons($el, count = 6, height = 'h-44') {
  const card = `<div class="card p-4"><div class="skeleton ${height}"></div><div class="skeleton mt-4 h-4 w-3/4"></div><div class="skeleton mt-2 h-4 w-1/2"></div></div>`;
  $el.attr('aria-busy', 'true').html(card.repeat(count));
}

function renderState($el, { title, text = '', actionHtml = '' }) {
  $el.removeAttr('aria-busy').html(
    `<div class="card col-span-full p-8 text-center"><h2 class="font-display text-xl font-bold">${esc(title)}</h2>
     <p class="mt-2 text-slate-700">${esc(text)}</p><div class="mt-4 flex flex-wrap justify-center gap-3">${actionHtml}</div></div>`
  );
}

function showError($el, err, retry) {
  const forbidden = err.status === 403;
  const actions = [];
  if (retry) actions.push('<button type="button" class="btn btn-solid" data-retry>Try again</button>');
  if (forbidden) actions.push(`<a class="btn btn-outline" href="mailto:${CONFIG.SUPPORT_EMAIL}">Contact an administrator</a>`);
  renderState($el, { title: forbidden ? 'Access denied' : 'Something went wrong', text: err.message, actionHtml: actions.join('') });
  if (retry) $el.find('[data-retry]').on('click', retry);
}

function openModal({ title, body, footer = '' }) {
  const $d = $(
    `<dialog class="w-full max-w-lg rounded-lg p-0 backdrop:bg-black/50" aria-labelledby="modal-title"><div class="p-6">
       <div class="flex items-start justify-between gap-4"><h2 id="modal-title" class="font-display text-xl font-bold">${esc(title)}</h2>
       <button type="button" class="btn btn-outline !px-2 !py-1" data-close aria-label="Close">&times;</button></div>
       <div class="mt-4">${body}</div><div class="mt-6 flex flex-wrap justify-end gap-3">${footer}</div></div></dialog>`
  ).appendTo('body');
  $d.on('click', (e) => {
    if (e.target === $d[0] || $(e.target).closest('[data-close]').length) $d[0].close();
  });
  $d.on('close', () => $d.remove());
  $d[0].showModal();
  return $d;
}

function confirmDialog({ title, message, confirmText = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const $d = $(
      `<dialog class="w-full max-w-md rounded-lg p-0 backdrop:bg-black/50" aria-labelledby="confirm-title"><div class="p-6">
         <h2 id="confirm-title" class="font-display text-xl font-bold">${esc(title)}</h2>
         <p class="mt-2 text-slate-700">${esc(message)}</p>
         <div class="mt-6 flex justify-end gap-3"><button type="button" class="btn btn-outline" data-cancel>Cancel</button>
         <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-solid'}" data-ok>${esc(confirmText)}</button></div></div></dialog>`
    ).appendTo('body');
    const finish = (result) => {
      $d[0].close();
      $d.remove();
      resolve(result);
    };
    $d.find('[data-ok]').on('click', () => finish(true));
    $d.find('[data-cancel]').on('click', () => finish(false));
    $d.on('cancel', (e) => {
      e.preventDefault();
      finish(false);
    });
    $d[0].showModal();
  });
}

function renderPagination($el, page, totalPages, onChange) {
  if (totalPages <= 1) {
    $el.empty();
    return;
  }
  $el.html(
    `<button type="button" class="btn btn-outline" data-dir="-1" ${page <= 1 ? 'disabled' : ''}>Previous</button>
     <span class="text-sm" aria-current="page">Page ${page} of ${totalPages}</span>
     <button type="button" class="btn btn-outline" data-dir="1" ${page >= totalPages ? 'disabled' : ''}>Next</button>`
  );
  $el.find('[data-dir]').on('click', function () {
    onChange(page + Number($(this).attr('data-dir')));
  });
}

// Videos only start downloading once they scroll near the viewport.
function lazyLoadMedia(root = document) {
  const items = $(root).find('[data-src]').toArray();
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => { el.src = el.dataset.src; });
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.src = entry.target.dataset.src;
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '200px' });
  items.forEach((el) => observer.observe(el));
}

function showUploadProgress(percent) {
  $('#upload-box').removeClass('hidden');
  $('#upload-progress').val(percent);
  $('#upload-text').text(percent < 100 ? `Uploading... ${percent}%` : 'Upload finished, saving...');
}