# BIG Metal Tracker — Setup Guide

## Prerequisites
- Node.js 18+
- MySQL 8+
- npm

## 1. Install dependencies
```bash
npm install
```

## 2. Create MySQL database
```sql
CREATE DATABASE metal_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 3. Run the schema migration
```bash
mysql -u root -p metal_tracker < migrations/001_initial_schema.sql
```

## 4. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `SESSION_SECRET` — any long random string (32+ chars)
- `SETTINGS_ENCRYPTION_KEY` — exactly 32 characters
- `APP_URL` — your server URL (used in email links)

## 5. Start the application
```bash
# Development (auto-restart on change)
npm run dev

# Production
npm start
```

Application runs on http://localhost:3000

## 6. First login
- Email: `admin@bigjewelry.com`
- Password: `Admin@1234`
- **Change this password immediately** via My Account → Change Password.

## 7. Configure SMTP & FTP (Admin → Settings)
After first login, go to **Admin → Settings** and enter:
- SMTP credentials for email notifications
- FTP credentials for Open PO import

## Project Structure
```
├── app.js              Express application
├── server.js           HTTP server + cron startup
├── config/             Database, session, mailer config
├── models/             Sequelize models (16 tables)
├── migrations/         001_initial_schema.sql (run once)
├── middleware/         Auth + CSRF middleware
├── services/           Business logic (balance, email, FTP, export)
├── validators/         express-validator rule sets
├── routes/             Express routers
├── controllers/        Route handlers
├── cron/               FTP polling job (node-cron)
├── views/              EJS templates + layouts + partials
└── public/             CSS + client-side JS
```

## Key Business Rules
1. **Casting shipments** (NY → India) must be GOLD or SILVER — never mixed in one document.
2. Metal balances **increase** when a factory marks a casting shipment as RECEIVED.
3. Metal balances **decrease** when NY marks a factory invoice as ACCEPTED.
4. Balance changes are atomic (MySQL transactions with SELECT FOR UPDATE).
5. Shipment numbers are globally sequential: `NY-YYMMDD-######`.
6. Factory users can only see data for their own factory.
7. Only ADMIN users can make manual balance adjustments.
