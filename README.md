# Kristallball — Military Asset Management

Single-page React console plus one Express API for tracking vehicles, weapons, and ammunition across bases.

Kristallball treats inventory as a ledger. Purchases, transfers, assignments, and expenditures are the source of truth. Opening balance, closing balance, available stock, and remaining assigned quantity are computed from those rows — they are not stored as a mutable “current balance” field.

## Architecture

```
frontend/     React + Vite + Tailwind (port 4521)
backend/      Express + TypeScript + Prisma (port 4522)
postgres      Docker Compose (port 5432)
```

The browser talks to `/api` on the Vite origin. Vite proxies that prefix to the API so session cookies/tokens stay same-origin in development.

```
[Login] → JWT { userId, role, baseId }
                │
                ├─ ADMIN              global reads/writes, audit log
                ├─ BASE_COMMANDER     own base; assignments & expenditures
                └─ LOGISTICS_OFFICER  own base; purchases & transfers
```

## Entities

| Entity | Role in the ledger |
| --- | --- |
| **Base** | Installation that owns stock |
| **User** | Login account with a `Role` and optional `baseId` |
| **EquipmentType** | Catalog row: `WEAPON`, `VEHICLE`, or `AMMUNITION` |
| **Personnel** | Service member who can hold assigned equipment (not a login) |
| **Purchase** | Stock arriving at a base |
| **Transfer** | Unassigned stock moving base → base (`PENDING` / `IN_TRANSIT` / `COMPLETED`; only COMPLETED moves the ledger) |
| **Assignment** | Stock issued from a base armory to a person |
| **Expenditure** | Quantity consumed against an assignment |
| **AuditLog** | Immutable event for login and every write |
| **ApiAccessLog** | HTTP access row from logger middleware (every API except health) |

```
Base 1──* User
Base 1──* Personnel
Base 1──* Purchase *──1 EquipmentType
Base 1──* Assignment *──1 Personnel
Assignment 1──* Expenditure
Transfer.fromBase / Transfer.toBase → Base
```

## Inventory formulas

```
NetMovement = Purchases + TransfersIn - TransfersOut
Opening     = NetMovement_before_start - Assigned_before_start - Expended_before_start
Closing     = Opening + NetMovement - Assigned - Expended
```

`Opening` is the same formula applied to every ledger row **strictly before** the selected start date (zero if no start date is set).

Current picture (holdings table, independent of the period cards):

```
Received          = Purchases + TransfersIn - TransfersOut   (as of end date)
Available         = Received - AssignedQty                   (still in the armory)
Assigned remaining= AssignedQty - Expended                   (what a person still holds)
```

That last line is the core tracking story: if PFC Okonkwo is issued 10,000 rounds and expends 5,000, remaining on that assignment becomes 5,000 and the commander sees it.

Transfers and assignments lock `base + equipment type` with a Postgres advisory lock, recompute available stock from the ledger, then insert the row in the same transaction. Only `COMPLETED` transfers count toward in/out. An expenditure refuses a quantity greater than remaining on that assignment.

Every `/api` request is recorded by `loggerMiddleware` (method, path, status, duration, user) into `ApiAccessLog`. Request bodies are never stored. Business mutations still write `AuditLog` inside the same transaction as the change.

## RBAC matrix

| Capability | ADMIN | BASE_COMMANDER | LOGISTICS_OFFICER |
| --- | --- | --- | --- |
| Dashboard (opening / net / closing) | All bases | Own base | Own base |
| Holdings & personnel remaining | All | Own base | Own base (read) |
| Create purchase | Yes | No | Own base |
| Create transfer | Any origin | No | Origin = own base |
| Assign / record expenditure | Yes | Own base | No |
| Audit log | Yes | No | No |

`enforceBaseScope` overwrites `baseId` / `fromBaseId` from the JWT for non-admin roles. A commander cannot change installation by sending another `baseId` from the client.

## Seed accounts

| Username | Password | Role | Base |
| --- | --- | --- | --- |
| `admin_user` | `AdminPass123!` | ADMIN | All |
| `commander_alpha` | `CommandPass123!` | BASE_COMMANDER | Fort Alpha |
| `logistics_officer` | `LogisticsPass123!` | LOGISTICS_OFFICER | Fort Alpha |

Seed data includes Fort Alpha, Fort Bravo, and Station Charlie; Humvees, trucks, M4A1s, AK-47s, and ammunition lots; purchases; transfers; assignments; and PFC James Okonkwo’s 10,000-round draw with 5,000 expended (5,000 remaining).

## Local setup

Requires Node 20+ and Docker (or any PostgreSQL 16 reachable at `DATABASE_URL`).

```bash
cp .env.example .env
cp backend/.env.example backend/.env
# edit JWT_SECRET in both files

docker compose up -d

npm install
npm run db:setup
npm run dev
```

- Console: http://localhost:4521  
- API health: http://localhost:4522/api/health  

`db:setup` runs `prisma migrate dev` then the seed. On a fresh database you can also run:

```bash
npm run prisma:deploy -w backend
npm run prisma:seed -w backend
```

## Environment

See `.env.example`. Nothing secret belongs in git. `JWT_SECRET` must be set; `DATABASE_URL` points at Postgres.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string |
| `JWT_SECRET` | Signing key for access tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default `8h`) |
| `PORT` | API port (default `4522`) |
| `CORS_ORIGIN` | Allowed browser origin, or `*` |
| `VITE_API_BASE_URL` | Frontend Axios base URL (dev default `/api` via Vite proxy) |
| `KEEP_AWAKE_URL` | Optional public health URL the API pings every 5 minutes |

## Free Render / Railway

Free web services sleep after about 15 minutes with no inbound HTTP. A sleeping demo takes ~1 minute to wake.

An outside ping to `/api/health` every 5 minutes keeps it up. After you have a public URL:

1. Create a free HTTP(s) monitor on [UptimeRobot](https://uptimerobot.com) (5 minute interval) or [cron-job.org](https://cron-job.org), pointed at `https://<your-api>/api/health` (the site root works too).
2. If this repo is on GitHub, add secret `KEEP_AWAKE_URLS` with the same URL. `.github/workflows/ping.yml` curls it every 5 minutes.
3. On Render, `RENDER_EXTERNAL_URL` is already set; on Railway, `RAILWAY_PUBLIC_DOMAIN` is. The API pings that address itself once it is running. That loop cannot wake a box that already went to sleep — the monitor in step 1 does.
4. While a browser tab is open, the console also hits `/api/health` every 5 minutes.

One always-on Render free instance is ~720 hours/month, under the 750 hour cap.

## Postman / Insomnia

Import `postman/Kristallball.postman_collection.json`. Collection variable `baseUrl` defaults to `http://localhost:4522`. Run **Auth / Login as admin** first — a test script stores the JWT in `token`. Insomnia can import the same file.

## Submission pack

```bash
npm run pack:submission
```

Writes `submission/kristallball-source.zip` (no `node_modules`), plus copies `docs/schema.sql` and the documentation PDF into `submission/`.

## API (authenticated unless noted)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard/summary` | Opening / net / closing |
| GET | `/api/dashboard/holdings` | Available + remaining |
| GET | `/api/dashboard/personnel-holdings` | Per-person remaining |
| GET | `/api/dashboard/net-movement` | Modal breakdown |
| GET/POST | `/api/purchases` | Logistics + admin write |
| GET/POST | `/api/transfers` | Stock-checked when status is COMPLETED |
| PATCH | `/api/transfers/:id/status` | PENDING → IN_TRANSIT → COMPLETED |
| GET/POST | `/api/assignments` | Commander + admin write |
| GET | `/api/assignments/expenditures` | Expenditure history |
| POST | `/api/assignments/expenditures` | Remaining-qty check |
| GET | `/api/audit-logs` | Admin mutation audit |
| GET | `/api/audit-logs/access` | Admin HTTP access log |

Query filters: `startDate`, `endDate`, `baseId` (admin), `equipmentTypeId`.
