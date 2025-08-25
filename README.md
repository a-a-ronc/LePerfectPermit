# Painless Permit

_Painless Permit_ automates and standardizes permit packages for industrial projects (e.g., racking, conveyors, mezzanines) across city and county jurisdictions. The goal: turn messy, inconsistent requirements into a consistent, review-ready submittal—fast.

> Monorepo layout with `client/`, `server/`, and `shared/`, TypeScript-first, Vite + Tailwind on the front end, and Drizzle-based data modeling. Replit configs are included for quick spins. :contentReference[oaicite:0]{index=0}

---

## What it does (at a glance)

- **Smart intake wizard** – capture project context (site, occupancy/use, hazards, temps, sprinkler type, etc.) and normalize it into code-aware data.
- **Jurisdiction profiles** – encode local reviewer quirks (checklists, forms, document types, label/placard rules).
- **Permit pack generator** – assemble the correct checklist, narratives, labeled drawings/specs list, and submittal forms.
- **Review tracking** – log comments/RFIs, required resubmittals, and close-out artifacts (load plaques, labels, as-builts).
- **Evidence & QA** – attach calcs, prints, photos, barcode labels, and inspection sign-offs.

> Repository contains `drizzle.config.ts`, `tailwind.config.ts`, `vite.config.ts`, and `replit.*` files that support this architecture. :contentReference[oaicite:1]{index=1}

---

## Status

- **Phase:** active development / private alpha  
- **Repo:** public codebase scaffolded with client/server/shared and 200+ commits to date. :contentReference[oaicite:2]{index=2}
- **MVP focus:** intake → jurisdiction rules → checklist & document pack → submission tracker.

> See repo languages and structure on GitHub (TypeScript-heavy). :contentReference[oaicite:3]{index=3}

---

## Tech stack

- **Language:** TypeScript  
- **Client:** Vite + React + Tailwind  
- **Server:** Node (TypeScript) with lightweight HTTP framework  
- **Data:** Drizzle ORM (SQLite/Postgres supported)  
- **Dev:** Replit Nix config, PostCSS

*(Exact versions: check `package.json` once you pull.)* :contentReference[oaicite:4]{index=4}

---

## Quick start (local)

1. **Clone**
   ```bash
   git clone https://github.com/a-a-ronc/LePerfectPermit.git
   cd LePerfectPermit
2. **Install**
   ```bash
    npm install
3. **Environment**
Create .env in the repo root
   ```bash
    npm install
    # choose one:
    DATABASE_URL="file:./permit.db"     # SQLite for local
    # or
    # DATABASE_URL="postgres://user:pass@host:5432/permit"
    NODE_ENV=development
    PORT=3001
4.  **DB (Drizzle)**
   ```bash
    npx drizzle-kit generate
    npx drizzle-kit migrate
```
5. **Run (two terminals)
   ```bash
    # terminal A (server)
    npm run dev:server

    # terminal B (client)
    npm run dev:client

**High Level Architecture**
   ```bash
   LePerfectPermit/
├─ client/           # React app (Vite + Tailwind)
├─ server/           # API (TypeScript), rules engine, auth/session
├─ shared/           # shared types/schemas, validation, enums
├─ drizzle.config.ts # DB config
├─ tailwind.config.ts
├─ vite.config.ts
└─ replit.*          # Replit configuration
```
**Roadmap**

- Jurisdiction ruleset library (import/export + versioning)

- Automated document pack: narratives, permit forms, load plaque data, labels

- Comment/RFI workflow with resubmittal diffs

- Reviewer-facing share links (optional), activity log

- API hooks to WMS/ERP for project metadata

- Metrics: time-to-permit, first-pass yield, rework causes

**Security & notes**

- No production secrets in the repo. Use environment variables in deployment.

- For customer deployments: SSO/OIDC and row-level isolation are planned.

**License**

MIT for the scaffold and general code; certain jurisdiction rule content may be proprietary.
