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
| **Transfer** | Unassigned stock moving base → base (atomic) |
| **Assignment** | Stock issued from a base armory to a person |
| **Expenditure** | Quantity consumed against an assignment |
| **AuditLog** | Immutable event for login and every write |

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

Transfers and assignments lock `base + equipment type` with a Postgres advisory lock, recompute available stock from the ledger, then insert the row in the same transaction. An expenditure refuses a quantity greater than remaining on that assignment.

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
| GET/POST | `/api/transfers` | Stock-checked transaction |
| GET/POST | `/api/assignments` | Commander + admin write |
| POST | `/api/assignments/expenditures` | Remaining-qty check |
| GET | `/api/audit-logs` | Admin only |

Query filters: `startDate`, `endDate`, `baseId` (admin), `equipmentTypeId`.
