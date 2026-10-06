# Muhammad Waiz Imran — Portfolio

Forward Deployed Engineer portfolio covering workflow discovery, software and data integration, AI applications and end-to-end delivery. Includes a responsive homepage, searchable project gallery, compact case studies, credentials and a private content studio.

Website: https://muhammad-waiz-imran.vercel.app

## Run locally

Requires Node.js 24.

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:5200. Local content lives in `data/content.json`. Local credentials are salted scrypt hashes in the ignored `data/admin.json`. A fresh local installation offers account setup; production registration is disabled.

## Structure

- `public/`: pages, styles, scripts and published media.
- `data/content.json`: initial content with 17 projects.
- `server.mjs`: standalone local server and CMS API.
- `api/index.js`: Vercel API, authenticated CMS and editable source delivery.
- `scripts/`: build and verification utilities.
- `vercel.json`: routing and deployment configuration.

## Vercel

The project is `muhammad-waiz-imran`. The build runs `npm run build`, with `public` as the output directory. Static media is delivered directly; editable HTML, CSS and JS are served through the function so admin edits persist without rebuilding.

Connect a private Vercel Blob store to production. Configure `ADMIN_PASSWORD_SALT` and `ADMIN_PASSWORD_HASH` from the existing salted credentials. Blob credentials are supplied by the storage connection. Never commit secrets or local environment files.

```sh
npm run check
vercel --prod
```

Content, source overrides, backups, sessions and login-attempt records persist in private Blob storage. Authenticated browser uploads go directly to Blob (30 MB maximum) and are served through a restricted media endpoint. Published website content and uploaded media are public; credentials and backup records are not.

## Admin and recovery

Sign in at `/admin` to manage copy, experience, skills, projects, credentials, section visibility/order and styling. Case studies read the same project fields. Implementation details and diagrams expand on demand.

Content and source saves create backups, recoverable through the Backups tab. JSON exports contain references, not media bytes; retain the Blob store when moving or backing up the site. CMS edits do not automatically rewrite Git. Update the seed deliberately when bringing online edits into version control.

Source editing can change the public website immediately and is intended for the single owner. Sessions expire after 12 hours. Concurrent editing uses last-save-wins; use one editor session at a time.

## Verification

`npm run check` validates JavaScript syntax and local content/media references. Browser checks cover responsive layout, gallery search, detail links and expandable diagrams. Production smoke checks cover access control, sessions, content persistence, source edits, backups and uploads.

## Attribution

Case studies link to their original repositories. Supplied thumbnails and original diagrams are kept with their projects. Third-party fonts, logos, libraries and images remain the property of their owners and are not relicensed by this repository. Three.js uses the MIT license.
