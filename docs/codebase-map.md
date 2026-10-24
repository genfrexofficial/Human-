# Codebase Map — ClientFlow & GENFREX Platform

## 1. Repository Directory Structure

```text
ClientFlow/
├── client/                               # Frontend Single Page Application (SPA)
│   ├── public/                           # Static assets served as-is
│   ├── src/
│   │   ├── assets/                       # Static images, icons, and branding
│   │   ├── components/                   # Modular reusable React components
│   │   │   ├── common/                   # Global UI primitives
│   │   │   │   ├── Badge.jsx             # Status and role indicator badge
│   │   │   │   ├── Button.jsx            # Action button with loading & variant states
│   │   │   │   ├── Card.jsx              # Card container with dark theme styles
│   │   │   │   ├── EmptyState.jsx        # Standardized empty state graphic & message
│   │   │   │   ├── Input.jsx             # Text, number, date, and select inputs
│   │   │   │   ├── Modal.jsx             # Accessible overlay modal wrapper
│   │   │   │   ├── Navbar.jsx            # Global header bar with user profile & bell
│   │   │   │   ├── ProgressBar.jsx       # Visual progress bar with animated transitions
│   │   │   │   ├── ProtectedRoute.jsx    # Client-side role-based routing guard
│   │   │   │   ├── Sidebar.jsx           # Role-adaptive multi-menu sidebar navigation
│   │   │   │   └── Skeleton.jsx          # Placeholder pulsing loading skeletons
│   │   │   ├── dashboard/                # Analytics & metric widgets
│   │   │   │   ├── ProjectProgressChart.jsx # Recharts progress visualization
│   │   │   │   ├── RecentActivityFeed.jsx   # Stream of recent system events
│   │   │   │   ├── RecentProjectsTable.jsx  # Compact project overview table
│   │   │   │   └── StatCard.jsx          # Metric statistic card with trend indicator
│   │   │   ├── feedback/                 # Feedback & comments
│   │   │   │   └── CommentSection.jsx    # Threaded discussion & revision notes
│   │   │   ├── files/                    # File & deliverable UI components
│   │   │   │   ├── ChangeRequestModal.jsx   # Client revision feedback submission modal
│   │   │   │   ├── DeliverableReviewCard.jsx# Deliverable card with Approve/Reject actions
│   │   │   │   └── FileUploadModal.jsx   # Multipart file upload modal with category tags
│   │   │   ├── hr/                       # HR OfferFlow components
│   │   │   │   ├── ApprovalModal.jsx     # Admin two-stage appointment sign-off modal
│   │   │   │   ├── CandidateModal.jsx    # Candidate creation/editing modal
│   │   │   │   ├── LetterPreviewModal.jsx# In-app vector preview of generated letter
│   │   │   │   └── SendEmailModal.jsx    # SMTP dispatch confirmation modal
│   │   │   ├── milestones/               # Milestone timeline components
│   │   │   │   ├── MilestoneModal.jsx    # Milestone create/edit modal
│   │   │   │   └── MilestoneTimeline.jsx # Vertical phase progression roadmap
│   │   │   ├── notifications/            # Notification center components
│   │   │   │   └── NotificationDropdown.jsx # Bell dropdown with unread badge counter
│   │   │   ├── projects/                 # Project lifecycle components
│   │   │   │   ├── AIProjectSummaryModal.jsx# AI executive brief modal window
│   │   │   │   ├── CompletionSummaryModal.jsx# Printable project completion report
│   │   │   │   ├── ProjectCard.jsx       # Grid card summarizing project status
│   │   │   │   └── ProjectModal.jsx      # Project creation & configuration modal
│   │   │   └── tasks/                    # Task boards & modals
│   │   │       ├── TaskModal.jsx         # Task creation & assignment modal
│   │   │       └── TaskTable.jsx         # Interactive data grid for task execution
│   │   ├── context/                      # Global React State Contexts
│   │   │   ├── AuthContext.jsx           # JWT session, current user, role helpers
│   │   │   └── NotificationContext.jsx   # Live notifications, polling, unread counts
│   │   ├── layouts/
│   │   │   └── AppLayout.jsx             # Shell layout uniting Navbar, Sidebar, Content
│   │   ├── pages/                        # View pages grouped by role domain
│   │   │   ├── LandingPage.jsx           # Public marketing landing page
│   │   │   ├── admin/                    # Agency & Platform Administration (17 pages)
│   │   │   │   ├── AdminActivities.jsx   # System-wide audit trail and event stream
│   │   │   │   ├── AdminClients.jsx      # Client account registry & credentials
│   │   │   │   ├── AdminDashboard.jsx    # Executive analytics overview & KPIs
│   │   │   │   ├── AdminFiles.jsx        # Project file manager
│   │   │   │   ├── AdminHRReports.jsx    # HR hiring and onboarding performance reports
│   │   │   │   ├── AdminHRTeam.jsx       # HR specialist staff management
│   │   │   │   ├── AdminNotifications.jsx# Notification management center
│   │   │   │   ├── AdminPendingApprovals.jsx# Trainee appointment approval queue
│   │   │   │   ├── AdminProjectDetails.jsx# Deep project workspace (tasks, files, roadmap)
│   │   │   │   ├── AdminProjects.jsx     # Project registry with stage filters
│   │   │   │   ├── AdminReports.jsx      # General agency business reporting
│   │   │   │   ├── AdminSettings.jsx     # Platform global branding & configurations
│   │   │   │   ├── AdminStorage.jsx      # Google Drive & multi-cloud storage diagnostics
│   │   │   │   ├── AdminTaskRequests.jsx # Client task request intake & approval queue
│   │   │   │   ├── AdminTasks.jsx        # Global task oversight board
│   │   │   │   ├── AdminUsers.jsx        # Enterprise user directory & password control
│   │   │   │   └── AdminEmployees.jsx      # Engineering team & freelancer staff roster
│   │   │   ├── auth/                     # Authentication views
│   │   │   │   ├── AdminSetup.jsx        # First-time primary Administrator onboarding
│   │   │   │   ├── Login.jsx             # 1-click & credentialed sign-in screen
│   │   │   │   └── Register.jsx          # Public registration screen (redirects to login)
│   │   │   ├── client/                   # Client Portal views (9 pages)
│   │   │   │   ├── ClientActivity.jsx    # Client-visible timeline of project events
│   │   │   │   ├── ClientDashboard.jsx   # Client operational dashboard & pending actions
│   │   │   │   ├── ClientFiles.jsx       # Deliverable catalog & review center
│   │   │   │   ├── ClientNotifications.jsx# Client notifications
│   │   │   │   ├── ClientProfile.jsx     # Client profile & company information
│   │   │   │   ├── ClientProjectDetails.jsx # Client view of project tasks & milestones
│   │   │   │   ├── ClientProjects.jsx    # List of assigned client projects
│   │   │   │   ├── ClientTaskRequests.jsx# Request new scope / task submission page
│   │   │   │   └── ClientTasks.jsx       # Read-only task progression board
│   │   │   ├── hr/                       # HR OfferFlow views (6 pages)
│   │   │   │   ├── AppointmentDetails.jsx# Complete letter view, approval status, & PDF
│   │   │   │   ├── AppointmentsList.jsx  # Appointment letters ledger with status filters
│   │   │   │   ├── Candidates.jsx        # Talent pool registry & candidate cards
│   │   │   │   ├── CreateAppointment.jsx # Form wizard to draft Trainee appointment
│   │   │   │   ├── HRDashboard.jsx       # Recruitment KPIs, pipeline metrics, activity
│   │   │   │   └── HRSettings.jsx        # Reference numbering & letter terms settings
│   │   │   └── Employee/                   # Employee / Team Portal views (7 pages)
│   │   │       ├── EmployeeActivity.jsx    # Employee task log and recent operations
│   │   │       ├── EmployeeDashboard.jsx   # Assigned tasks, progress counters, due dates
│   │   │       ├── EmployeeFiles.jsx       # Technical files & deliverable submissions
│   │   │       ├── EmployeeProfile.jsx     # Personal Employee profile & skills
│   │   │       ├── EmployeeProjects.jsx    # Projects where Employee is assigned
│   │   │       ├── EmployeeTaskDetails.jsx # Granular task execution, notes, file upload
│   │   │       └── EmployeeTasks.jsx       # Assigned task kanban / list with status shifts
│   │   ├── services/                     # Frontend Axios API client abstractions
│   │   │   ├── activityService.js        # /api/activities endpoints
│   │   │   ├── aiService.js              # /api/ai endpoints
│   │   │   ├── api.js                    # Base Axios instance with JWT interceptor
│   │   │   ├── authService.js            # /api/auth endpoints
│   │   │   ├── clientService.js          # /api/users/clients endpoints
│   │   │   ├── commentService.js         # /api/comments endpoints
│   │   │   ├── fileService.js            # /api/files endpoints & binary download/view
│   │   │   ├── hrService.js              # /api/hr endpoints
│   │   │   ├── milestoneService.js       # /api/milestones endpoints
│   │   │   ├── notificationService.js    # /api/notifications endpoints
│   │   │   ├── projectService.js         # /api/projects endpoints
│   │   │   ├── taskRequestService.js     # /api/task-requests endpoints
│   │   │   ├── taskService.js            # /api/tasks endpoints
│   │   │   ├── userService.js            # /api/users endpoints
│   │   │   └── EmployeeService.js          # /api/users/Employees endpoints
│   │   ├── utils/                        # Formatting helpers & constants
│   │   │   ├── constants.js              # Enums, statuses, colors, categories
│   │   │   └── formatters.js             # Currency, bytes, date formatters
│   │   ├── App.jsx                       # Route registry with role guards
│   │   ├── index.css                     # Tailwind CSS base and utility directives
│   │   └── main.jsx                      # React 18 DOM mount point
│   ├── package.json                      # Frontend dependencies
│   ├── tailwind.config.js                # Tailwind color palette & font configuration
│   └── vite.config.js                    # Vite configuration (port 5173, dev proxy)
│
├── server/                               # Backend REST API Application
│   ├── config/                           # Database & external provider setup
│   │   ├── bootstrapAdmin.js             # Initial Administrator auto-creation
│   │   ├── cloudinary.js                 # Cloudinary SDK client configuration
│   │   ├── db.js                         # Mongoose MongoDB connection initializer
│   │   └── s3.js                         # AWS S3 / R2 S3Client configuration
│   ├── controllers/                      # Request handlers & domain logic
│   │   ├── activityController.js         # Audit log & recent activity retrieval
│   │   ├── aiController.js               # Programmatic heuristic project summary
│   │   ├── appointmentController.js      # Appointment letter lifecycle & approvals
│   │   ├── authController.js             # Login, first admin setup, session profile
│   │   ├── candidateController.js        # Talent pool CRUD & project linking
│   │   ├── commentController.js          # Threaded project & deliverable comments
│   │   ├── fileController.js             # File uploads, replacements, downloads, review
│   │   ├── hrReportsController.js        # HR recruitment metrics & letter templates
│   │   ├── milestoneController.js        # Milestone roadmaps CRUD
│   │   ├── notificationController.js     # In-app notifications & mark-as-read
│   │   ├── projectController.js          # Project CRUD, stage transitions, analytics
│   │   ├── taskController.js             # Task lifecycle, progress updates, reviews
│   │   ├── taskRequestController.js      # Client scope requests approval workflow
│   │   └── userController.js             # Enterprise user management & password control
│   ├── middleware/                       # Request processing middleware
│   │   ├── authMiddleware.js             # JWT verification, RBAC, project/task guards
│   │   ├── errorMiddleware.js            # Global error handler with JSON formatting
│   │   └── uploadMiddleware.js           # Multer file storage, sanitizer, extension filter
│   ├── models/                           # Mongoose Schemas (16 Models)
│   │   ├── Activity.js                   # Project activity log entries
│   │   ├── AppointmentLetter.js          # Full appointment letter schema & workflow
│   │   ├── AuditLog.js                   # Security audit ledger (storage & user admin)
│   │   ├── Candidate.js                  # Candidate profile in talent pool
│   │   ├── Comment.js                    # Threaded discussions on projects/files
│   │   ├── File.js                       # Master file catalog & storage metadata
│   │   ├── HRApproval.js                 # Formal appointment approval signatures
│   │   ├── HRAuditLog.js                 # Immutable HR action audit records
│   │   ├── HRSettings.js                 # Atomic reference numbering & HR configuration
│   │   ├── LetterTemplate.js             # Role-specific terms & compensation templates
│   │   ├── Milestone.js                  # Project roadmap milestones
│   │   ├── Notification.js               # User notification records
│   │   ├── Project.js                    # Core project schema (stage, health, progress)
│   │   ├── Task.js                       # Engineering tasks, priorities, hours, status
│   │   ├── TaskRequest.js                # Client submitted task requests
│   │   └── User.js                       # User collection (4 roles, tokenVersion, bcrypt)
│   ├── routes/                           # Express route definitions (12 Modules)
│   │   ├── activityRoutes.js             # /api/activities
│   │   ├── aiRoutes.js                   # /api/ai
│   │   ├── authRoutes.js                 # /api/auth
│   │   ├── commentRoutes.js              # /api/comments
│   │   ├── fileRoutes.js                 # /api/files
│   │   ├── hrRoutes.js                   # /api/hr
│   │   ├── milestoneRoutes.js            # /api/milestones
│   │   ├── notificationRoutes.js         # /api/notifications
│   │   ├── projectRoutes.js              # /api/projects
│   │   ├── taskRequestRoutes.js          # /api/task-requests
│   │   ├── taskRoutes.js                 # /api/tasks
│   │   └── userRoutes.js                 # /api/users
│   ├── services/                         # Business logic services
│   │   ├── activityService.js            # Activity logging helper
│   │   ├── emailService.js               # Nodemailer SMTP dispatch & templates
│   │   ├── googleDriveService.js         # Google Drive API v3 operations & cache
│   │   ├── hrService.js                  # Atomic sequence numbering & HR audit logger
│   │   ├── notificationService.js        # Notification dispatch helper
│   │   ├── pdfService.js                 # Vector 2-page A4 PDF generator via PDFKit
│   │   ├── progressService.js            # Progress & health auto-calculation engine
│   │   ├── s3Service.js                  # S3 upload, presigned URLs, object streaming
│   │   └── storageService.js             # Central multi-tier storage dispatcher
│   ├── seed/                             # Database seed scripts
│   │   └── seed.js                       # Notice script (seeding permanently disabled)
│   ├── uploads/                          # Local disk storage fallback directory
│   ├── package.json                      # Server dependencies & scripts
│   ├── server.js                         # Express server entry point
│   ├── cleanup-demo-data.js              # Utility script to purge legacy mock data
│   ├── inspect-db.js                     # Inspection utility for MongoDB collections
│   ├── test-acceptance.js                # Acceptance test for Client task request flow
│   ├── test-api.js                       # Basic API ping test
│   ├── test-cloud-storage.js             # Multi-cloud storage unit & security test
│   ├── test-cross-module-link.js         # 11-scenario ClientFlow <-> OfferFlow test
│   ├── test-genfrex-unified.js           # Multi-role single endpoint acceptance test
│   ├── test-google-drive-storage.js      # Google Drive API v3 full verification suite
│   ├── test-isolated-fresh-db.js         # Zero-dependency test against fresh database
│   ├── test-production-constraints.js    # Production constraints & security barrier test
│   └── test-strict-auth.js               # Strict RBAC, session revocation, & password test
│
├── GOOGLE_DRIVE_SETUP.md                 # Setup guide for Google Cloud Project & Drive v3
├── README.md                             # Initial Hackathon documentation
└── package.json                          # Root repository orchestration scripts
```

---

## 2. API Routes to Controllers Mapping

| HTTP Method | Route | Controller Function | File | Authorized Roles | Description |
|---|---|---|---|---|---|
| **Health** | | | | | |
| `GET` | `/api/health` | Inline handler | `server.js:76` | Public | Returns API health, timestamp, and service status |
| **Authentication** | | | | | |
| `GET` | `/api/auth/setup-status` | `getSetupStatus` | `authController.js:21` | Public | Checks if platform needs first-time Admin setup |
| `POST` | `/api/auth/setup-admin` | `setupFirstAdmin` | `authController.js:37` | Public (`adminCount===0`) | Creates primary Administrator account |
| `POST` | `/api/auth/register` | `register` | `authController.js:105` | Public | **Disabled (HTTP 403 Forbidden)** |
| `POST` | `/api/auth/login` | `login` | `authController.js:115` | Public | Validates credentials and returns JWT Bearer token |
| `GET` | `/api/auth/me` | `getMe` | `authController.js:174` | Authenticated | Retrieves currently logged-in user profile |
| `POST` | `/api/auth/forgot-password` | `forgotPassword` | `authController.js:189` | Public | **Disabled (HTTP 403 Forbidden)** |
| `POST` | `/api/auth/reset-password` | `forgotPassword` | `authController.js:189` | Public | **Disabled (HTTP 403 Forbidden)** |
| **User Administration** | | | | | |
| `GET` | `/api/users` | `getAllUsers` | `userController.js` | `ADMIN` | List all users across all roles |
| `POST` | `/api/users` | `createUser` | `userController.js` | `ADMIN` | Create user account (ADMIN, HR, Employee, CLIENT) |
| `PATCH`| `/api/users/:id` | `updateUser` | `userController.js` | `ADMIN` | Update user details, role, or active status |
| `DELETE`| `/api/users/:id` | `deleteUser` | `userController.js` | `ADMIN` | Soft or hard delete user account |
| `PATCH`| `/api/users/:id/password` | `changeUserPassword` | `userController.js` | `ADMIN` | Admin resets a user's password |
| `PATCH`| `/api/users/admin/password` | `changeAdminPassword` | `userController.js` | `ADMIN` | Admin updates own password |
| `PATCH`| `/api/users/change-password` | `rejectNonAdminPasswordChange` | `userController.js` | Any | Explicitly rejected (HTTP 403) |
| `GET` | `/api/users/clients` | `getClients` | `userController.js` | `ADMIN` | Legacy filtered clients list |
| `POST` | `/api/users/clients` | `createClient` | `userController.js` | `ADMIN` | Legacy client account creation |
| `GET` | `/api/users/Employees` | `getEmployees` | `userController.js` | `ADMIN` | Legacy filtered Employees list |
| `POST` | `/api/users/Employees` | `createEmployee` | `userController.js` | `ADMIN` | Legacy Employee account creation |
| `GET` | `/api/users/hr` | `getHRUsers` | `userController.js` | `ADMIN` | Legacy filtered HR staff list |
| `POST` | `/api/users/hr` | `createHRUser` | `userController.js` | `ADMIN` | Legacy HR account creation |
| **Projects** | | | | | |
| `GET` | `/api/projects/analytics/overview` | `getAdminOverviewAnalytics`| `projectController.js` | `ADMIN` | Agency dashboard KPIs & status metrics |
| `GET` | `/api/projects` | `getProjects` | `projectController.js` | Authenticated | Get projects (filtered by client if role=CLIENT) |
| `GET` | `/api/projects/:id` | `getProjectById` | `projectController.js` | Authenticated | Get project details, team, and metrics |
| `GET` | `/api/projects/:id/summary` | `getProjectSummary` | `projectController.js` | Authenticated | Get completion summary and deliverables count |
| `POST` | `/api/projects` | `createProject` | `projectController.js` | `ADMIN` | Create new project with client assignment |
| `PUT` | `/api/projects/:id` | `updateProject` | `projectController.js` | `ADMIN` | Update project parameters, dates, or budget |
| `PUT` | `/api/projects/:id/stage` | `updateProjectStage` | `projectController.js` | `ADMIN` | Transition project stage (PLANNING -> DEPLOYMENT) |
| `DELETE`| `/api/projects/:id` | `deleteProject` | `projectController.js` | `ADMIN` | Cascade delete project and associated tasks |
| **Tasks** | | | | | |
| `GET` | `/api/tasks/my-tasks` | `getMyTasks` | `taskController.js` | `Employee`, `ADMIN` | Get tasks assigned to logged-in Employee |
| `GET` | `/api/tasks/project/:projectId`| `getProjectTasks` | `taskController.js` | Authenticated | Get tasks for project (clientVisible enforced) |
| `GET` | `/api/tasks/:id` | `getTaskById` | `taskController.js` | Authenticated | Single task details with attachments |
| `POST` | `/api/tasks` | `createTask` | `taskController.js` | `ADMIN` | Create task (recalculates project progress) |
| `PUT` | `/api/tasks/:id` | `updateTask` | `taskController.js` | `ADMIN`, `Employee` | Update task details or status |
| `POST` | `/api/tasks/:id/start` | `startTask` | `taskController.js` | `Employee`, `ADMIN` | Move task to IN_PROGRESS & record startedAt |
| `POST` | `/api/tasks/:id/progress` | `updateTaskProgress` | `taskController.js` | `Employee`, `ADMIN` | Update percentage progress (0-100) |
| `POST` | `/api/tasks/:id/submit-review`| `submitTaskForReview` | `taskController.js` | `Employee`, `ADMIN` | Move task to IN_REVIEW |
| `POST` | `/api/tasks/:id/block` | `blockTask` | `taskController.js` | `Employee`, `ADMIN` | Flag task as BLOCKED (triggers health update) |
| `POST` | `/api/tasks/:id/complete` | `completeTask` | `taskController.js` | `ADMIN` | Mark task COMPLETED (triggers progress recalc) |
| `DELETE`| `/api/tasks/:id` | `deleteTask` | `taskController.js` | `ADMIN` | Remove task and adjust project metrics |
| **Client Task Requests** | | | | | |
| `GET` | `/api/task-requests` | `getTaskRequests` | `taskRequestController.js` | `ADMIN`, `CLIENT`| List scope requests |
| `POST` | `/api/task-requests` | `createTaskRequest`| `taskRequestController.js` | `CLIENT` | Client submits request for new feature / scope |
| `GET` | `/api/task-requests/:id` | `getTaskRequestById` | `taskRequestController.js` | `ADMIN`, `CLIENT`| Single request details |
| `POST` | `/api/task-requests/:id/approve` | `approveTaskRequest` | `taskRequestController.js`| `ADMIN` | Approves request & generates engineering Task |
| `POST` | `/api/task-requests/:id/reject` | `rejectTaskRequest` | `taskRequestController.js` | `ADMIN` | Rejects request with revision reason |
| **Milestones** | | | | | |
| `GET` | `/api/milestones/project/:projectId` | `getProjectMilestones` | `milestoneController.js` | Authenticated | Get roadmap milestones for project |
| `POST` | `/api/milestones` | `createMilestone` | `milestoneController.js` | `ADMIN` | Add milestone to roadmap |
| `PUT` | `/api/milestones/:id` | `updateMilestone` | `milestoneController.js` | `ADMIN` | Update milestone completion or dates |
| `DELETE`| `/api/milestones/:id` | `deleteMilestone` | `milestoneController.js` | `ADMIN` | Delete roadmap milestone |
| **Files & Storage** | | | | | |
| `GET` | `/api/files/storage-stats` | `getStorageStats` | `fileController.js:845` | `ADMIN` | Live Drive/S3/Cloudinary stats & storage quota |
| `GET` | `/api/files/browse` | `browseFiles` | `fileController.js:906` | Authenticated | Search & filter indexed files |
| `POST` | `/api/files/upload` | `uploadProjectFile` | `fileController.js:119` | Authenticated | Upload file to Drive/S3/Local storage |
| `POST` | `/api/files/upload-confidential` | `uploadConfidentialHRFile` | `fileController.js` | `ADMIN`, `HR` | Upload confidential HR / employee file |
| `PUT` | `/api/files/:id/replace` | `replaceFile` | `fileController.js` | Authenticated | Replace file with new binary (removes old) |
| `GET` | `/api/files/project/:projectId` | `getProjectFiles` | `fileController.js:54` | Authenticated | List files for project (RBAC enforced) |
| `GET` | `/api/files/:id/download` | `downloadFile` | `fileController.js:445` | Authenticated | Stream file binary as attachment |
| `GET` | `/api/files/:id/view` | `downloadFile` | `fileController.js:445` | Authenticated | Stream file binary inline for in-browser view |
| `PUT` | `/api/files/:id/review` | `reviewDeliverable` | `fileController.js:769` | `CLIENT`, `ADMIN`| Sign-off deliverable (APPROVED / CHANGES_REQUESTED) |
| `DELETE`| `/api/files/:id` | `deleteProjectFile`| `fileController.js:688` | Authenticated | Soft-delete file & remove remote storage object |
| **Comments & Discussions** | | | | | |
| `GET` | `/api/comments/project/:projectId` | `getProjectComments`| `commentController.js` | Authenticated | Retrieve threaded discussions |
| `POST` | `/api/comments` | `createComment` | `commentController.js` | Authenticated | Post message on project or deliverable |
| `DELETE`| `/api/comments/:id` | `deleteComment` | `commentController.js` | Authenticated | Delete comment |
| **Activities & Notifications** | | | | | |
| `GET` | `/api/activities/recent` | `getRecentActivities` | `activityController.js` | Authenticated | Stream of recent project activity |
| `GET` | `/api/activities/audit` | `getAuditLogs` | `activityController.js` | `ADMIN` | System security & storage audit ledger |
| `GET` | `/api/activities/project/:projectId` | `getProjectActivities` | `activityController.js` | Authenticated | Activities for specific project |
| `GET` | `/api/notifications` | `getUserNotifications`| `notificationController.js` | Authenticated | Notifications for logged-in user |
| `PUT` | `/api/notifications/read-all` | `markAllAsRead` | `notificationController.js` | Authenticated | Mark all notifications read |
| `PUT` | `/api/notifications/:id/read` | `markAsRead` | `notificationController.js` | Authenticated | Mark single notification read |
| **AI Intelligence** | | | | | |
| `GET` | `/api/ai/project/:id/summary` | `generateProjectSummary` | `aiController.js:11` | Authenticated | Executive project summary brief |
| **HR OfferFlow** | | | | | |
| `GET` | `/api/hr/candidates` | `getCandidates` | `candidateController.js` | `ADMIN`, `HR` | Get talent pool candidate records |
| `POST` | `/api/hr/candidates` | `createCandidate` | `candidateController.js` | `ADMIN`, `HR` | Add candidate to talent pool |
| `GET` | `/api/hr/candidates/:id` | `getCandidateById` | `candidateController.js` | `ADMIN`, `HR` | Single candidate record |
| `PUT` | `/api/hr/candidates/:id` | `updateCandidate` | `candidateController.js` | `ADMIN`, `HR` | Update candidate details |
| `DELETE`| `/api/hr/candidates/:id` | `deleteCandidate` | `candidateController.js` | `ADMIN`, `HR` | Remove candidate |
| `POST` | `/api/hr/candidates/:id/link-project` | `linkCandidateToProject` | `candidateController.js` | `ADMIN`, `HR` | Link candidate to client project |
| `GET` | `/api/hr/appointments` | `getAppointments` | `appointmentController.js` | `ADMIN`, `HR` | List appointment letters with status filter |
| `POST` | `/api/hr/appointments` | `createAppointment` | `appointmentController.js` | `ADMIN`, `HR` | Draft new Trainee/Intern appointment letter |
| `GET` | `/api/hr/appointments/:id` | `getAppointmentById` | `appointmentController.js` | `ADMIN`, `HR` | Get complete appointment letter record |
| `PUT` | `/api/hr/appointments/:id` | `updateAppointment` | `appointmentController.js` | `ADMIN`, `HR` | Update appointment letter |
| `POST` | `/api/hr/appointments/:id/submit` | `submitForApproval` | `appointmentController.js` | `ADMIN`, `HR` | Submit draft to Admin approval queue |
| `POST` | `/api/hr/appointments/:id/approve` | `approveAppointment`| `appointmentController.js` | `ADMIN` | Admin approves letter for PDF generation |
| `POST` | `/api/hr/appointments/:id/reject` | `rejectAppointment` | `appointmentController.js` | `ADMIN` | Admin rejects letter with notes |
| `POST` | `/api/hr/appointments/:id/generate-pdf` | `generatePDF` | `appointmentController.js` | `ADMIN`, `HR` | Generate A4 PDF via PDFKit & save to Drive |
| `POST` | `/api/hr/appointments/:id/send` | `sendAppointment` | `appointmentController.js` | `ADMIN`, `HR` | Dispatch PDF via SMTP email to candidate |
| `PUT` | `/api/hr/appointments/:id/acceptance` | `updateAcceptanceStatus` | `appointmentController.js` | `ADMIN`, `HR` | Update acceptance status (ACCEPTED/DECLINED) |
| `DELETE`| `/api/hr/appointments/:id` | `deleteAppointment`| `appointmentController.js` | `ADMIN`, `HR` | Delete appointment letter |
| `GET` | `/api/hr/stats` | `getHRStats` | `hrReportsController.js` | `ADMIN`, `HR` | HR pipeline metrics & counters |
| `GET` | `/api/hr/reports` | `getHRReports` | `hrReportsController.js` | `ADMIN`, `HR` | Candidate conversion & recruitment reports |
| `GET` | `/api/hr/audit-logs` | `getHRAuditLogs` | `hrReportsController.js` | `ADMIN`, `HR` | Immutable HR action ledger |
| `GET` | `/api/hr/settings` | `getHRSettings` | `hrReportsController.js` | `ADMIN`, `HR` | Get reference number sequence settings |
| `PUT` | `/api/hr/settings` | `updateHRSettings` | `hrReportsController.js` | `ADMIN` | Update reference prefix & sequence |
| `GET` | `/api/hr/templates` | `getLetterTemplates`| `hrReportsController.js` | `ADMIN`, `HR` | Get master letter templates |
| `POST` | `/api/hr/templates` | `createLetterTemplate` | `hrReportsController.js` | `ADMIN` | Create master letter template |
| `PUT` | `/api/hr/templates/:id` | `updateLetterTemplate` | `hrReportsController.js` | `ADMIN` | Update template terms & clauses |
| `DELETE`| `/api/hr/templates/:id` | `deleteLetterTemplate` | `hrReportsController.js` | `ADMIN` | Delete master letter template |

---

## 3. Database Models & Schema Specifications

| Model Name | Source File | Collection | Key Fields | Strategic Indexes |
|---|---|---|---|---|
| **`User`** | `server/models/User.js` | `users` | `name`, `email`, `password`, `role`, `status`, `isActive`, `tokenVersion`, `candidateId`, `appointmentLetterId` | `{ role: 1 }`, `{ email: 1 }` (unique) |
| **`Project`** | `server/models/Project.js` | `projects` | `name`, `client`, `createdBy`, `stage`, `health`, `assignedEmployees`, `progress`, `budget`, `startDate`, `endDate` | `{ client: 1 }`, `{ status: 1 }`, `{ stage: 1 }`, `{ health: 1 }`, `{ assignedEmployees: 1 }` |
| **`Task`** | `server/models/Task.js` | `tasks` | `project`, `milestone`, `title`, `status`, `priority`, `progress`, `dueDate`, `assignedTo`, `taskRequest`, `clientVisible`, `attachments`, `startedAt`, `completedAt` | `{ project: 1, status: 1 }`, `{ assignedTo: 1, status: 1 }`, `{ dueDate: 1 }`, `{ clientVisible: 1 }` |
| **`TaskRequest`** | `server/models/TaskRequest.js`| `taskrequests` | `title`, `description`, `project`, `requestedBy`, `priority`, `status`, `reviewedBy`, `createdTask` | `{ project: 1, status: 1 }`, `{ requestedBy: 1 }`, `{ status: 1 }` |
| **`Milestone`** | `server/models/Milestone.js` | `milestones` | `project`, `title`, `description`, `dueDate`, `status`, `order` | `{ project: 1 }` |
| **`File`** | `server/models/File.js` | `files` | `fileName`, `originalFileName`, `driveFileId`, `driveFolderId`, `storageProvider`, `storageKey`, `fileUrl`, `mimeType`, `fileSize`, `module`, `category`, `isConfidential`, `isDeliverable`, `approvalStatus`, `revisionNotes` | `{ driveFileId: 1 }`, `{ entityId: 1 }`, `{ uploadedBy: 1 }`, `{ module: 1 }`, `{ status: 1 }`, `{ project: 1, category: 1 }`, `{ task: 1 }`, `{ isConfidential: 1 }`, `{ createdAt: -1 }` |
| **`AuditLog`** | `server/models/AuditLog.js` | `auditlogs` | `performedBy`, `performedByRole`, `action`, `targetUser`, `fileId`, `fileName`, `relatedModule`, `metadata`, `timestamp` | `{ performedBy: 1, timestamp: -1 }`, `{ targetUser: 1, timestamp: -1 }`, `{ fileId: 1, timestamp: -1 }`, `{ action: 1, timestamp: -1 }` |
| **`Candidate`** | `server/models/Candidate.js` | `candidates` | `name`, `email`, `phone`, `designation`, `department`, `employmentType`, `candidateStatus`, `compensation`, `projectId`, `clientId`, `requirementId`, `assignedEmployee` | `{ designation: 1 }`, `{ candidateStatus: 1 }`, `{ projectId: 1 }`, `{ clientId: 1 }` |
| **`AppointmentLetter`**| `server/models/AppointmentLetter.js`| `appointmentletters`| `referenceNumber`, `candidateId`, `clientId`, `projectId`, `requirementId`, `appointmentType`, `designation`, `compensation`, `status`, `pdfFileId`, `pdfUrl`, `emailStatus`, `acceptanceStatus` | `{ candidateId: 1 }`, `{ projectId: 1 }`, `{ clientId: 1 }`, `{ status: 1 }`, `{ joiningDate: 1 }`, `{ referenceNumber: 1 }` (unique) |
| **`LetterTemplate`** | `server/models/LetterTemplate.js`| `lettertemplates` | `title`, `designation`, `department`, `appointmentType`, `standardTerms`, `confidentialityTerms`, `responsibilities`, `isDefault` | `{ designation: 1 }`, `{ appointmentType: 1 }` |
| **`HRSettings`** | `server/models/HRSettings.js` | `hrsettings` | `companyName`, `referencePrefix`, `referenceYear`, `currentSequence`, `companyAddress`, `authorizedSignatoryName`, `authorizedSignatoryTitle` | Single document collection |
| **`HRApproval`** | `server/models/HRApproval.js` | `hrapprovals` | `appointmentLetterId`, `approvedBy`, `role`, `status`, `comments`, `approvedAt` | `{ appointmentLetterId: 1 }` |
| **`HRAuditLog`** | `server/models/HRAuditLog.js` | `hrauditlogs` | `actorId`, `action`, `appointmentLetterId`, `candidateId`, `previousStatus`, `newStatus`, `metadata`, `timestamp` | `{ appointmentLetterId: 1 }`, `{ candidateId: 1 }`, `{ timestamp: -1 }` |
| **`Comment`** | `server/models/Comment.js` | `comments` | `project`, `file`, `user`, `content`, `parentComment` | `{ project: 1 }`, `{ file: 1 }` |
| **`Activity`** | `server/models/Activity.js` | `activities` | `project`, `user`, `action`, `description`, `entityType`, `entityId`, `clientVisible` | `{ project: 1 }`, `{ createdAt: -1 }` |
| **`Notification`** | `server/models/Notification.js` | `notifications` | `user`, `project`, `title`, `message`, `type`, `isRead`, `link` | `{ user: 1, isRead: 1 }`, `{ createdAt: -1 }` |

---

## 4. Frontend Route & Page Structure

All frontend routes are defined in `client/src/App.jsx` wrapped inside `AuthProvider` and `NotificationProvider`:

- **Public Routes**:
  - `/` -> Navigates to `/login`
  - `/landing` -> `LandingPage.jsx`
  - `/login` -> `Login.jsx` (Includes instant 1-click login buttons for Admin, Client, Employee, and HR)
  - `/register` -> Redirects to `/login`
  - `/setup-admin` -> Redirects to `/login` (Initial setup only)

- **Admin Routes (`/admin/*`)** [Guard: `role === 'ADMIN'`]:
  - `dashboard` -> `AdminDashboard.jsx`
  - `projects` -> `AdminProjects.jsx`
  - `projects/:id` -> `AdminProjectDetails.jsx`
  - `task-requests` -> `AdminTaskRequests.jsx`
  - `Employees` -> `AdminEmployees.jsx`
  - `clients` -> `AdminClients.jsx`
  - `hr-team` -> `AdminHRTeam.jsx`
  - `users` -> `AdminUsers.jsx`
  - `tasks` -> `AdminTasks.jsx`
  - `files` -> `AdminFiles.jsx`
  - `reports` -> `AdminReports.jsx`
  - `activities` -> `AdminActivities.jsx`
  - `notifications` -> `AdminNotifications.jsx`
  - `storage` -> `AdminStorage.jsx`
  - `settings` -> `AdminSettings.jsx`
  - `hr/dashboard` -> `HRDashboard.jsx`
  - `hr/candidates` -> `Candidates.jsx`
  - `hr/appointments` -> `AppointmentsList.jsx`
  - `hr/appointments/:id` -> `AppointmentDetails.jsx`
  - `hr/pending-approvals` -> `AdminPendingApprovals.jsx`
  - `hr/reports` -> `AdminHRReports.jsx`

- **HR Routes (`/hr/*`)** [Guard: `role === 'HR' || role === 'ADMIN'`]:
  - `dashboard` -> `HRDashboard.jsx`
  - `candidates` -> `Candidates.jsx`
  - `appointments` -> `AppointmentsList.jsx`
  - `appointments/create` -> `CreateAppointment.jsx`
  - `appointments/:id` -> `AppointmentDetails.jsx`
  - `settings` -> `HRSettings.jsx`

- **Employee Routes (`/Employee/*`)** [Guard: `role === 'Employee'`]:
  - `dashboard` -> `EmployeeDashboard.jsx`
  - `tasks` -> `EmployeeTasks.jsx`
  - `tasks/:id` -> `EmployeeTaskDetails.jsx`
  - `projects` -> `EmployeeProjects.jsx`
  - `files` -> `EmployeeFiles.jsx`
  - `activity` -> `EmployeeActivity.jsx`
  - `profile` -> `EmployeeProfile.jsx`

- **Client Routes (`/client/*`)** [Guard: `role === 'CLIENT'`]:
  - `dashboard` -> `ClientDashboard.jsx`
  - `projects` -> `ClientProjects.jsx`
  - `projects/:id` -> `ClientProjectDetails.jsx`
  - `task-requests` -> `ClientTaskRequests.jsx`
  - `tasks` -> `ClientTasks.jsx`
  - `files` -> `ClientFiles.jsx`
  - `activity` -> `ClientActivity.jsx`
  - `notifications` -> `ClientNotifications.jsx`
  - `profile` -> `ClientProfile.jsx`
