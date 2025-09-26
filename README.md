# PainlessPermit™ (LePerfectPermit)

Automate and standardize the permitting process for high-piled storage and city jurisdiction submittals.  
This application provides a full-stack solution with user authentication, project management, document uploads, stakeholder collaboration, notifications, and AI-assisted cover letter generation.

---

## ✨ Features

- 🔑 **Authentication & Roles**  
  Secure login system with role-based access (Specialists, Stakeholders).

- 📂 **Project Management**  
  Create, view, update, and delete projects with activity logs.

- 📑 **Document Management**  
  Upload, categorize, version, and manage permit-related documents.

- 🤖 **AI-Powered Cover Letters**  
  Generate jurisdiction-specific cover letters automatically with OpenAI.

- 👥 **Stakeholder Management**  
  Assign stakeholders, roles, and tasks within projects.

- 📬 **Notifications & Messaging**  
  In-app and email notifications, plus direct project messages.

- 📊 **Dashboard**  
  View status, metrics, and progress across all projects.

- 🌙 **Dark / Light Mode**  
  Fully themed UI with seamless dark and light mode switching.

---

## 🛠️ Tech Stack

**Frontend**
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for fast development builds
- [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) components
- Dark mode via CSS variables + Tailwind tokens

**Backend**
- [Node.js](https://nodejs.org/) / [Express](https://expressjs.com/)
- REST API routes for projects, documents, stakeholders, notifications, and tasks
- [Drizzle ORM](https://orm.drizzle.team/) for database access
- PDF & DOCX generation (cover letters, reports)

**Integrations**
- [OpenAI API](https://platform.openai.com/) for AI-generated cover letters
- [SendGrid](https://sendgrid.com/) for email notifications

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Clone Repository
```bash
git clone https://github.com/a-a-ronc/LePerfectPermit.git
cd LePerfectPermit
```

### Install Dependencies 
```bash
npm install
```

### Create a .env file
### Use .env.example as a template
``` bash
SENDGRID_API_KEY=your-sendgrid-key
GITHUB_TOKEN=your-github-token
OPENAI_API_KEY=your-openai-key
DATABASE_URL=your-db-connection-string
```

### Run Development Servers
``` bash
npm run dev
```
Frontend will run on http://localhost:5173
Backend will run on http://localhost:5000

## 📂 Project Structure
``` bash 
LePerfectPermit/
├── client/                # Frontend (React + Vite + Tailwind)
│   ├── public/            # Static assets
│   └── src/               # Source code
│       ├── components/    # Reusable UI components
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Frontend utilities
│       ├── pages/         # Route pages
│       ├── App.tsx        # Main app wrapper
│       ├── main.tsx       # Entry point
│       └── index.css      # Global styles
├── server/                # Backend (Express + Drizzle ORM)
│   ├── auth.ts            # Auth setup & password helpers
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database queries
│   ├── db.ts              # DB initialization
│   └── ...                # Other services (email, pdf, etc.)
├── shared/                # Shared schema (Zod + Types)
├── tailwind.config.ts     # Tailwind config w/ dark mode tokens
├── vite.config.ts         # Vite config
└── .env.example           # Example environment variables
```

## 🧑‍💻 Development Notes
Dark/Light mode is powered by use-theme.tsx + Tailwind tokens.

UI tokens are defined in index.css (:root & .dark).

Project/document CRUD lives in server/routes.ts.

Secrets must never be committed to .env.

