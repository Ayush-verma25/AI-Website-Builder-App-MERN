# 🪄 SiteSpark-AI-Website-Builder-App — MERN Stack

Describe the website you want in plain English, and let AI plan, generate, and let you live-edit a complete React project — right in the browser, with an instant sandboxed preview, iterative chat-based revisions, a file explorer, one-click ZIP export, and shareable published links.

Built with **MongoDB, Express, React (Vite), and Node.js**, with AI generation powered through **OpenRouter** and rendered live using **CodeSandbox Sandpack**.

---

## ✨ Key Features

- **Prompt → Full Website** — Describe a site in natural language; the AI plans a file structure and generates every file (components, styles, entry point) for a working React app.
- **Two-Phase AI Pipeline** — A *planning* phase decides which files to create, followed by a *parallel generation* phase (with configurable concurrency, retry rounds, and graceful fallback placeholders for files that fail to generate).
- **Live Sandboxed Preview** — Generated code renders instantly in-browser via `@codesandbox/sandpack-react` — no server-side build step needed.
- **Conversational Revisions** — Keep chatting to refine the site. The AI returns structured `create` / `update` (search-and-replace) / `delete` file operations that are diffed and applied against the existing project, rather than regenerating everything from scratch.
- **File Explorer & Code Editor** — Browse and inspect every generated file, with syntax-aware viewing inside the builder.
- **Real-Time Generation Status** — An agent progress dashboard tracks the plan, the file currently being written, and completed files as generation streams in.
- **Export as ZIP** — Download the entire generated project (via `jszip` + `file-saver`) to run or deploy anywhere.
- **Publish & Share** — Publish a project to a public, read-only preview link that doesn't require authentication.
- **Authentication** — Email/password auth with hashed passwords (`bcrypt`) and stateless sessions via JWT stored in an HTTP-only cookie.
- **Persistent Projects** — Every project (prompts, generated files, chat history, version number, status) is stored in MongoDB and tied to its owner.

---

## 🧱 Tech Stack

**Frontend** (`/client`)
| Tool | Purpose |
|---|---|
| React 19 + Vite | UI & dev tooling |
| React Router v7 | Client-side routing |
| Tailwind CSS v4 | Styling |
| Sandpack (`@codesandbox/sandpack-react`) | In-browser sandboxed code preview |
| Axios | API requests (with credentials) |
| React Hot Toast | Notifications |
| Lucide React | Icons |
| JSZip + FileSaver | Project export as `.zip` |
| Moment.js / lodash.debounce | Formatting & utility helpers |

**Backend** (`/server`)
| Tool | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| MongoDB + Mongoose | Data persistence |
| `ai` SDK + `@ai-sdk/openai` (via OpenRouter) | Structured AI generation (`generateObject`) |
| Zod | AI response schema validation |
| p-map | Concurrency-controlled parallel file generation |
| jsonwebtoken + bcrypt | Auth & password hashing |
| cookie-parser + cors | Session cookies & cross-origin requests |
| dotenv | Environment configuration |

---

## 🏗️ How It Works

1. **Create** — The user submits a prompt. A project is created immediately with `status: "pending"`, and generation continues in the background.
2. **Plan** — The AI produces a file plan (`FilePlanSchema`) — a list of files with paths and descriptions. `App.js` and `styles.css` are guaranteed to exist.
3. **Generate** — Each planned file is generated in parallel (default concurrency: 6) using structured output (`FileCodeSchema`), then normalized and validated/auto-fixed before being saved. Failed files are retried in additional rounds; any still-failing file gets a placeholder instead of blocking the whole project.
4. **Preview** — The frontend loads the generated files map straight into Sandpack for a live, sandboxed React preview.
5. **Revise** — Follow-up chat prompts send a compact file *manifest* (path, content hash, size) plus recent conversation context to the AI, which returns a set of `create` / `update` (search & replace) / `delete` operations. These are diffed and applied to the existing files rather than regenerating the whole project.
6. **Publish / Export** — Projects can be marked `published` (exposing a public read-only endpoint) or exported as a downloadable `.zip`.

Project status flows through: `pending → generating → completed` (or `revising` while processing a chat request, `failed` on unrecoverable errors).

---

## 📁 Project Structure

```
AI-Website-Builder-App-MERN/
├── client/                        # React + Vite frontend
│   ├── public/                    # Static assets (logo, favicon, background)
│   └── src/
│       ├── api/api.js             # Axios instance (withCredentials)
│       ├── components/            # ChatPanel, FileExplorer, PreviewPanel,
│       │                          # AgentProgressDashboard, PublishModal, etc.
│       ├── context/AppContext.jsx # Global app state (auth, projects, chat)
│       ├── pages/                 # HomePage, AuthPage, BuilderPage,
│       │                          # PreviewPage, PublishPage, Layout
│       ├── utils/                 # exportProject.js, sandpackUtils.js
│       └── App.jsx                # Route definitions
│
└── server/                        # Express + MongoDB backend
    ├── config/db.js               # Mongoose connection
    ├── models/                    # User.js, Project.js
    ├── Routes/                    # authRoutes.js, projectRoutes.js
    ├── controllers/                # authController, projectController, chatController
    ├── middleware/authMiddleware.js
    ├── services/
    │   ├── ai.js                  # Plan / generate / revise pipeline (OpenRouter)
    │   ├── aiSchemas.js           # Zod schemas for structured AI output
    │   ├── prompts.js             # System prompts for each AI phase
    │   ├── diff.js                # Applies create/update/delete file operations
    │   ├── codeValidator.js       # Post-generation code validation & fixes
    │   └── contentNormalizer.js   # Cleans/normalizes AI-generated content
    └── server.js                  # Express app entry point
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A [MongoDB](https://www.mongodb.com/) database (local or Atlas)
- An [OpenRouter](https://openrouter.ai/) API key (for AI generation)

### 1. Clone the repository

```bash
git clone https://github.com/Ayush-verma25/AI-Website-Builder-App-MERN.git
cd AI-Website-Builder-App-MERN
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create a `.env` file inside `server/`:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ORIGINS=http://localhost:5173
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
AI_MAX_CONCURRENCY=6
NODE_ENV=development
```

Run the server:

```bash
npm run dev     # nodemon, auto-restart
# or
npm start
```

### 3. Set up the frontend

```bash
cd ../client
npm install
```

Create a `.env` file inside `client/`:

```env
VITE_BASE_URL=http://localhost:3000
```

Run the client:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (Vite's default port), talking to the API at the URL set in `VITE_BASE_URL`.

---

## 🔑 Environment Variables

**Server (`server/.env`)**

| Variable | Description | Required |
|---|---|---|
| `PORT` | Port the Express server listens on | No (defaults to `3000`) |
| `MONGODB_URI` | MongoDB connection string | ✅ Yes |
| `JWT_SECRET` | Secret used to sign session JWTs | ✅ Yes (falls back to an insecure default if omitted — set this in production) |
| `ORIGINS` | Comma-separated list of allowed CORS origins | ✅ Yes |
| `OPENROUTER_API_KEY` | API key for OpenRouter (AI generation) | ✅ Yes |
| `OPENROUTER_MODEL` | Model identifier to use via OpenRouter | No (defaults to `openrouter/free`) |
| `AI_MAX_CONCURRENCY` | Max parallel file-generation requests | No (defaults to `6`) |
| `NODE_ENV` | `development` / `production` (affects cookie security flags) | No |

**Client (`client/.env`)**

| Variable | Description | Required |
|---|---|---|
| `VITE_BASE_URL` | Base URL of the backend API | No (defaults to same-origin) |

---

## 📡 API Reference

**Auth** — `/api/auth`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/register` | Create a new account | Public |
| POST | `/login` | Log in and receive a session cookie | Public |
| POST | `/logout` | Clear the session cookie | Public |
| GET | `/me` | Get the current authenticated user | Required |

**Projects** — `/api/projects`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/public/:id` | Get a published project (read-only) | Public |
| POST | `/` | Create a project from a prompt (starts background generation) | Required |
| GET | `/` | List the current user's projects | Required |
| GET | `/:id` | Get full project details (files, messages, status) | Required |
| DELETE | `/:id` | Delete a project | Required |
| PUT | `/:id/files` | Manually update a project's files | Required |
| POST | `/:id/publish` | Publish a project publicly | Required |
| POST | `/:id/chat` | Send a revision prompt; returns updated files & diff results | Required |

> Authenticated routes expect an `httpOnly` `token` cookie, set automatically on login/register (`withCredentials: true` on the frontend).

---

## 🗺️ Possible Improvements

- Add a `LICENSE` file (the backend `package.json` references MIT, but none is currently included at the repo root)
- Add automated tests for the AI pipeline and diff/patch logic
- Add rate limiting around AI generation and chat endpoints
- Reconcile the duplicate `chatController.js` / `chatControllers.js` files in `server/controllers`

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to fork the repo and open a pull request.

## 📄 License

No license file is currently present in this repository. Add one (e.g. MIT) if you intend for others to reuse this code.
