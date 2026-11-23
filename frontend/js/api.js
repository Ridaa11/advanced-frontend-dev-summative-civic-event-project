const Api = (() => {
  const MESSAGES = {
    network: 'Cannot reach the server. Check your connection and try again.',
    forbidden: 'You do not have permission to do that. Contact an administrator if you think this is a mistake.',
    server: 'Something went wrong on our side. Please try again shortly.',
  };

  // Turns any jQuery failure into one predictable shape: { status, message, errors }.
  function toError(xhr) {
    const body = xhr.responseJSON || {};
    let message = body.message || body.error;
    if (Array.isArray(body.errors) && body.errors.length) {
      message = body.errors.map((e) => e.msg || e.message).filter(Boolean).join(' ');
    }

    if (xhr.status === 0) message = MESSAGES.network;
    else if (xhr.status === 403) message = body.message || MESSAGES.forbidden;
    else if (xhr.status >= 500) message = body.message || MESSAGES.server;

    return {
      status: xhr.status,
      message: message || 'Request failed. Please try again.',
      errors: body.errors || null,
    };
  }

  function request(method, path, { data, form, query, onProgress } = {}) {
    const options = {
      url: CONFIG.API_URL + path,
      method,
      dataType: 'json',
      headers: {},
    };

    const token = Auth.getToken();
    if (token) options.headers.Authorization = `Bearer ${token}`;

    if (query) {
      options.data = query;
    } else if (form) {
      // FormData must be sent untouched, or jQuery breaks the multipart boundary.
      options.data = form;
      options.processData = false;
      options.contentType = false;
    } else if (data) {
      options.data = JSON.stringify(data);
      options.contentType = 'application/json';
    }

    if (onProgress) {
      options.xhr = () => {
        const xhr = $.ajaxSettings.xhr();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
        return xhr;
      };
    }

    return new Promise((resolve, reject) => {
      $.ajax(options)
        .done(resolve)
        .fail((xhr) => {
          const error = toError(xhr);
          // Only treat 401 as "session expired" if we sent a token; a wrong password on login is also a 401.
          if (xhr.status === 401 && token) {
            Auth.logout('Your session has expired. Please log in again.');
          }
          reject(error);
        });
    });
  }

  return {
    get: (path, query) => request('GET', path, { query }),
    post: (path, data) => request('POST', path, { data }),
    put: (path, data) => request('PUT', path, { data }),
    patch: (path, data) => request('PATCH', path, { data }),
    delete: (path) => request('DELETE', path),
    upload: (method, path, form, onProgress) => request(method, path, { form, onProgress }),
  };
})();