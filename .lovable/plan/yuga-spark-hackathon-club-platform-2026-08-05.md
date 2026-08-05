# Yuga Spark — Hackathon Club Platform

A club website with two sides: a student portal and an admin console, backed by Lovable Cloud (database, auth, storage, email).

## Phase 1 (this build)

**Design first:** I'll generate three rendered design directions for you to pick before building. Everything below is built in the chosen style.

### Accounts & access
- Email/password login for everyone. Admins: jayakrushna1622@gmail.com and hemanthleads@gmail.com, initial password `cat@1234`.
- Access mode toggle (admin-controlled): **Open** — any email can register; **Restricted** — only emails the admins added.
- Roles stored in a separate roles table (never on the profile), so admin rights can't be self-granted.
- Everyone can change their own password in Profile. Admins can reset any student's password. Nobody, including admins, can ever see passwords.

### Student onboarding
- After first login, a required profile form: full name, registration number, year, personal email, professional photo (upload), resume (optional, can add later).
- Cannot reach the dashboard until the required fields are filled. On later logins, straight to the dashboard.
- On completion, an auto-generated **member badge**: name + "Yuga Spark" + QR code (links to their public profile), downloadable as an image.
- Profile page: edit any detail, replace photo/resume, change password.

### Student dashboard (Phase 1 scope)
- Upcoming hackathons created by admins (date, time, team size min/max, description, register button).
- Placeholder tiles for the Phase 2 modules so navigation is complete from day one.

### Admin console (Phase 1 scope)
- Student directory: all details except passwords, search + filters, view individual, delete/manage.
- Add students individually, or bulk-import an Excel/CSV — we read only the email column, strip anything after `@`, append `@rgmcet.edu.in`, and grant access with default password `yugaspark123`.
- Create and edit hackathons: title, description, date, start/end time, team size min–max, certificate mode (auto-generated in-app **or** admin-uploaded PDFs) chosen per hackathon.
- Reset student passwords; change own password.
- Access-mode switch (open vs. invited-only).

### Site-wide
- Public landing page for the club, footer "Developed by Jaya Krushna and Hemanth" everywhere.

## Phase 2 (next builds, after Phase 1 is working)
- Leaderboards: overall and per-hackathon, with filters and top performers.
- Squad finder: form/join squads per hackathon within the admin-set team size.
- Playbook: resources library added by admins.
- Certificates: download for every attended hackathon (winner vs. participation), auto-generated or admin-uploaded per the hackathon's setting.
- Doubt chat: students message admins, admins see and reply per thread.
- Notice board: outside-college hackathons, announcements, links, polls.
- Mailing: individual and bulk emails to participants.

## Technical notes
- Lovable Cloud for auth, Postgres, and file storage (photos, resumes, certificate PDFs, imports).
- Tables: profiles, user_roles, allowed_emails, app_settings (access mode), hackathons, registrations; Phase 2 adds squads, resources, certificates, messages, notices, polls, results.
- Row-level security on every table: students read/write only their own rows; admins get full access through a security-definer role check.
- Excel/CSV parsing in the browser, inserts validated server-side.
- Badge QR and auto certificates rendered client-side and exported as image/PDF.
