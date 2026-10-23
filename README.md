# ClientFlow (Client Portal Lite)

> **ClientFlow** is a modern, lightweight client collaboration and project tracking platform built for freelancers, software agencies, design studios, and consultants. It centralizes client communication, milestone roadmaps, task execution, deliverable reviews, approvals, and activity tracking into one unified portal.

---

## 🌟 Key Features

### 🏢 Agency / Admin Workspace
- **Dashboard & Analytics:** Real-time metrics on active projects, deliverables awaiting review, completion rates, and an interactive Recharts progress chart.
- **Project Lifecycle Management:** Create, edit, configure, and monitor projects with auto-calculated progress percentages based on task completion.
- **Client Management:** Register and manage client accounts with auto-generated secure temporary credentials clearly displayed on creation.
- **Task Management:** Granular task boards with priority tiers (Low, Medium, High), target due dates, and real-time status transitions (`TODO`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`).
- **Milestone Roadmaps:** Phase-by-phase timeline roadmaps with visual completion markers.
- **Deliverables & Document Storage:** Dual-engine storage (Cloudinary cloud storage with automated local disk fallback) supporting previews and downloads.
- **Real-Time Activity Audit Trail:** Automated activity logging for every project creation, file upload, task completion, and approval.
- **In-App Notification Center:** Dropdown notification bell with unread counters and 1-click "mark all read" action.
- **Completion Summary:** Dedicated completion modal & printable report when all milestones and tasks are achieved.
- **✨ AI Executive Summary:** One-click automated project intelligence synthesizing progress, pending approvals, bottlenecks, and next targets.

### 👤 Client Portal
- **Streamlined Dashboard:** Focused overview of active projects, pending deliverables requiring sign-off, and upcoming milestones.
- **Interactive Deliverable Review Flow:** Review submitted deliverables with one-click **Approve** or **Request Changes** (modal with custom revision notes).
- **Discussion & Feedback:** Threaded messaging on deliverables and general project scope without lost emails or scattered chat apps.
- **Read-Only Transparency:** Real-time visibility into engineering tasks and milestone progress without permission to alter project settings.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React.js (Vite) | High-performance reactive UI |
| **Styling** | Tailwind CSS | Modern, clean SaaS design system |
| **Routing** | React Router DOM v6 | Role-guarded client and admin routes |
| **API Client** | Axios | REST communication with JWT interceptors |
| **Icons** | Lucide React | Crisp, semantic SVG iconography |
| **Charts** | Recharts | Visual project progress analytics |
| **Feedback** | React Hot Toast | Responsive toast notifications |
| **Backend Framework**| Node.js & Express.js | Secure RESTful API server |
| **Database** | MongoDB Atlas / Local | Document storage via Mongoose |
| **Authentication** | JWT & bcryptjs | Stateless auth & password hashing |
| **File Storage** | Cloudinary & Multer | Cloud storage with seamless local disk fallback |

---

## 📂 Folder Structure

```text
ClientFlow/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Button, Input, Modal, Badge, ProgressBar, Skeleton, Navbar, Sidebar
│   │   │   ├── dashboard/      # StatCard, ProjectProgressChart, RecentProjectsTable, RecentActivityFeed
│   │   │   ├── projects/       # ProjectCard, ProjectModal, CompletionSummaryModal, AIProjectSummaryModal
│   │   │   ├── tasks/          # TaskTable, TaskModal
│   │   │   ├── milestones/     # MilestoneTimeline, MilestoneModal
│   │   │   ├── files/          # DeliverableReviewCard, FileUploadModal, ChangeRequestModal
│   │   │   ├── feedback/       # CommentSection
│   │   │   └── notifications/  # NotificationDropdown
│   │   ├── pages/
│   │   │   ├── auth/           # Login.jsx, Register.jsx
│   │   │   ├── admin/          # Dashboard, Projects, ProjectDetails, Clients, Tasks, Files, Notifications, Settings
│   │   │   ├── client/         # Dashboard, Projects, ProjectDetails, Files, Notifications, Profile
│   │   │   └── LandingPage.jsx # Public landing page with 1-click demo launcher
│   │   ├── layouts/            # AppLayout.jsx
│   │   ├── context/            # AuthContext.jsx, NotificationContext.jsx
│   │   ├── services/           # Axios API services for all backend resources
│   │   ├── utils/              # Formatters, constants, helpers
│   │   ├── App.jsx             # Route definitions & guards
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Tailwind base directives & custom scrollbars
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env
│
├── server/
│   ├── config/                 # Database & Cloudinary initialization
│   ├── controllers/            # Auth, User, Project, Task, Milestone, File, Comment, Activity, Notification, AI
│   ├── middleware/             # JWT auth, role authorization, Multer upload, error handling
│   ├── models/                 # User, Project, Task, Milestone, File, Comment, Activity, Notification
│   ├── routes/                 # Express route definitions
│   ├── services/               # Progress calculation, activity logger, notifications, storage engine
│   ├── seed/                   # Database seeder with demo accounts and rich project data
│   ├── uploads/                # Local file storage fallback directory
│   ├── server.js               # Express application entry point
│   ├── package.json
│   └── .env
│
├── package.json                # Root orchestration scripts
├── README.md
└── .gitignore
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v22 tested)
- **MongoDB**: Local MongoDB listening on port `27017` or a MongoDB Atlas connection string.

### 2. Installation
Install all dependencies in root, server, and client with:

```bash
# In the root directory:
npm install
npm --prefix server install
npm --prefix client install
```

### 3. Environment Configuration

#### Backend (`server/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/clientportal
JWT_SECRET=clientflow_jwt_secret_super_secure_key_2026_hackathon
CLIENT_URL=http://localhost:5173

# Optional: Cloudinary credentials (If omitted, files are saved locally in /uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

#### Frontend (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🧪 Database Seeding

Populate the database with demo accounts, a sample project, tasks, milestones, deliverables, comments, activities, and notifications:

```bash
cd server
npm run seed
```

---

## 🔑 Demo Credentials

| Role | Email | Password | Purpose |
|---|---|---|---|
| **Agency Admin** | `admin@clientportal.com` | `Admin@123` | Full control over projects, tasks, clients, and deliverables |
| **Client** | `client@clientportal.com` | `Client@123` | Project review, deliverable approvals, feedback, and progress |

> 💡 **Tip:** The landing page (`/`) and login page (`/login`) include **1-click quick login buttons** to instantly authenticate as either Admin or Client without typing!

---

## 🚀 Running the Application

### Option A: Run concurrently from root
```bash
# Start backend (Port 5000)
npm run server

# In another terminal, start frontend (Port 5173)
npm run client
```

### Option B: Run individually
```bash
# Terminal 1 - Backend
cd server
npm run start

# Terminal 2 - Frontend
cd client
npm run dev
```

Visit the application at: **http://localhost:5173**

---

## 📡 REST API Overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new agency account | Public |
| `POST` | `/api/auth/login` | Login and receive JWT token | Public |
| `GET` | `/api/auth/me` | Get current user profile | Private |
| `GET` | `/api/projects` | Get all projects (or assigned for client) | Private |
| `POST` | `/api/projects` | Create new project | Admin |
| `GET` | `/api/projects/:id` | Get project details & statistics | Private |
| `PUT` | `/api/projects/:id` | Update project details | Admin |
| `DELETE` | `/api/projects/:id` | Cascade delete project | Admin |
| `GET` | `/api/projects/:id/summary` | Project completion summary metrics | Private |
| `GET` | `/api/tasks/project/:projectId` | Get tasks for a project | Private |
| `POST` | `/api/tasks` | Create task (auto recalculates progress) | Admin |
| `PUT` | `/api/tasks/:id` | Update task status or details | Admin |
| `DELETE` | `/api/tasks/:id` | Delete task | Admin |
| `GET` | `/api/milestones/project/:projectId` | Get project milestones | Private |
| `POST` | `/api/milestones` | Add project milestone | Admin |
| `PUT` | `/api/milestones/:id` | Update milestone status | Admin |
| `DELETE` | `/api/milestones/:id` | Delete milestone | Admin |
| `GET` | `/api/files/project/:projectId` | Get project files & deliverables | Private |
| `POST` | `/api/files/upload` | Upload file (Cloudinary or local disk) | Private |
| `PUT` | `/api/files/:id/review` | Deliverable review (Approve / Request Changes) | Client/Admin |
| `DELETE` | `/api/files/:id` | Delete file from storage & database | Admin |
| `GET` | `/api/comments/project/:projectId` | Get threaded comments | Private |
| `POST` | `/api/comments` | Post comment / revision feedback | Private |
| `GET` | `/api/activities/recent` | Get global recent activity stream | Private |
| `GET` | `/api/notifications` | Get user notifications & unread count | Private |
| `PUT` | `/api/notifications/read-all` | Mark all notifications as read | Private |
| `GET` | `/api/users/clients` | Get client accounts list | Admin |
| `POST` | `/api/users/clients` | Create new client with temp password | Admin |
| `GET` | `/api/ai/project/:id/summary` | Generate automated AI project brief | Private |

---

## 🌐 Production Deployment

### Frontend (Vercel)
1. Push repository to GitHub.
2. Link the repository in Vercel and select root directory as `client`.
3. Set Environment Variable: `VITE_API_BASE_URL=https://your-render-backend.onrender.com/api`
4. Build command: `npm run build` (output directory: `dist`).

### Backend (Render)
1. Create a **Web Service** on Render pointing to repository root `server`.
2. Environment: `Node`. Build Command: `npm install`. Start Command: `npm run start`.
3. Set Environment Variables:
   - `MONGODB_URI`: Your MongoDB Atlas URI (`mongodb+srv://...`)
   - `JWT_SECRET`: Random 32+ character string
   - `CLIENT_URL`: Your Vercel frontend URL
   - Cloudinary keys (if using cloud storage)

---

#   H R M S  
 #   H R M S  
 #   H R M S  
 