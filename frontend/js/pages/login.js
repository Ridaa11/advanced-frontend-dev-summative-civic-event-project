$(function () {
  if (Auth.redirectIfLoggedIn()) return;

  const $form = $('#login-form');
  const $email = $('#email');
  const $password = $('#password');

  function validate() {
    clearFieldErrors($form);
    const invalid = [];

    if (!/^\S+@\S+\.\S+$/.test($email.val().trim())) {
      setFieldError($email, 'Enter a valid email address.');
      invalid.push($email);
    }
    if (!$password.val()) {
      setFieldError($password, 'Enter your password.');
      invalid.push($password);
    }

    if (invalid.length) invalid[0].trigger('focus');
    return invalid.length === 0;
  }

  $form.on('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const $btn = $form.find('button[type="submit"]');
    setButtonLoading($btn, true, 'Logging in...');

    try {
      const { data } = await Api.post(CONFIG.ENDPOINTS.login, {
        email: $email.val().trim(),
        password: $password.val(),
      });
      Auth.save(data.token, data.user, $('#remember').is(':checked'));
      window.location.href = Auth.homeFor(data.user);
    } catch (err) {
      showFormError(err.status === 401 ? 'Incorrect email or password.' : err.message);
      setButtonLoading($btn, false);
    }
  });
});