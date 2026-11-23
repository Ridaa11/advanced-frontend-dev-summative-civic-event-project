$(function () {
  // ROLE GUARD: creating and editing promos is admin-only.
  if (!Auth.requireAdmin()) return;
  Layout.init('promos');

  const id = queryParam('id');
  const $form = $('#promo-form');
  const $video = $('#video');
  const $preview = $('#video-preview');

  async function loadExisting() {
    $('#form-title').text('Edit promo');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.promo(id));
      $('#title').val(data.title);
      $('#description').val(data.description || '');
      $('#caption_text').val(data.caption_text || '');
      $preview.attr('src', fileUrl(data.video_url)).removeClass('hidden');
    } catch (err) {
      showFormError(err.message);
    }
  }

  $video.on('change', function () {
    $('#video-error').addClass('hidden').text('');
    $video.removeAttr('aria-invalid');
    const file = this.files[0];
    if (!file) return;
    const problem = validateFile(file, CONFIG.FILE_RULES.video);
    if (problem) {
      this.value = '';
      setFieldError($video, problem);
      return;
    }
    $preview.attr('src', URL.createObjectURL(file)).removeClass('hidden');
  });

  function validate() {
    clearFieldErrors($form);
    const invalid = [];
    const fail = ($el, message) => {
      setFieldError($el, message);
      invalid.push($el);
    };
    if (!$('#title').val().trim()) fail($('#title'), 'Enter a title.');
    if (!$('#description').val().trim()) fail($('#description'), 'Enter a description.');
    if (!$('#caption_text').val().trim()) fail($('#caption_text'), 'Enter the caption text.');
    if (!id && !$video[0].files[0]) fail($video, 'Choose a video file.');
    if (invalid.length) invalid[0].trigger('focus');
    return invalid.length === 0;
  }

  $form.on('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const body = new FormData();
    body.append('title', $('#title').val().trim());
    body.append('description', $('#description').val().trim());
    body.append('caption_text', $('#caption_text').val().trim());
    const file = $video[0].files[0];
    if (file) body.append('video', file);

    const $btn = $form.find('button[type="submit"]');
    setButtonLoading($btn, true, 'Saving...');
    try {
      const res = await Api.upload(id ? 'PUT' : 'POST', id ? CONFIG.ENDPOINTS.promo(id) : CONFIG.ENDPOINTS.promos, body, file ? showUploadProgress : null);
      PageCache.clear('promos');
      Toast.flash('success', id ? 'Promo updated.' : 'Promo created.');
      window.location.href = `/promo.html?id=${encodeURIComponent(res.data?.id || id)}`;
    } catch (err) {
      showFormError(err.message);
      setButtonLoading($btn, false);
    }
  });

  if (id) loadExisting();
});