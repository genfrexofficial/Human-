# Architecture & Security Audit Findings — ClientFlow Platform

## 1. Audit Overview

This audit document details structural, security, configuration, and code quality findings identified during the analysis of the **ClientFlow (GENFREX Unified Business Management Platform)** repository.

### Severity Classification
- **Critical**: Vulnerabilities or defects that immediately expose credentials, bypass authentication, or allow unauthorized tenant access.
- **High**: Significant security, confidentiality, or data integrity risks requiring prompt mitigation.
- **Medium**: Architectural drift, dead code, dependency bloat, or hygiene concerns that increase operational risk.
- **Low**: Minor configuration gaps, optimization opportunities, or testing script omissions.

---

## 2. Findings Summary Matrix

| ID | Title | Severity | Impacted Files | Status |
|---|---|---|---|---|
| **SEC-01** | Permissive CORS Fallback Permits Arbitrary Origins | **High** | `server/server.js:28` | Needs Fix |
| **SEC-02** | Hardcoded Fallback JWT Secret in Middleware & Controller | **High** | `server/middleware/authMiddleware.js:21`<br/>`server/controllers/authController.js:5` | Needs Fix |
| **SEC-03** | Authentication Token Permitted in Query Parameters | **Medium** | `server/middleware/authMiddleware.js:12` | Needs Fix |
| **CODE-01**| Unused Puppeteer Heavyweight Dependency Installed | **Medium** | `server/package.json:25` | Needs Cleanup |
| **ARCH-01**| Significant Documentation Drift in Root README.md | **Medium** | `README.md:1-257` | Needs Update |
| **OPS-01** | Transient In-Memory Cache for Google Drive Folders | **Low** | `server/services/googleDriveService.js:6` | By Design / Enhancement |
| **TEST-01**| Missing Standardized `npm test` Automation Script | **Low** | `server/package.json:6-10`<br/>`package.json:6-13` | Enhancement |
| **UI-01**  | Orphaned Frontend Routes for Registration & Setup | **Low** | `client/src/App.jsx:99-100` | Enhancement |

---

## 3. Detailed Audit Findings

### SEC-01: Permissive CORS Fallback Permits Arbitrary Origins
- **Severity**: **High**
- **Location**: `server/server.js:20-32`
- **Code Reference**:
  ```javascript
  // server/server.js:20-32
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive for hackathon demos
      },
      credentials: true
    })
  );
  ```
- **Analysis**:
  Although `allowedOrigins` is computed from `process.env.CLIENT_URL` and `localhost`, the callback falls back to `callback(null, true)` for **all** incoming origins with `credentials: true`. In production, any malicious domain can perform authenticated cross-origin XMLHttpRequests if an authenticated user visits that domain.
- **Remediation**:
  Replace the permissive fallback with `callback(new Error('Blocked by CORS security policy'))` when `process.env.NODE_ENV === 'production'`.

---

### SEC-02: Hardcoded Fallback JWT Secret in Multiple Files
- **Severity**: **High**
- **Locations**:
  - `server/middleware/authMiddleware.js:21`
  - `server/controllers/authController.js:5`
  - `server/.env.example:15`
- **Code Reference**:
  ```javascript
  // server/middleware/authMiddleware.js:21
  const secret = process.env.JWT_SECRET || 'clientflow_jwt_secret_super_secure_key_2026_hackathon';

  // server/controllers/authController.js:5
  const secret = process.env.JWT_SECRET || 'clientflow_jwt_secret_super_secure_key_2026_hackathon';
  ```
- **Analysis**:
  If `JWT_SECRET` is missing or commented out in `server/.env`, the server defaults to a static fallback string publicly visible in `.env.example` and the source code. Anyone with access to the repository can forge a JWT with `{ role: 'ADMIN' }` and gain unrestricted platform control.
- **Remediation**:
  Enforce strict initialization: if `!process.env.JWT_SECRET` in `server.js` startup, crash the server immediately with `process.exit(1)`. Remove the hardcoded fallback string.

---

### SEC-03: Authentication Token Accepted in Query Parameters
- **Severity**: **Medium**
- **Location**: `server/middleware/authMiddleware.js:12`
- **Code Reference**:
  ```javascript
  // server/middleware/authMiddleware.js:12
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || req.query.token;
  ```
- **Analysis**:
  Allowing authentication tokens via `?token=` enables unencrypted exposure in:
  1. Web server / proxy access logs (NGINX, Cloudflare, Render).
  2. Browser URL histories and bookmark managers.
  3. HTTP `Referer` headers when navigating to external links.
- **Remediation**:
  Only allow query token authentication for strictly controlled binary streaming endpoints if `Bearer` headers cannot be sent (e.g. native HTML `<video>` or `<img>` tags), and issue short-lived (e.g. 60-second) signed tickets rather than the primary 7-day session token.

---

### CODE-01: Unused Puppeteer Heavyweight Dependency Installed
- **Severity**: **Medium**
- **Location**: `server/package.json:25`
- **Code Reference**:
  ```json
  "dependencies": {
    "pdfkit": "^0.20.2",
    "puppeteer": "^25.12.0"
  }
  ```
- **Analysis**:
  `puppeteer` downloads and manages a complete headless Chromium browser instance (~170–300MB download). However, static analysis of the codebase reveals that all PDF rendering (specifically appointment letters) is implemented in `server/services/pdfService.js` using `pdfkit`. Puppeteer is **never imported or required anywhere in the server code**.
- **Remediation**:
  Remove `puppeteer` via `npm uninstall puppeteer --prefix server` to reduce Docker container size and deployment build time by several minutes.

---

### ARCH-01: Significant Documentation Drift in Root README.md
- **Severity**: **Medium**
- **Location**: `README.md:1-257`
- **Analysis**:
  The project's root `README.md` documents an earlier hackathon prototype and diverges significantly from current operational reality:
  1. **Roles**: Documents only `ADMIN` and `CLIENT`. Actual implementation enforces 4 roles: `ADMIN`, `HR`, `Employee`, `CLIENT`.
  2. **Storage**: Documents only Cloudinary + Multer. The active primary storage is Google Drive API v3 with AWS S3 / Cloudinary fallbacks (`GOOGLE_DRIVE_SETUP.md`).
  3. **Registration**: Documents `POST /api/auth/register`. In the actual code (`authController.js:105`), public registration is hard-disabled with HTTP 403 Forbidden.
  4. **Seeding**: Documents `npm run seed` to load demo accounts. In the actual code (`server/seed/seed.js`), demo seeding is permanently disabled.
  5. **HR OfferFlow**: Completely omits Candidates, Appointment Letters, Letter Templates, and PDF generation.
- **Remediation**:
  Update `README.md` to reflect the multi-role GENFREX architecture, or reference `docs/architecture.md` and `docs/codebase-map.md`.

---

### OPS-01: Transient In-Memory Cache for Google Drive Folders
- **Severity**: **Low**
- **Location**: `server/services/googleDriveService.js:6-7`
- **Code Reference**:
  ```javascript
  // server/services/googleDriveService.js:6
  const folderCache = new Map();
  ```
- **Analysis**:
  Folder IDs in Google Drive are cached in a JavaScript `Map`. On server restart or in multi-instance horizontal scaling, the cache resets. The code gracefully handles this by querying `drive.files.list`, but this results in a redundant API round trip on the first upload for each folder category.
- **Remediation**:
  Persist resolved Google Drive folder IDs in MongoDB (e.g. in a `DriveFolder` schema) or a shared Redis cache if deploying across multiple instances.

---

### TEST-01: Missing Standardized `npm test` Automation Script
- **Severity**: **Low**
- **Locations**:
  - `server/package.json:6-10`
  - `package.json:6-13`
- **Analysis**:
  The repository contains an impressive collection of integration test scripts in `server/`:
  - `test-acceptance.js`
  - `test-cloud-storage.js`
  - `test-cross-module-link.js`
  - `test-genfrex-unified.js`
  - `test-google-drive-storage.js`
  - `test-isolated-fresh-db.js`
  - `test-production-constraints.js`
  - `test-strict-auth.js`
  However, neither `package.json` specifies `"scripts": { "test": "..." }`. Automated CI/CD pipelines (e.g. GitHub Actions) cannot run tests via standard npm lifecycle commands.
- **Remediation**:
  Add a runner script in `server/package.json` that executes the test suite or incorporates a test harness like Jest / Node Test Runner.

---

### UI-01: Orphaned Frontend Routes for Registration & Setup
- **Severity**: **Low**
- **Location**: `client/src/App.jsx:99-100`
- **Code Reference**:
  ```javascript
  // client/src/App.jsx:99-100
  <Route path="/register" element={<Navigate to="/login" replace />} />
  <Route path="/setup-admin" element={<Navigate to="/login" replace />} />
  ```
- **Analysis**:
  Both `/register` and `/setup-admin` redirect directly to `/login`. The components `Register.jsx` and `AdminSetup.jsx` exist in `client/src/pages/auth/` but are unreachable through normal routing.
- **Remediation**:
  If self-registration is permanently disabled, either clean up `Register.jsx` or provide an informative message on why public registration is closed. For `setup-admin`, conditionally enable the route only when `/api/auth/setup-status` indicates `needsSetup: true`.
