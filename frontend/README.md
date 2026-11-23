# UI Implementation
# CivicEvents+ Frontend

A responsive, accessible frontend for the CivicEvents+ API, built with plain HTML, Tailwind CSS (CDN) and jQuery. There is no build step.

## Requirements

- Node.js 18+ (only to run the backend and a static file server)
- PostgreSQL 15+
- The provided backend (`backend/` folder)

## 1. Set up the backend

Follow `backend/README.md`. In short:

```bash
cd backend
export DB_USER=postgres DB_PASSWORD=<password> DB_NAME=civic-events-db DB_HOST=localhost DB_PORT=5432
psql -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT -f ./migrations/001_create_tables.sql
npm install
npm run dev        # http://localhost:4000
```

You should see `Successfully connected to PostgreSQL` in the console.

## 2. Point the frontend at the backend

The only setting is in `frontend/js/config.js`:

```js
API_URL: 'http://localhost:4000/api',   // REST API base URL
FILES_URL: 'http://localhost:4000',     // where /uploads/... files are served
```

Change both if your backend runs on a different host or port.

## 3. Run the frontend

Serve the `frontend/` folder as the **site root** (paths such as `/login.html` are root-relative):

```bash
npx serve frontend -l 8080
# or open the frontend folder with the VS Code "Live Server" extension
```

Open http://localhost:8080. Tailwind, jQuery and the fonts load from CDNs, so an internet connection is needed.

## 4. Create an admin account

Signup always creates normal users from the UI. To get an admin for testing, register one with Postman (or curl) by sending a role:

```bash
curl -X POST http://localhost:4000/api/auth/signup -H "Content-Type: application/json" \
  -d '{"full_name":"Admin","email":"admin@gmail.com","password":"Password123@","role":"admin"}'
```

Then log in with it on `/login.html`. Admins land on the dashboard; normal users land on Events.

## Project structure

```
frontend/
  login.html, signup.html, events.html, event.html, announcements.html, announcement.html,
  promos.html, promo.html, notifications.html, my-registrations.html, profile.html, search.html
  admin/  dashboard.html, users.html, event-form.html, announcement-form.html, promo-form.html
  js/
    config.js      API URL, endpoint map, upload rules
    utils.js       formatting, escaping, caching helpers
    ui.js          toasts, form errors, modals, skeletons, pagination, lazy media
    auth.js        token/user storage and the role guards
    api.js         jQuery AJAX wrapper (Bearer token, error normalising, uploads)
    layout.js      navbar, footer, admin sidebar, notification drawer
    pages/*.js     one script per page
```

## Authentication and storage

- "Keep me logged in" stores the token and user in `localStorage`; otherwise `sessionStorage` is used.
  Trade-off: `localStorage` survives browser restarts but is readable by any script running on the page, so an XSS bug could leak the token. `sessionStorage` is cleared when the tab closes.
- Every API call sends `Authorization: Bearer <token>`.
- Tokens last one hour. When one expires (or the API answers 401 to an authenticated call), the user is signed out and sent to login with a message.

## Role-based access guards

All guards are marked with `ROLE GUARD` comments. They improve the UX only; the backend is the real enforcement.

| Where | What it does |
|---|---|
| `js/auth.js` `requireAuth()` | Called first on every protected page. No valid token means redirect to login. |
| `js/auth.js` `requireAdmin()` | Called first on every admin page. Non-admins are redirected to Events with a message. |
| `js/layout.js` `headerHtml()` | Dashboard and Admin menu are only rendered for admins. "My registrations" is only rendered for normal users. |
| `js/pages/*.js` (list and detail pages) | Create, Edit, Publish and Delete controls are only rendered when `Auth.isAdmin()`. Register and feedback are for normal users. |
| `js/layout.js` `removeNotification()` | Notification delete is admin-only. |
| `js/pages/my-registrations.js` | Admins are redirected away from the registrations page. |

## Behaviour that follows the backend

- **No "mark as read" API route:** the unread count is based on notifications you have not opened in this browser (stored per user in `localStorage`).
- **Feedback visibility:** the API only lets admins list all feedback for an event. Normal users see and edit their own feedback (one per event); admins see everyone's feedback and the average rating.
- **Announcement duration:** the API has no duration field, so it is read from the audio file in the browser.
- **Promo captions:** the API stores caption text only, so a timed WebVTT track is generated in the browser and also shown as a transcript.
- **Event publish toggle:** the events API has no publish/unpublish route, so events have no toggle (announcements and promos do).
- **Search, filters and pagination for events** run in the browser because the list endpoint takes no query parameters. The users list uses the API's `page` and `limit`.
- **Upload limits** match the backend: images 2 MB (jpg, jpeg, png, gif), audio 5 MB (mp3, wav, m4a, ogg), video 8 MB (mp4, mov, avi, mkv).