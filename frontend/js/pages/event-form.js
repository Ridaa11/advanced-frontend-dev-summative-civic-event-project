$(function () {
  // ROLE GUARD: creating and editing events is admin-only.
  if (!Auth.requireAdmin()) return;
  Layout.init('events');

  const id = queryParam('id');
  const $form = $('#event-form');
  const $image = $('#image');
  const $preview = $('#image-preview');

  async function loadExisting() {
    $('#form-title').text('Edit event');
    try {
      const { data } = await Api.get(CONFIG.ENDPOINTS.event(id));
      $('#title').val(data.title);
      $('#description').val(data.description || '');
      $('#location').val(data.location || '');
      $('#starts_at').val(toLocalInput(data.starts_at));
      $('#ends_at').val(toLocalInput(data.ends_at));
      if (data.metadata?.image_url) $preview.attr('src', fileUrl(data.metadata.image_url)).removeClass('hidden');
    } catch (err) {
      showFormError(err.message);
    }
  }

  $image.on('change', function () {
    $('#image-error').addClass('hidden').text('');
    $image.removeAttr('aria-invalid');
    const file = this.files[0];
    if (!file) return;
    const problem = validateFile(file, CONFIG.FILE_RULES.image);
    if (problem) {
      this.value = '';
      setFieldError($image, problem);
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
    if (!$('#location').val().trim()) fail($('#location'), 'Enter a location.');
    if (!$('#starts_at').val()) fail($('#starts_at'), 'Choose a start date and time.');
    if (!$('#ends_at').val()) fail($('#ends_at'), 'Choose an end date and time.');
    else if ($('#starts_at').val() && $('#ends_at').val() < $('#starts_at').val()) fail($('#ends_at'), 'The end must be after the start.');
    if (invalid.length) invalid[0].trigger('focus');
    return invalid.length === 0;
  }

  $form.on('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const body = new FormData();
    body.append('title', $('#title').val().trim());
    body.append('description', $('#description').val().trim());
    body.append('location', $('#location').val().trim());
    body.append('starts_at', new Date($('#starts_at').val()).toISOString());
    body.append('ends_at', new Date($('#ends_at').val()).toISOString());
    const file = $image[0].files[0];
    if (file) body.append('image', file);

    const $btn = $form.find('button[type="submit"]');
    setButtonLoading($btn, true, 'Saving...');
    try {
      const res = await Api.upload(id ? 'PUT' : 'POST', id ? CONFIG.ENDPOINTS.event(id) : CONFIG.ENDPOINTS.events, body, file ? showUploadProgress : null);
      Toast.flash('success', id ? 'Event updated.' : 'Event created. Users have been notified.');
      window.location.href = `/event.html?id=${encodeURIComponent(res.data?.id || id)}`;
    } catch (err) {
      showFormError(err.message);
      setButtonLoading($btn, false);
    }
  });

  if (id) loadExisting();
});