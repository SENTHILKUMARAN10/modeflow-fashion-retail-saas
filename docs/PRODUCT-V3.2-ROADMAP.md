# Salesventory — Product Roadmap v3.2

One platform to run an entire business: billing, inventory, accounting, POS, GST, CRM,
reporting and operations for SMBs. This document tracks every requirement and its build status.

Status legend: `DONE` (shipped) · `PARTIAL` (working subset) · `BUILD` (in progress) · `PLAN` (next to implement)

## Phase 1 — Core (currently building)
| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Main dashboard | DONE | Date filters (today/yesterday/7d/30d/month/lastmonth/year/custom), range KPIs (sales/purchases/expenses/net/gross/margin), balance KPIs (receivables/payables/stock value), today/best/top customer/pending/P&L, sales+expense trends |
| 2 | Customers | PARTIAL | Directory done: add/edit/archive from DB, full fields (phone/email/company/address/tags/notes), one-tap duplicate, merged purchase stats, status pill, tag-group & active/archived filter chips + profile statement & New sale (opens billing prefilled). Remaining: credit limit, email adapters |
| 3 | Suppliers | PARTIAL | CRUD + one-tap duplicate + purchases + payments + payables + ledger/statement (date-filtered) + copy/CSV/print done. Remaining: POs, returns, debit notes |
| 4 | Products / services | PARTIAL | name/cost/price/stock/reorder/service/category/sku/barcode/unit + one-click duplicate + bulk selling-price revision (% up/down, optional category filter) + WhatsApp catalogue share + printable Restock list (items below reorder level with suggested order qty) + one-tap WhatsApp reorder requisition to supplier. Add brand, HSN, GST rate, MRP, variants, images, batches |
| 5 | Inventory | PARTIAL | stock via RPCs + suppliers/purchases receive + stock movements ledger (last 100 entries: item, qty in/out, type, warehouse, reference, note) + printable stock sheet (system vs counted columns, valuation at cost, business header). Add stock adjustments, valuation, audit/count, expiry alerts, warehouse CRUD |
| 7 | Sales billing | PARTIAL | multi-item checkout (complete_multi_item_sale) + single-item; statuses paid/partial/unpaid + overdue (due-date-aware), history filter, full item-line invoice print + notes on print + amount-in-words. Edit invoice (owner/manager): set due date (drives overdue/reminders) + notes saved to DB. Due date + notes settable right at POS checkout for credit sales (persisted after checkout). Remaining: GST, PO#, transport |
| 14 | Purchases | PARTIAL | PO→bill flow done: “Receive stock & bill now” at creation or keep open PO; printable bill/PO document, notes, BILL/PO tags, due date + overdue/status, one-tap duplicate. Add GST, freight, supplier invoice #, batch/expiry capture |
| 16 | Payments In | PARTIAL | customer receipts against invoices (amount/method/ref, auto outstanding → paid/partial) + Receipts list on Transactions with total + printable receipt per payment. Add advance, USD |
| 17 | Payments Out | PARTIAL | Purchase payments exist; generalise to supplier payment out with ledger effect |
| 18 | Payment modes | PARTIAL | cash/bank/upi/card/cheque/wallet/custom selectable on sale + purchase + receipt flows; add cheques lifecycle |
| 19 | Receivables | PARTIAL | ageing 0-30/31-60/61-90/90+ on Analytics with due-today/overdue chips + payments in. Add advance, credit note application |
| 20 | Payables | PARTIAL | ageing 0-30/31-60/61-90/90+ on Analytics with due-today/overdue chips + payment out + supplier payables reconciliation (bills/billed/paid/outstanding/overdue/status, CSV, total outstanding); overdue surfaced on dashboard alerts |
| 22 | Expenses | PARTIAL | category/vendor/amount/mode/date/notes + category filter chips (per-cat totals) + one-tap duplicate + Analytics spend-by-category (share, CSV) + category presets. Add receipt image, GST, recurring, vendor field |
| 34 | Reporting | PARTIAL | avg order, inventory value, product perf, payment mix, ageing + Sales performance suite (range KPIs: revenue/orders/units/gross profit/customers, top product/customer, sales by product/category/customer) + P&L + CSV + Print/PDF. Add full sales/purchase/financial suite with filters |
| 61 | Business settings | DONE | profile, phone, address, currency, invoice prefix (owner-gated, DB-backed); GSTIN/PAN/taxes arrive with GST module |
| 68 | Tenant isolation | DONE | RLS + verify scripts; every table carries business_id |

## Phase 2 — Business operations
| # | Area | Status | Notes |
|---|------|--------|-------|
| 9 | POS billing | PARTIAL | fast checkout, USB barcode scan, hold/resume (up to 5 carts, local), cash received → change/shortfall calculator, live preview, quick re-sell (one-tap copy past invoice into Billing), qty steppers (±) with stock guard + quick ×½/×2/×5 qty presets, reprint last sale from Billing; add split payments, cashier login, shift open/close |
| 6 | Barcode | PARTIAL | USB-scanner capture (global key buffer): add to cart on billing, filter on Products; price-label bulk print on Products; stock-count mode remains |
| 10 | Estimates / quotations | PARTIAL | Quotes page: create quote (customer, expiry, notes, product/qty/rate lines via create_sales_document), list with type/status filters, statuses (open/accepted/fulfilled/cancelled/rejected), print quotation, WhatsApp share, convert quote→sales order (convert_quote_to_order) and quote/order→invoice with stock deduction + payment method/status (convert_sales_document_to_invoice); add quote→challan |
| 11 | Sales orders | PARTIAL | sales orders created via quote→order conversion AND directly (New sales order button + #open=new:order intent, SO-numbered via create_sales_document) and listed on Quotes & orders (SO type, open/accepted/fulfilled, convert to invoice) + accept quote / fulfil order + duplicate document; add challan |
| 12 | Delivery challan | PLAN | items, driver/vehicle, signature, print/WhatsApp |
| 13 | Sales returns | PARTIAL | Return from any transaction (Transactions → Return): select item/qty, refund method incl. credit note, reason, restock toggle; records sales_returns via create_sales_return RPC (stock + stock_movements) + Returns register with total on Transactions |
| 15 | Purchase returns | PLAN | debit note, supplier refund, stock adjust |
| 21 | Payment reminders | PARTIAL | due-date aware: Remind on overdue + due-soon (≤3 days) invoices with tailored messages, Due-soon filter on Transactions |
| 28 | GST | PLAN | CGST/SGST/IGST/cess, HSN/SAC, inclusive/exclusive, place of supply, reverse charge |
| 29 | GST reports | PLAN | GSTR-1/3B summaries, HSN summary, input/output tax |
| 35 | Warehouses | PARTIAL | stock across warehouses on Products (warehouse list with value + low items, per-warehouse product stock via salesdesk_warehouse_stock) + multi-line transfer (transfer_inventory RPC: from/to warehouse, product/qty lines, notes, atomic move + stock_movements) + transfer history with detail drill-down (click a transfer → line items + notes); add warehouse CRUD + warehouse reports |
| 39 | CRM | PARTIAL | leads: mark customer as lead in customer dialog (status field, Lead chip in all/active/leads/archived segments + LEAD badge in profile); per-customer follow-ups on customer profile (task title, due date, priority, note; mark done with outcome, delete), full member RLS on customer_followups; dashboard Follow-ups inbox (open tasks sorted by due, overdue/today badges, deep-link to customer profile); assign/unassign follow-ups to team members (per-row select on customer profile + at creation), assignee shown on rows; dashboard inbox filter (All team / Mine / Unassigned) with assignee badge on rows + one-tap Claim to assign to yourself + edit follow-up from inbox (title, notes, due date, priority) and delete
| 42 | WhatsApp | PARTIAL | invoice share + overdue reminders (Transactions) + receipt Share + customer statement Share + catalogue share (copy-to-clipboard formatted catalogue, Products) + quote/order share (online document WhatsApp) + purchase bill/PO share + overdue payables reminder (supplier WhatsApp); add delivery challan + reminder scheduling |
| 45 | Multi-user | PARTIAL | team manage on Settings: invite by email + role (+ branch assignment multi-select) + link copy, live member list with inline role changes, pending invitations with revoke, remove member (owner/admin via server APIs: team/invite, team/list, team/update, remove, revoke-invite) + invite-link acceptance flow (sign in → auto-accept → join workspace) |
| 46 | Permissions | PARTIAL | client capability map; align with server `salesdesk_can` matrix |
| 56 | Notifications | PARTIAL | alerts centre on dashboard (subscription renews-in / non-active status + low stock/OOS + overdue recv/payables with amounts, Restock/Collect/Pay jump via named hash intents incl. #open=lowstock) + Cash focus strip (due today & overdue recv/payables); add expiry/subscription expiry + push/email delivery |
| 60 | Quick create + search | PARTIAL | global ＋ New menu (sale/product/customer/supplier/purchase/expense, deep-links & auto-opens dialogs) + global search |

## Phase 3 — Advanced
| # | Area | Notes |
|---|------|-------|
| 8 | Invoice customisation | PARTIAL | A4 itemised invoice print + 58mm thermal receipt (letterhead/address, item lines, totals, paid/balance, status); add themes, logo, bank/UPI, QR, PDF/email |
| 23 | Other income | commission/interest/rent/cashback ledger entries |
| 24 | Cash management | PARTIAL | cash position panel on Analytics: received (cash sales + collections) vs paid out (supplier payments) + net + movement ledger + End-of-day sheet (payments by mode, cash in/out, net, P&L today, outstanding) on dashboard; also on print report. Add opening balance, cash ledger with expenses by mode, deposits |
| 25 | Bank accounts | multiple accounts, opening balance, transfers, history |
| 26 | Cheques | received/issued, deposited/cleared/bounced/cancelled |
| 27 | Accounting | chart of accounts, ledger, journal entries, trial balance, P&L, balance sheet, cash flow (schema: accounts, journal_entries) |
| 30 | E-invoice | IRN/ack/QR architecture, modular gov API |
| 31 | E-way bill | modular integration, fields on bill |
| 32 | TDS/TCS | rates, invoice calc, reports |
| 33 | Profit & loss | PARTIAL | P&L panel on Analytics: revenue/COGS/gross/expenses/net for range + 6-month monthly table + on print report. Product-wise profit (revenue−COGS, negative badge) + customer-wise profit columns in sales performance suite. Today vs yesterday sales delta on dashboard KPI |
| 36 | Manufacturing | BOM, production, auto material consumption (schema: BOM primitives) |
| 37 | Bill of materials | raw→finished mapping, labour/cost capture |
| 38 | Online store | per-business catalogue, slug store link, WhatsApp order, checkout |
| 40 | Loyalty | points, earn/redeem at POS, expiry |
| 41 | Service reminders | next-service dates + reminders |
| 44 | OCR purchase scan | upload/capture→extract→review before save |
| 54 | Fixed assets | depreciation, current value, disposal |

## Phase 4 — Scale & business
| # | Area | Status | Notes |
|---|------|--------|-------|
| 43 | Email | PLAN | send invoices/reports/reminders through server adapter (exists) |
| 47 | Multiple businesses | DONE | business_members + creation RPC; add switcher UI polish |
| 48 | Audit log | PARTIAL | DB triggers everywhere + UI view on Settings (owner-only): immutable trail of products/customers/suppliers/expenses/invoices/purchases/payments with action/entity/relative-time + CSV export |
| 49 | Security | DONE | auth, RLS, storage rules, server validation; add 2FA option later |
| 50 | Backup | DONE | scripts + docs; automate scheduling |
| 51 | Import | PARTIAL | CSV import on Products/Customers/Suppliers (header mapping, preview+confirm, per-row error skip, permission-gated) + opening-stock import (existing products matched by name get stock updated, other fields preserved); add stock-count import |
| 52 | Export | PARTIAL | JSON backup + CSV per module (sales/expenses/inventory/receivables/statement/payables) + Excel (.xls) exports on Analytics + stock movements & warehouse transfer CSV exports + Tally vouchers + Print/PDF |
| 53 | Tally export | PARTIAL | Settings → Export to Tally: sales vouchers, purchase vouchers, party ledgers (Sundry Debtors/Creditors + outstanding), Tally-ready CSV |
| 55 | Financial year | PLAN | FY selection, closing, carry-forward |
| 57 | Search | PARTIAL | per-page filters + global search (products/customers/suppliers/invoices/purchases → deep-link & highlight rows) |
| 58 | Responsive UI | DONE | 320px→large, mobile card tables, installable PWA (manifest + theme color + mobile-web-app metas); continue polish |
| 59 | UI/UX premium | DONE | dark/light, Jakarta Sans, KPI cards; keep improving |
| 62 | Subscriptions | DONE | Razorpay + UPI fallback; add free trial, plan gating |
| 63 | Admin panel | PARTIAL | payment verification + platform analytics on /admin-payments (active subscriptions, MRR, pending amount, latest plan per business); plan management pending |

## Non-functional commitments
- Every tenant table carries `business_id`; RLS enforced; writes server-validated.
- SQL migrations live in `supabase/migrations/`; RPCs are the only write path for money/stock.
- All features: validation, loading/empty/error states, confirm dialogs, toasts.
- Commit strategy: batch single commit after each phase is verified green (85+ tests).