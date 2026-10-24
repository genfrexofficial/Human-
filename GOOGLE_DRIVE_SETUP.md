# GENFREX Google Drive Cloud Storage Setup Guide

This document provides complete instructions for configuring Google Drive as the primary cloud file storage system for the **GENFREX Unified Business Management Platform** (ClientFlow & HR OfferFlow).

---

## Architecture Overview

```text
┌─────────────────┐      Bearer JWT       ┌────────────────────────┐
│  React Frontend │ ───────────────────>  │ Express Backend API    │
│  (Client/Admin) │                       │ (RBAC & Auth Barrier)  │
└─────────────────┘                       └────────────────────────┘
                                                    │
                      ┌─────────────────────────────┴─────────────────────────────┐
                      ▼                                                           ▼
       ┌─────────────────────────────┐                             ┌─────────────────────────────┐
       │     Google Drive API v3     │                             │        MongoDB Atlas        │
       │  (File Binaries & Folders)  │                             │  (File Metadata & Ledger)   │
       └─────────────────────────────┘                             └─────────────────────────────┘
                      │                                                           │
          • Dedicated GENFREX Root                                    • originalFileName, driveFileId
          • Dynamic Folder Hierarchy                                  • driveFolderId, mimeType
          • Streaming Download Proxy                                  • fileSize, module, entityId
          • Zero Public Link Exposure                                 • status, RBAC security tier
```

---

## Step 1: Create and Configure a Google Cloud Project

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top bar and select **New Project**.
3. Set the project name to `GENFREX-Unified-Storage` (or your company name).
4. Click **Create** and ensure the new project is selected in the console.

---

## Step 2: Enable the Google Drive API

1. In the Google Cloud Console, open the left navigation menu and go to **APIs & Services > Library**.
2. In the search box, type `Google Drive API`.
3. Click on **Google Drive API** in the results.
4. Click **Enable**.

---

## Step 3: Choose Your Authentication Mechanism

GENFREX supports two server-side authentication strategies. **Option A (OAuth2 Refresh Token)** is recommended for dedicated GENFREX storage accounts.

### Option A: OAuth 2.0 Client with Refresh Token (Recommended)

1. Go to **APIs & Services > OAuth consent screen**:
   - Choose **External** (or **Internal** if using Google Workspace).
   - Enter App Name: `GENFREX Storage Manager`.
   - Add your support email and developer contact email.
   - Click **Save and Continue**.
   - Under Scopes, click **Add or Remove Scopes** and select:
     - `https://www.googleapis.com/auth/drive` (Full Drive access) or
     - `https://www.googleapis.com/auth/drive.file` (Per-file Drive access).
   - Add your Google account as a **Test user** if in Testing mode.
2. Go to **APIs & Services > Credentials**:
   - Click **Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Name: `GENFREX Backend Server`.
   - Authorized redirect URIs: Add `https://developers.google.com/oauthplayground`.
   - Click **Create**. Copy your **Client ID** and **Client Secret**.
3. Generate the **Refresh Token**:
   - Visit the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
   - Click the gear icon (top right): check **Use your own OAuth credentials** and enter your Client ID and Client Secret.
   - In Step 1 (Select & authorize APIs), scroll to **Drive API v3** and select `https://www.googleapis.com/auth/drive`.
   - Click **Authorize APIs** and sign in with the dedicated GENFREX Google account.
   - In Step 2 (Exchange authorization code for tokens), click **Exchange authorization code for tokens**.
   - Copy the generated `refresh_token`.

### Option B: Google Service Account (Alternative)

1. In Google Cloud Console, go to **IAM & Admin > Service Accounts**.
2. Click **Create Service Account**:
   - Name: `genfrex-storage-service`.
   - Grant role: **Project > Editor** (optional).
   - Click **Done**.
3. Select the created Service Account, navigate to the **Keys** tab, and click **Add Key > Create new key (JSON)**.
4. Download the JSON key file.

---

## Step 4: Create the GENFREX Root Folder in Google Drive

1. Sign in to [Google Drive](https://drive.google.com/) using the dedicated GENFREX storage account.
2. Create a new folder named `GENFREX`.
3. Open the folder and look at your browser's URL:
   ```text
   https://drive.google.com/drive/folders/1aBcD_EfGhIjKlMnOpQrStUvWxYz01234
   ```
4. The alphanumeric string at the end (`1aBcD_EfGhIjKlMnOpQrStUvWxYz01234`) is your **`GOOGLE_DRIVE_ROOT_FOLDER_ID`**.
5. *(If using Service Account)*: Right-click the `GENFREX` folder, click **Share**, and share with the Service Account email with **Editor** permissions.

---

## Step 5: Configure Backend Environment Variables

Open `server/.env` (never commit real credentials to Git) and add your credentials:

```ini
# Primary Cloud Storage: Google Drive
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_DRIVE_ROOT_FOLDER_ID=1aBcD_EfGhIjKlMnOpQrStUvWxYz01234

# Enterprise File Constraints
MAX_FILE_SIZE_MB=25
```

If using a Service Account instead:
```ini
GOOGLE_SERVICE_ACCOUNT_EMAIL=genfrex-storage@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkq...your_key_here...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID=1aBcD_EfGhIjKlMnOpQrStUvWxYz01234
MAX_FILE_SIZE_MB=25
```

---

## Step 6: Automated Dynamic Folder Hierarchy

The GENFREX backend automatically builds the folder structure on demand when the first file in a category is uploaded:

```text
GENFREX/
├── Clients/
│   └── [Client Name]/
│       ├── Documents/
│       └── Projects/
├── Employees/
│   └── [Employee Name]/
├── HR/
│   ├── Candidates/
│   ├── Offer Letters/
│   └── Appointment Letters/
├── Projects/
│   └── [Project Name]/
└── General/
```

- Folders are created once and cached in memory.
- No dummy/seed folders are generated.

---

## Step 7: Verification and Testing

1. **Start the backend and frontend**:
   ```bash
   # Terminal 1: Backend
   cd server
   npm run dev

   # Terminal 2: Frontend
   cd client
   npm run dev
   ```

2. **Verify Storage Diagnostics**:
   - Log in as Admin (`admin@genfrex.com` / `Admin@123`).
   - Navigate to **Admin Dashboard > Storage** (`/admin/storage`).
   - Confirm **Google Drive API v3** shows status: **Connected**.

3. **Test File Upload**:
   - Click **Upload Document**.
   - Choose a PDF/Document, select category (e.g. `HR_DOCUMENT` or `DOCUMENT`).
   - Upload and verify it appears in the **File Catalog**.

4. **Test Streaming & View**:
   - Click the **Eye icon** (Preview) or **Download icon** on any file in the ledger.
   - Verify the file opens/downloads directly through the backend proxy without revealing raw Google Drive URLs.

5. **Test Role-Based Access Control**:
   - Log in as a Employee or Client.
   - Attempt to access a confidential HR document by ID.
   - Verify the server returns **HTTP 403 Forbidden** and logs a `FILE_ACCESS_DENIED` entry in the Admin Storage Security Log.

6. **Run Automated Test Suite**:
   ```bash
   cd server
   node test-google-drive-storage.js
   ```

---

## Security Guarantees

1. **Zero Public Links**: Google Drive files are kept private. Public links (`Anyone with the link can view`) are never created.
2. **Backend Authentication Barrier**: Every request passes through `authenticateToken` and RBAC checks (`ADMIN`, `HR`, `Employee`, `CLIENT`).
3. **No Binary in MongoDB**: MongoDB Atlas stores only file metadata and the Drive reference (`driveFileId`).
4. **Audit Trail**: Every upload, view, download, replacement, deletion, and denial is logged with actor ID, role, and timestamp.
