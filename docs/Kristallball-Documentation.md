# Kristallball — Military Asset Management

**Documentation report**  
Military Asset Management System (vehicles, weapons, ammunition) across multiple bases.

## 1. Purpose

Kristallball is a web app for base-level stock. Purchases, transfers, assignments, and expenditures are the source of truth. Opening balance, net movement, available armory stock, and remaining assigned quantity are computed from those rows. They are not stored as a mutable current-balance field.

The console is a React SPA. The API is Express + Prisma on PostgreSQL. Role-based access control scopes Base Commanders and Logistics Officers to the installation on their JWT.

## 2. Architecture

```
Browser (React + Vite + Tailwind, port 4521)
    │  /api  (Vite proxy in development)
    ▼
Express API (TypeScript, port 4522)
    │  Helmet, CORS, JSON body parser, loggerMiddleware
    │  JWT authenticateToken → authorizeRoles → enforceBaseScope
    ▼
PostgreSQL 16 (Docker Compose, port 5432)
    Prisma ORM + advisory locks for concurrent stock writes
```

Tech stack:

| Layer | Choice |
| --- | --- |
| Frontend | React 19, Vite 6, Tailwind CSS 4, Axios, Lucide, Recharts, Chart.js |
| Backend | Node.js, Express, TypeScript, Zod |
| Database | PostgreSQL via Prisma |
| Auth | JWT (`userId`, `role`, `baseId`), bcryptjs password hashes |
| API testing | Postman collection at `postman/Kristallball.postman_collection.json` |

## 3. Inventory formulas

```
NetMovement = Purchases + TransfersIn − TransfersOut
Opening     = NetMovement_before_start − Assigned_before − Expended_before
Closing     = Opening + NetMovement − Assigned − Expended
```

Only **COMPLETED** transfers are included in TransfersIn / TransfersOut.

Current holdings (independent of the date-window cards):

```
Received           = Purchases + In − Out     (as of end date)
Available          = Received − Assigned      (still in the armory)
Assigned remaining = Assigned − Expended      (what a person still holds)
```

Example: PFC James Okonkwo is issued 10,000 rounds and expends 5,000. Remaining on that assignment is 5,000.

## 4. ER schema

```
Base 1──* User
Base 1──* Personnel
Base 1──* Purchase *──1 EquipmentType
Base 1──* Assignment *──1 Personnel
Assignment 1──* Expenditure
Transfer.fromBase / Transfer.toBase → Base
User 1──* AuditLog
User 1──* ApiAccessLog
```

There is no `Assets` current-qty table. Quantity is always derived. That avoids two writers disagreeing on a cached balance.

High-query indexes exist on `baseId`, `equipmentTypeId`, and `createdAt` (and date columns used in the ledger window).

Transfer `status`: `PENDING` → `IN_TRANSIT` → `COMPLETED`. Stock leaves the origin only when the row becomes COMPLETED, inside a transaction that takes `pg_advisory_xact_lock(base, equipmentType)` and re-checks available quantity.

## 5. RBAC matrix

| Capability | ADMIN | BASE_COMMANDER | LOGISTICS_OFFICER |
| --- | --- | --- | --- |
| Dashboard (opening / net / closing) | All bases | Own base | Own base |
| Holdings & personnel remaining | All | Own | Own (read) |
| Create purchase | Yes | No | Own base |
| Create / complete transfer | Any origin | No | Origin = own base |
| Assign / record expenditure | Yes | Own base | No |
| Audit log + HTTP access log | Yes | No | No |

`enforceBaseScope` overwrites client `baseId` / `fromBaseId` from the JWT for non-admins.

## 6. API endpoints

Authenticated unless noted. Bearer JWT.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | Public |
| POST | `/api/auth/login` | Public; writes LOGIN audit |
| GET | `/api/auth/me` | Current user |
| GET | `/api/bases` | Reference |
| GET | `/api/equipment-types` | Reference |
| GET | `/api/personnel` | Scoped to base for non-admin |
| GET | `/api/dashboard/summary` | Opening / net / closing |
| GET | `/api/dashboard/holdings` | Available + remaining |
| GET | `/api/dashboard/personnel-holdings` | Per-person remaining |
| GET | `/api/dashboard/net-movement` | Modal breakdown |
| GET/POST | `/api/purchases` | Logistics + admin write |
| GET/POST | `/api/transfers` | COMPLETED is stock-checked |
| PATCH | `/api/transfers/:id/status` | Advance status |
| GET/POST | `/api/assignments` | Commander + admin write |
| GET/POST | `/api/assignments/expenditures` | Remaining-qty check |
| GET | `/api/audit-logs` | Admin mutation audit |
| GET | `/api/audit-logs/access` | Admin HTTP access log |

Query filters: `startDate`, `endDate`, `baseId` (admin), `equipmentTypeId`.

## 7. Audit model

Two logs, on purpose:

1. **AuditLog** — written *inside* the same Prisma transaction as a purchase, transfer, assignment, expenditure, or login. If the mutation rolls back, the audit row rolls back.
2. **ApiAccessLog** — written by `loggerMiddleware` after every `/api` response except health. Stores method, path, status, duration, user. **Never stores request bodies**, so passwords cannot leak into the log.

## 8. Local setup

Requires Node 20+ and Docker Desktop (PostgreSQL 16).

```bash
cp .env.example .env
cp .env.example backend/.env
cp frontend/.env.example frontend/.env
# set JWT_SECRET in .env and backend/.env

docker compose up -d
npm install
npm run db:setup
npm run dev
```

- Console: http://localhost:4521
- API: http://localhost:4522/api/health

Import `postman/Kristallball.postman_collection.json` and run **Auth → Login as admin**.

## 9. Sample test credentials

| Username | Password | Role | Scope |
| --- | --- | --- | --- |
| `admin_user` | `AdminPass123!` | ADMIN | All bases + audit |
| `commander_alpha` | `CommandPass123!` | BASE_COMMANDER | Fort Alpha |
| `logistics_officer` | `LogisticsPass123!` | LOGISTICS_OFFICER | Fort Alpha |

Seed story: Fort Alpha / Fort Bravo / Station Charlie; Humvees, FMTV trucks, M4A1s, AK-47s, 5.56 and 9mm lots; PFC James Okonkwo 10,000 rounds assigned / 5,000 remaining.

## 10. Submission artifacts

| Artifact | Location |
| --- | --- |
| Source archive | `npm run pack:submission` → `submission/kristallball-source.zip` |
| Schema DDL | `docs/schema.sql` |
| Optional data dump | `submission/dump.sql` (generated by `npm run pack:submission` when Postgres is running) |
| This report | `docs/Kristallball-Documentation.md` and `.pdf` |

## 11. Free hosting

Render free web services stop after ~15 minutes without HTTP traffic. Point a free monitor (UptimeRobot or cron-job.org, 5 minute interval) at `/api/health`. The API also pings itself in production (`RENDER_EXTERNAL_URL` / `RAILWAY_PUBLIC_DOMAIN` / `KEEP_AWAKE_URL`), and the browser console pings the same route while a tab is open. GitHub Actions workflow `.github/workflows/ping.yml` can curl `KEEP_AWAKE_URLS` on a 5 minute schedule.
