# System Architecture — ClientFlow & GENFREX Platform

## 1. Executive Summary

**ClientFlow** is a modern, full-stack collaborative client portal and business operations management platform. As implemented in this codebase, the application has evolved into the **GENFREX Unified Business Management Platform**, which couples two primary operational engines:

1. **ClientFlow Subsystem**: Client engagement, project stage management, milestones, granular task boards, client task requests, deliverable review/approval flows, threaded discussions, real-time activity audits, and AI project intelligence synthesis.
2. **HR OfferFlow Subsystem**: End-to-end recruitment lifecycle, candidate management, automated Trainee/Intern/Full-Time appointment letter generation via PDFKit, two-tier approval workflows, multi-channel email dispatch (Nodemailer), and candidate acceptance tracking.

Both subsystems share a unified **Node.js/Express.js REST API**, **MongoDB Atlas (Mongoose)** document store, and a **multi-tier enterprise cloud storage architecture** primarily backed by the **Google Drive API v3** with fallback to **AWS S3 / Cloudflare R2** and **Cloudinary**.

---

## 2. High-Level System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer ["Frontend Client Layer (Vite + React 18)"]
        UI_Admin["Admin Workspace (/admin/*)<br/>17 Pages: Analytics, Projects, Users, Storage, HR"]
        UI_Client["Client Portal (/client/*)<br/>9 Pages: Projects, Reviews, Requests, Files"]
        UI_Employee["Employee Portal (/Employee/*)<br/>7 Pages: Tasks, Execution, Submissions, Files"]
        UI_HR["HR Portal (/hr/*)<br/>6 Pages: Candidates, Letters, Approvals, Templates"]
        AuthContext["AuthContext & API Client<br/>Axios Bearer Interceptor & Token Management"]
    end

    subgraph SecurityLayer ["API Gateway & Security Layer"]
        CORS["CORS Middleware"]
        AuthMiddleware["authenticateToken<br/>JWT Verification & tokenVersion Check"]
        RBAC["authorizeRoles<br/>ADMIN | HR | Employee | CLIENT"]
        ResourceGuards["requireProjectAccess<br/>requireTaskAccess"]
        UploadFilter["uploadMiddleware<br/>Extension Whitelist & Executable Sanitizer"]
    end

    subgraph BackendAPI ["Express.js Backend Server (Port 5000)"]
        AuthCtrl["authController & userController"]
        ProjCtrl["projectController, taskController, taskRequestController"]
        FileCtrl["fileController & storageService"]
        HRCtrl["candidateController, appointmentController, hrReportsController"]
        AICtrl["aiController (Executive Heuristic Synthesis)"]
    end

    subgraph StorageLayer ["Multi-Tier Storage Engine"]
        GDriveService["googleDriveService.js<br/>Google Drive API v3 (Primary Cloud)"]
        S3Service["s3Service.js<br/>AWS S3 / R2 (Confidential Fallback)"]
        CloudinaryCfg["cloudinary.js<br/>Cloudinary CDN (Media Fallback)"]
        LocalDisk["/uploads<br/>Secure Local Disk (Offline Fallback)"]
    end

    subgraph PersistenceLayer ["Data & Communication Services"]
        MongoDB[("MongoDB Atlas / Local<br/>16 Mongoose Schemas & Indexes")]
        Nodemailer["emailService.js<br/>SMTP / Gmail App Password Dispatch"]
        PDFKit["pdfService.js<br/>Vector A4 PDF Engine"]
    end

    UI_Admin & UI_Client & UI_Employee & UI_HR --> AuthContext
    AuthContext --> CORS
    CORS --> AuthMiddleware
    AuthMiddleware --> RBAC
    RBAC --> ResourceGuards
    ResourceGuards --> ProjCtrl & FileCtrl & HRCtrl & AuthCtrl & AICtrl

    FileCtrl --> UploadFilter
    UploadFilter --> GDriveService
    GDriveService -.->|Fallback| S3Service
    GDriveService -.->|Fallback| CloudinaryCfg
    GDriveService -.->|Fallback| LocalDisk

    HRCtrl --> PDFKit
    PDFKit --> GDriveService
    HRCtrl --> Nodemailer

    ProjCtrl & FileCtrl & HRCtrl & AuthCtrl & AICtrl --> MongoDB
```

---

## 3. Frontend-to-Backend Request Flow

Every network transaction between the React Single Page Application (SPA) and the Express server follows an authenticated, intercepted pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Browser)
    participant UI as React Component / Page
    participant Axios as Axios Client (src/services/api.js)
    participant Server as Express Server (server.js)
    participant Auth as authMiddleware.js
    participant Controller as Domain Controller
    participant DB as MongoDB (Mongoose)

    User->>UI: Triggers Action (e.g. Load Projects)
    UI->>Axios: api.get('/projects')
    Note over Axios: Request Interceptor reads<br/>localStorage.getItem('token')<br/>Appends "Authorization: Bearer <token>"
    Axios->>Server: HTTP GET /api/projects
    Server->>Auth: authenticateToken(req, res, next)
    
    alt Token Missing
        Auth-->>Axios: 401 Unauthorized (No token provided)
        Note over Axios: Response Interceptor clears storage<br/>Redirects to /login
    else Token Expired or Invalid
        Auth-->>Axios: 401 Unauthorized / 403 Forbidden
    else Token Valid
        Auth->>DB: User.findById(decoded.userId)
        DB-->>Auth: user doc (status: ACTIVE, tokenVersion: n)
        Note over Auth: Verify account is ACTIVE<br/>Verify decoded.tokenVersion === user.tokenVersion<br/>Sets req.user = user
        Auth->>Controller: Invokes getProjects(req, res, next)
        Controller->>DB: Project.find({ client: req.user._id }) or Project.find()
        DB-->>Controller: Projects array
        Controller-->>Server: HTTP 200 { success: true, count, projects }
        Server-->>Axios: JSON Payload
        Axios-->>UI: Resolves Promise
        UI-->>User: Renders Project Cards / Table
    end
```

---

## 4. Authentication and Authorization Architecture

The platform enforces a centralized **Role-Based Access Control (RBAC)** architecture governed by 4 discrete roles:
- `ADMIN`: Unrestricted platform operations, user management, project orchestration, and HR approvals.
- `HR`: Candidate management, appointment letter creation, template management, and HR reporting.
- `Employee`: Task execution, status updates (`IN_PROGRESS`, `BLOCKED`, `IN_REVIEW`), task time tracking, and deliverable submission.
- `CLIENT`: Read-only transparency over assigned projects, task request submissions, and deliverable review (`APPROVED` / `CHANGES_REQUESTED`).

```mermaid
flowchart TD
    Start([User Initiates Login]) --> SubmitCreds[Submit email & password to POST /api/auth/login]
    SubmitCreds --> FindUser{User exists in DB?}
    FindUser -- No --> AuthErr[HTTP 401: Invalid email or password]
    FindUser -- Yes --> VerifyPass{bcrypt.compare password valid?}
    VerifyPass -- No --> AuthErr
    VerifyPass -- Yes --> CheckStatus{user.status === ACTIVE?}
    CheckStatus -- No --> DeactivatedErr[HTTP 403: Account deactivated]
    CheckStatus -- Yes --> IssueToken[Generate JWT signed with JWT_SECRET<br/>Payload: userId, role, email, tokenVersion]
    IssueToken --> ReturnAuth[Return HTTP 200 + token + sanitized user profile]
    ReturnAuth --> StoreAuth[Frontend saves to localStorage<br/>AuthContext updates state]

    subgraph AccessBarrier ["Subsequent Protected Requests"]
        RequestResource[Client sends request with Bearer JWT] --> ValidateSignature{JWT valid & not expired?}
        ValidateSignature -- No --> TokenErr[HTTP 401: Expired / Invalid token]
        ValidateSignature -- Yes --> CheckRevoke{decoded.tokenVersion === user.tokenVersion?}
        CheckRevoke -- No --> TokenRevoked[HTTP 401: Session invalidated / logged out]
        CheckRevoke -- Yes --> EvaluateRBAC{authorizeRoles matches req.user.role?}
        EvaluateRBAC -- No --> RBACErr[HTTP 403: Forbidden for Role]
        EvaluateRBAC -- Yes --> CheckOwnership{requireProjectAccess / File Barriers pass?}
        CheckOwnership -- No --> ScopeErr[HTTP 403: Cross-tenant access denied]
        CheckOwnership -- Yes --> GrantAccess[Execute Controller Action]
    end

    StoreAuth --> RequestResource
```

---

## 5. Database CRUD & Project Lifecycle Flow

The database uses MongoDB via Mongoose. All project progress percentages and health states are calculated in real time through event-driven recalculation:

```mermaid
flowchart LR
    subgraph TriggerAction ["Task Mutation Trigger"]
        EmployeeUpdate["Employee / Admin Updates Task<br/>POST /tasks/:id/progress<br/>POST /tasks/:id/complete<br/>PUT /tasks/:id"]
    end

    subgraph ProgressEngine ["progressService.js"]
        CountTasks["Query Task Counts:<br/>totalTasks = countDocuments()<br/>completedTasks = countDocuments(COMPLETED)"]
        CalcFormula["progress = round((completed / total) * 100)"]
        CheckHealth["determineProjectHealth():<br/>Check overdue tasks<br/>Check BLOCKED tasks<br/>Check project.endDate"]
    end

    subgraph StateUpdate ["Database Update & Side Effects"]
        UpdateProj["Project.save():<br/>progress = calculated<br/>health = ON_TRACK | AT_RISK | OVERDUE_BLOCKED<br/>status = IN_PROGRESS | COMPLETED"]
        LogActivity["Activity.create():<br/>Record 'PROJECT_COMPLETED' or progress delta"]
        NotifyUsers["Notification.create():<br/>Notify Client & Project Creator"]
    end

    EmployeeUpdate --> CountTasks
    CountTasks --> CalcFormula
    CalcFormula --> CheckHealth
    CheckHealth --> UpdateProj
    UpdateProj --> LogActivity
    UpdateProj --> NotifyUsers
```

---

## 6. Google Drive & Multi-Cloud Storage File Lifecycle

Files undergo a rigorous security pipeline. No public links are ever generated in Google Drive or S3; all viewing and downloads are proxied through authenticated backend streams:

```mermaid
sequenceDiagram
    autonumber
    actor Uploader as User (Admin / Employee / Client / HR)
    participant UI as AdminStorage / FileUploadModal
    participant UploadMW as uploadMiddleware.js (Multer)
    participant FileCtrl as fileController.js
    participant StorageSvc as storageService.js
    participant DriveSvc as googleDriveService.js
    participant GDrive as Google Drive API v3
    participant DB as MongoDB (File & AuditLog)
    actor Consumer as Reviewer / Downloader

    Uploader->>UI: Selects file & submits multipart/form-data
    UI->>UploadMW: POST /api/files/upload
    Note over UploadMW: 1. Extension Whitelist Check (.pdf, .png, etc.)<br/>2. Block dangerous executables (.exe, .bat, .sh)<br/>3. Enforce MAX_FILE_SIZE_MB (default: 25MB)<br/>4. Sanitize file name & buffer temporarily to disk
    UploadMW->>FileCtrl: req.file verified on disk
    FileCtrl->>StorageSvc: uploadFile(req.file, { module, category, isConfidential })
    
    alt Google Drive Configured (Primary)
        StorageSvc->>DriveSvc: uploadToGoogleDrive({ filePath, folderPath })
        Note over DriveSvc: ensureFolderPath():<br/>Traverses/caches dynamic folder hierarchy<br/>GENFREX / {Module} / {Entity}
        DriveSvc->>GDrive: files.create(metadata + mediaBody)
        GDrive-->>DriveSvc: { id: driveFileId, size, mimeType }
        DriveSvc-->>StorageSvc: driveResult
        Note over StorageSvc: fs.unlinkSync(tempFilePath)
    else Google Drive Offline -> S3 Fallback (Confidential)
        StorageSvc->>StorageSvc: uploadToS3(key, buffer, ACL: private)
    else Google Drive Offline -> Cloudinary Fallback (Media)
        StorageSvc->>StorageSvc: cloudinary.uploader.upload(tempFilePath)
    else All Cloud Offline -> Local Disk
        StorageSvc->>StorageSvc: Persist in server/uploads
    end

    StorageSvc-->>FileCtrl: storageMetadata
    FileCtrl->>DB: File.create({ fileName, driveFileId, storageProvider, isConfidential })
    FileCtrl->>DB: AuditLog.create({ action: 'FILE_UPLOAD', performedBy, fileId })
    FileCtrl-->>UI: HTTP 201 File Created

    Note over Consumer, GDrive: Authenticated Retrieval Pipeline
    Consumer->>FileCtrl: GET /api/files/:id/download (Bearer JWT)
    Note over FileCtrl: Strict RBAC & Ownership Verification:<br/>- Confidential HR files: ADMIN or HR only<br/>- Client files: matching project client only<br/>- Employee files: assigned Employee only
    FileCtrl->>DriveSvc: getFileStreamFromGoogleDrive(file.driveFileId)
    DriveSvc->>GDrive: files.get({ fileId, alt: 'media' }, responseType: 'stream')
    GDrive-->>DriveSvc: Readable Stream
    Note over FileCtrl: res.setHeader('Content-Type', mimeType)<br/>res.setHeader('Content-Disposition', 'attachment/inline')<br/>driveStream.pipe(res)
    DriveSvc-->>Consumer: Streamed File Binary (Zero Google URLs exposed)
```

---

## 7. Cross-Module Lifecycle Flow: ClientFlow ⟷ HR OfferFlow

The system establishes direct cross-module linkages between client project demands and HR staffing workflows:

```mermaid
flowchart TD
    subgraph ClientStage ["1. Client Engagement"]
        C1["Client submits Task Request<br/>(e.g., 'React Senior Engineer Required')"]
        C2["Admin reviews & approves Task Request"]
        C3["System generates Project Task linked to TaskRequest"]
    end

    subgraph HRStage ["2. HR Staffing & OfferFlow"]
        H1["HR creates Candidate in Talent Pool<br/>Linked to projectId, clientId, requirementId"]
        H2["HR drafts Trainee/Intern/Full-Time Appointment Letter<br/>Selects LetterTemplate & auto-calculates compensation"]
        H3["HR submits Appointment Letter for Approval<br/>Status: PENDING_APPROVAL"]
        H4["Admin approves Appointment Letter<br/>Status: APPROVED"]
    end

    subgraph DocumentStage ["3. Automated Document Generation & Dispatch"]
        D1["pdfService.js generates vector 2-page A4 PDF using PDFKit"]
        D2["storageService uploads PDF directly to Google Drive<br/>(Folder: GENFREX / HR / Appointment Letters)"]
        D3["File record & AuditLog created in MongoDB"]
        D4["emailService.js dispatches letter via SMTP with PDF attachment"]
    end

    subgraph OnboardingStage ["4. Acceptance & Staff Assignment"]
        O1["Candidate Accepts Appointment"]
        O2["Candidate converted to Employee account in User collection"]
        O3["Employee assigned to Project assignedEmployees & Task assignedTo"]
    end

    C1 --> C2 --> C3
    C3 -.->|Requirement Link| H1
    H1 --> H2 --> H3 --> H4
    H4 --> D1 --> D2 --> D3 --> D4
    D4 --> O1 --> O2 --> O3
```

---

## 8. Dependency and Integration Map

| Layer | Component / Package | Version | Architectural Role | Status |
|---|---|---|---|---|
| **Frontend Framework** | `react` / `react-dom` | `^18.3.1` | Core reactive UI library | Verified active |
| **Frontend Tooling** | `vite` | `^5.4.3` | Development server and production bundler | Verified active |
| **Frontend Routing** | `react-router-dom` | `^6.26.2` | Client-side routing and role guards | Verified active |
| **HTTP Client** | `axios` | `^1.7.7` | REST API communication with Bearer interceptor | Verified active |
| **Icons & UI** | `lucide-react` | `^0.441.0` | Crisp SVG iconography | Verified active |
| **Analytics Charts** | `recharts` | `^2.12.7` | SVG analytics charts in dashboards | Verified active |
| **Styling** | `tailwindcss` | `^3.4.10` | Utility-first design system | Verified active |
| **Backend Runtime** | Node.js | v18+ | JavaScript server runtime | Verified active |
| **Server Framework**| `express` | `^4.21.2` | REST API HTTP server | Verified active |
| **Database ODM** | `mongoose` | `^8.9.5` | Document modeling and MongoDB connection | Verified active |
| **Authentication** | `jsonwebtoken` / `bcryptjs` | `^9.0.2` / `^2.4.3` | Stateless JWT issuance & bcrypt hashing (10 rounds) | Verified active |
| **Primary Cloud Storage** | `googleapis` (Drive v3) | `^182.0.0` | Dedicated corporate file repository & streaming | Verified active |
| **Secondary Cloud Storage** | `@aws-sdk/client-s3` | `^3.1142.0` | Private object storage for confidential documents | Verified active |
| **Media CDN Storage** | `cloudinary` | `^2.5.1` | Public media and avatar storage | Verified active |
| **File Multipart Engine** | `multer` | `^1.4.5-lts.1` | Temporary streaming disk ingestion | Verified active |
| **PDF Engine** | `pdfkit` | `^0.20.2` | Clean vector 2-page A4 appointment letter generation | Verified active |
| **Email Engine** | `nodemailer` | `^10.0.12` | SMTP email dispatch with attachments | Verified active |
| **Headless Browser** | `puppeteer` | `^25.12.0` | Installed in `package.json` | **Unused / Dead dependency** |

---

## 9. Architectural Verification Matrix

| Architecture Claim | Codebase Evidence | Verification State |
|---|---|---|
| 4-Role RBAC Model (`ADMIN`, `HR`, `Employee`, `CLIENT`) | `server/models/User.js:27`, `server/middleware/authMiddleware.js:67` | **Verified Ground Truth** |
| Single JWT Authentication Barrier | `server/middleware/authMiddleware.js:9-62` | **Verified Ground Truth** |
| Session Invalidation via `tokenVersion` | `server/models/User.js:65`, `server/middleware/authMiddleware.js:41` | **Verified Ground Truth** |
| Google Drive Primary Storage with Zero Public Links | `server/services/googleDriveService.js:229-244`, `server/controllers/fileController.js:632-645` | **Verified Ground Truth** |
| Dynamic Drive Folder Hierarchy with In-Memory Caching | `server/services/googleDriveService.js:6, 140-159` | **Verified Ground Truth** |
| Auto-recalculated Project Progress & Dynamic Health | `server/services/progressService.js:12-88` | **Verified Ground Truth** |
| AI Executive Summary Generation | `server/controllers/aiController.js:11-160` | **Verified Ground Truth** (Rule-based heuristics, no external LLM API) |
| Public Self-Registration Active | `server/controllers/authController.js:105-110` | **Inferred Drift / Disabled** (Returns 403 Forbidden) |
| Automated Database Demo Seeder Active | `server/seed/seed.js:4-21` | **Inferred Drift / Disabled** (Seeding permanently disabled) |
