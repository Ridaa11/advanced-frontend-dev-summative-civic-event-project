# CivicEvent+ Project

A civic events platform: a Node.js + PostgreSQL API (backend/) and an HTML, Tailwind CSS and jQuery frontend (frontend/).

## Quick start
1. Backend: create the civic-events-db database, run backend/migrations/001_create_tables.sql, set DB_PASS in backend/.env, then `npm install` and `npm run dev` (http://localhost:4000).
2. Frontend: open frontend/index.html with Live Server (see frontend/README.md).
3. Create an admin account with the command in frontend/README.md. Normal users sign up through the app.

## Role-based access
Admin and user guards are marked with `ROLE GUARD` comments in frontend/js (auth.js, layout.js and each page script) and listed in a table in frontend/README.md. The backend enforces the real permissions.

## Demo video
(add your link here)