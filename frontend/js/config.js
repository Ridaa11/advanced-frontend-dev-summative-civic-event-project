const CONFIG = {
  API_URL: 'http://localhost:4000/api',
  FILES_URL: 'http://localhost:4000',
  SUPPORT_EMAIL: 'support@civicevents.example',

  ROUTES: {
    login: '/login.html',
    signup: '/signup.html',
    home: '/events.html',
    adminDashboard: '/admin/dashboard.html',
  },

  // Mirrors the backend upload middleware, so bad files are rejected before uploading.
  FILE_RULES: {
    image: { exts: ['jpg', 'jpeg', 'png', 'gif'], maxMB: 2, label: 'image' },
    video: { exts: ['mp4', 'mov', 'avi', 'mkv'], maxMB: 8, label: 'video' },
    audio: { exts: ['mp3', 'wav', 'm4a', 'ogg'], maxMB: 5, label: 'audio file' },
  },

  // Mirrors the backend routes; paths that take an id are functions.
  ENDPOINTS: {
    signup: '/auth/signup',
    login: '/auth/login',

    users: '/users',
    user: (id) => `/users/${id}`,
    enableUser: (id) => `/users/${id}/enable`,
    disableUser: (id) => `/users/${id}/disable`,
    myProfile: '/users/profile/me',

    events: '/events',
    event: (id) => `/events/${id}`,

    register: '/event-registrations/register',
    cancelRegistration: '/event-registrations/cancel',
    myRegistrations: '/event-registrations/my-registrations',
    attendees: (eventId) => `/event-registrations/event/${eventId}/attendees`,

    feedback: '/event-feedback',
    myFeedback: '/event-feedback/my-feedback',
    feedbackItem: (id) => `/event-feedback/${id}`,
    eventFeedback: (eventId) => `/event-feedback/event/${eventId}`,

    announcements: '/announcements',
    announcement: (id) => `/announcements/${id}`,
    publishAnnouncement: (id) => `/announcements/${id}/publish`,
    unpublishAnnouncement: (id) => `/announcements/${id}/unpublish`,

    promos: '/promos',
    promo: (id) => `/promos/${id}`,
    publishPromo: (id) => `/promos/${id}/publish`,
    unpublishPromo: (id) => `/promos/${id}/unpublish`,

    notifications: '/notifications',
    notification: (id) => `/notifications/${id}`,

    adminStats: '/dashboard/admin',
    myStats: '/dashboard/me',
  },
};