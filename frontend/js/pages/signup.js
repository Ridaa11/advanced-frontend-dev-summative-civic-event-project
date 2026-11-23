$(function () {
  if (Auth.redirectIfLoggedIn()) return;

  const $form = $('#signup-form');
  const $name = $('#full_name');
  const $email = $('#email');
  const $password = $('#password');
  const $confirm = $('#confirm_password');

  const RULES = {
    length: (v) => v.length >= 8,
    case: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
    number: (v) => /\d/.test(v),
    special: (v) => /[^A-Za-z0-9]/.test(v),
  };
  const LEVELS = [
    { label: 'enter a password', color: '' },
    { label: 'weak', color: 'bg-alert' },
    { label: 'fair', color: 'bg-amber-600' },
    { label: 'good', color: 'bg-lime-700' },
    { label: 'strong', color: 'bg-green-700' },
  ];
  const ALL_COLORS = LEVELS.map((l) => l.color).join(' ');

  const passesPolicy = (value) => Object.values(RULES).every((test) => test(value));

  function updateMeter() {
    const value = $password.val();
    let score = 0;

    $.each(RULES, (key, test) => {
      const met = test(value);
      if (met) score += 1;
      const $item = $(`#password-rules [data-rule="${key}"]`);
      $item.toggleClass('text-green-800', met).toggleClass('text-slate-700', !met);
      $item.find('.mark').text(met ? '✓' : '○');
      $item.find('.state').text(met ? ' met' : ' not met');
    });

    const level = value ? LEVELS[score] : LEVELS[0];
    $('.strength-seg').each((i, seg) => {
      $(seg).removeClass(ALL_COLORS).toggleClass('bg-slate-200', i >= score || !value);
      if (value && i < score) $(seg).addClass(level.color);
    });
    $('#strength-label').text(`Strength: ${level.label}`);
  }

  function validate() {
    clearFieldErrors($form);
    const invalid = [];
    const fail = ($input, message) => {
      setFieldError($input, message);
      invalid.push($input);
    };

    if (!$name.val().trim()) fail($name, 'Enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test($email.val().trim())) fail($email, 'Enter a valid email address.');
    if (!passesPolicy($password.val())) fail($password, 'Your password does not meet all the requirements below.');
    if ($confirm.val() !== $password.val()) fail($confirm, 'Passwords do not match.');

    if (invalid.length) invalid[0].trigger('focus');
    return invalid.length === 0;
  }

  $password.on('input', updateMeter);

  $form.on('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const $btn = $form.find('button[type="submit"]');
    setButtonLoading($btn, true, 'Creating account...');

    try {
      await Api.post(CONFIG.ENDPOINTS.signup, {
        full_name: $name.val().trim(),
        email: $email.val().trim(),
        password: $password.val(),
        // The backend reads role from the body, so state it instead of relying on a default.
        role: 'user',
      });
      Toast.flash('success', 'Account created. Log in to continue.');
      window.location.href = CONFIG.ROUTES.login;
    } catch (err) {
      if (err.status === 409) setFieldError($email, 'An account with this email already exists.');
      else showFormError(err.message);
      setButtonLoading($btn, false);
    }
  });
});