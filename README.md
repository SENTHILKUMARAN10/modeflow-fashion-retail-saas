# ModeFlow — Fashion Retail Management SaaS

ModeFlow is an interview-ready retail management SaaS concept designed for modern fashion boutiques and multi-store retailers. The project demonstrates UI/UX thinking, responsive frontend development, retail workflows, Supabase architecture and role-based security.

## Live demo

https://senthilkumaran10.github.io/thatha-kadai/

## Portfolio story

**Problem:** Fashion retailers often manage billing, stock, repeat customers and expenses across disconnected spreadsheets or basic POS tools.

**Solution:** ModeFlow combines point of sale, product inventory, customer relationships, expenses and retail analytics in one premium workspace.

**Demo tenant:** Atelier Vogue — a fictional fashion boutique used to demonstrate a realistic multi-tenant SaaS use case.

## Core features

- Premium responsive fashion-retail dashboard
- Point-of-sale invoice workflow
- Automatic stock deduction and restoration
- Product catalogue with cost, selling price, stock and reorder levels
- Low-stock alerts
- Customer CRM and lifetime value
- Order history with search
- Printable receipts
- WhatsApp receipt sharing
- Payment method and payment status tracking
- Operating expense management
- Gross-profit calculation
- Product performance analytics
- Payment-mix analytics
- JSON business-data export
- Supabase authentication bootstrap
- Multi-tenant PostgreSQL schema
- Row Level Security and owner/manager/staff roles

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Supabase / PostgreSQL
- Supabase Auth
- Row Level Security
- GitHub Pages

## SaaS architecture

The `supabase/` directory contains the production-oriented backend foundation for businesses, team members, products, customers, invoices, invoice items, expenses and stock movements. The schema is designed for multi-tenant data isolation using Supabase RLS policies.

## Portfolio / interview talking points

ModeFlow was designed around a real retail workflow rather than as a static dashboard. Completing a sale updates inventory, captures payment information, contributes to customer lifetime value and feeds business analytics. The UI is deliberately fashion-led while the data model remains reusable for multiple retail businesses.

Key design decisions include a persistent navigation model, clear merchandising hierarchy, responsive tables, low-stock states, point-of-sale receipt preview and analytics focused on metrics a fashion retailer would actually use.

## Demo vs cloud mode

The **Explore demo workspace** button uses seeded browser data so recruiters can explore the product instantly without credentials. Supabase configuration is also included for production authentication and backend deployment.

---

Portfolio project by Senthil Kumaran R.
