$(function () {
  // ROLE GUARD: creating and editing announcements is admin-only.
  if (!Auth.requireAdmin()) return;
  Layout.init('announcements');

  const id = queryParam('id');
  const $form = $('#announcement-form');
  const $audio = $('#audio');
  const $preview = $('#audio-preview');

  async function loadExisting() {
    $('#form-title').text('Edit announcement');
    // Publish state is changed with the publish/unpublish buttons on the list, not here.
    $('#published-row').addClass('hidden');
    $audio.removeAttr('required');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.announcement(id));
      $('#title').val(data.title);
      $preview.attr('src', fileUrl(data.audio_url)).removeClass('hidden');
    } catch (err) {
      showFormError(err.message);
    }
  }

  $audio.on('change', function () {
    $('#audio-error').addClass('hidden').text('');
    $audio.removeAttr('aria-invalid');
    const file = this.files[0];
    if (!file) return;
    const problem = validateFile(file, CONFIG.FILE_RULES.audio);
    if (problem) {
      this.value = '';
      setFieldError($audio, problem);
      return;
    }
    $preview.attr('src', URL.createObjectURL(file)).removeClass('hidden');
  });

  function validate() {
    clearFieldErrors($form);
    const invalid = [];
    if (!$('#title').val().trim()) {
      setFieldError($('#title'), 'Enter a title.');
      invalid.push($('#title'));
    }
    if (!id && !$audio[0].files[0]) {
      setFieldError($audio, 'Choose an audio file.');
      invalid.push($audio);
    }
    if (invalid.length) invalid[0].trigger('focus');
    return invalid.length === 0;
  }

  $form.on('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const body = new FormData();
    body.append('title', $('#title').val().trim());
    if (!id) body.append('published', $('#published').is(':checked'));
    const file = $audio[0].files[0];
    if (file) body.append('audio', file);

    const $btn = $form.find('button[type="submit"]');
    setButtonLoading($btn, true, 'Saving...');
    try {
      const res = await Api.upload(id ? 'PUT' : 'POST', id ? CONFIG.ENDPOINTS.announcement(id) : CONFIG.ENDPOINTS.announcements, body, file ? showUploadProgress : null);
      Toast.flash('success', id ? 'Announcement updated.' : 'Announcement created. Users have been notified.');
      window.location.href = `/announcement.html?id=${encodeURIComponent(res.data?.id || id)}`;
    } catch (err) {
      showFormError(err.message);
      setButtonLoading($btn, false);
    }
  });

  if (id) loadExisting();
});