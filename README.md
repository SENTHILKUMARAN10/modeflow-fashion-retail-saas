# Thatha Kadai — Business OS

A responsive billing, inventory, CRM and analytics SaaS built around a real small-business workflow. The project demonstrates product thinking, UI/UX design, frontend engineering, database design and SaaS security concepts in one portfolio project.

## Product goal

Small shops often manage billing, stock and expenses in separate notebooks or spreadsheets. Thatha Kadai Business OS combines these workflows into one simple dashboard designed for fast day-to-day use on desktop and mobile.

## Features

- Professional dashboard with revenue, gross profit, invoices and low-stock KPIs
- Invoice creation with quantity, rate, discount, payment method and payment status
- Live invoice preview
- Printable invoice view
- WhatsApp invoice sharing
- Inventory management with cost price, selling price, stock and reorder alerts
- Customer CRM generated from sales activity
- Expense tracking with categories and notes
- Invoice history with search and deletion
- Stock restoration when an invoice is deleted in demo mode
- Reports for average order value, inventory value, product performance and payment mix
- JSON backup export
- Responsive mobile-first interface
- Demo mode for instant portfolio review
- Supabase-ready production authentication and database architecture

## SaaS backend architecture

The `supabase/migrations` folder contains the production PostgreSQL schema. It includes:

- `businesses`
- `business_members`
- `products`
- `customers`
- `invoices`
- `invoice_items`
- `expenses`
- `stock_movements`

The database is designed as a multi-tenant SaaS. Every operational record belongs to a business. Row Level Security policies restrict access to business members, with `owner`, `manager` and `staff` roles.

An atomic `create_invoice` PostgreSQL function validates stock, creates/links the customer, inserts the invoice and item, deducts inventory and records the stock movement in a single transaction.

## Security

- Supabase Auth-ready email/password login
- Row Level Security on tenant data
- Role-aware write/delete policies
- Public frontend uses only the Supabase publishable/anon key; service-role keys are never stored in browser code
- Server-side database constraints protect quantities, prices and payment values

## Demo vs production mode

The application opens instantly in Demo Mode using browser storage so recruiters can test the complete workflow without credentials.

For production Supabase login, set the project's public browser key in `supabase/config.js`. The project URL is already configured. Never place the Supabase service-role key in this repository.

## Technology

- HTML5
- CSS3 / responsive design
- Vanilla JavaScript
- Supabase Auth
- PostgreSQL
- Row Level Security
- GitHub / GitHub Pages-compatible static deployment

## Interview talking points

**Problem:** Small businesses need a lightweight alternative to spreadsheets for billing, inventory and expenses.

**Design decision:** The UI prioritizes quick invoicing and high-visibility KPIs while keeping secondary operations in a simple sidebar navigation.

**Engineering decision:** Demo mode makes the portfolio frictionless, while the repository also contains a genuine multi-tenant Supabase schema demonstrating how the same interface can move to production persistence and authentication.

**Data integrity:** Invoice creation is modeled as a transaction so stock deduction and billing records cannot become inconsistent.

**Scalability:** Tenant ownership and business membership are modeled separately, allowing multiple businesses and multiple staff roles without duplicating the product.

## Repository structure

```text
index.html
styles.css
app.js
supabase/
  config.js
  client.js
  schema.sql
  migrations/
    20260905_000001_business_os.sql
ARCHITECTURE.md
```

## Portfolio title

**Business Billing & Inventory SaaS — Thatha Kadai Business OS**

Suggested resume description:

> Designed and developed a responsive business management SaaS for billing, inventory, customer CRM, expenses and analytics. Implemented invoice generation, stock tracking, low-stock alerts, payment tracking, WhatsApp sharing and reporting; designed a multi-tenant Supabase/PostgreSQL backend with authentication, Row Level Security and role-based access.
