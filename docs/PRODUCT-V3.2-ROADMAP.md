# Salesventory — Product Roadmap v3.2

One platform to run an entire business: billing, inventory, accounting, POS, GST, CRM,
reporting and operations for SMBs. This document tracks every requirement and its build status.

Status legend: `DONE` (shipped) · `PARTIAL` (working subset) · `BUILD` (in progress) · `PLAN` (next to implement)

## Phase 1 — Core (currently building)
| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Main dashboard | DONE | Date filters (today/yesterday/7d/30d/month/lastmonth/year/custom), range KPIs (sales/purchases/expenses/net/gross/margin), balance KPIs (receivables/payables/stock value), today/best/top customer/pending/P&L, sales+expense trends |
| 2 | Customers | PARTIAL | Directory done: add/edit/archive from DB, full fields (phone/email/company/address/tags/notes), merged purchase stats, status pill, tag-group & active/archived filter chips. Remaining: credit limit, email adapters |
| 3 | Suppliers | PARTIAL | CRUD + purchases + payments + payables + ledger/statement (date-filtered) + copy/CSV/print done. Remaining: POs, returns, debit notes |
| 4 | Products / services | PARTIAL | name/cost/price/stock/reorder/service/category/sku/barcode/unit done. Add brand, HSN, GST rate, MRP, variants, images, batches, import/export |
| 5 | Inventory | PARTIAL | stock via RPCs + suppliers/purchases receive. Add warehouses, stock movements, adjustments, transfers, valuation, audit/count, expiry alerts |
| 7 | Sales billing | PARTIAL | multi-item checkout (complete_multi_item_sale) + single-item; statuses paid/partial/unpaid + overdue (due-date-aware), history filter, full item-line invoice print. Remaining: persist due date/notes on client sales (RPC change), GST, PO#, transport |
| 14 | Purchases | PARTIAL | PO→bill flow done: “Receive stock & bill now” at creation or keep open PO; printable bill/PO document, notes, BILL/PO tags, due date + overdue/status. Add GST, freight, supplier invoice #, batch/expiry capture |
| 16 | Payments In | PARTIAL | customer receipts against invoices (amount/method/ref, auto outstanding → paid/partial) + Receipts list on Transactions with total + printable receipt per payment. Add advance, USD |
| 17 | Payments Out | PARTIAL | Purchase payments exist; generalise to supplier payment out with ledger effect |
| 18 | Payment modes | PARTIAL | cash/bank/upi/card/cheque/wallet/custom selectable on sale + purchase + receipt flows; add cheques lifecycle |
| 19 | Receivables | PARTIAL | ageing 0-30/31-60/61-90/90+ on Analytics with due-today/overdue chips + payments in. Add advance, credit note application |
| 20 | Payables | PARTIAL | ageing 0-30/31-60/61-90/90+ on Analytics with due-today/overdue chips + payment out + supplier payables reconciliation (bills/billed/paid/outstanding/overdue/status, CSV, total outstanding); overdue surfaced on dashboard alerts |
| 22 | Expenses | PARTIAL | category/vendor/amount/mode/date/notes + category filter chips (per-cat totals) + Analytics spend-by-category (share, CSV) + category presets. Add receipt image, GST, recurring, vendor field |
| 34 | Reporting | PARTIAL | avg order, inventory value, product perf, payment mix, ageing + Sales performance suite (range KPIs: revenue/orders/units/gross profit/customers, top product/customer, sales by product/category/customer) + P&L + CSV + Print/PDF. Add full sales/purchase/financial suite with filters |
| 61 | Business settings | DONE | profile, phone, address, currency, invoice prefix (owner-gated, DB-backed); GSTIN/PAN/taxes arrive with GST module |
| 68 | Tenant isolation | DONE | RLS + verify scripts; every table carries business_id |

## Phase 2 — Business operations
| # | Area | Status | Notes |
|---|------|--------|-------|
| 9 | POS billing | PARTIAL | fast checkout, hold/resume (up to 5 carts, local), cash received → change/shortfall calculator, live preview; add split payments, cashier login, shift open/close, reprint |
| 6 | Barcode | PARTIAL | USB-scanner capture (global key buffer): add to cart on billing, filter on Products; labels/bulk print & stock-count mode remain |
| 10 | Estimates / quotations | PLAN | quote→order→challan→invoice conversion (RPCs exist: convert_quote_to_order) |
| 11 | Sales orders | PLAN | create/fulfil/cancel, convert to invoice/challan |
| 12 | Delivery challan | PLAN | items, driver/vehicle, signature, print/WhatsApp |
| 13 | Sales returns | PLAN | select invoice/items, credit note, stock & balance update (schema: sales_returns) |
| 15 | Purchase returns | PLAN | debit note, supplier refund, stock adjust |
| 21 | Payment reminders | PARTIAL | due-date aware: Remind on overdue + due-soon (≤3 days) invoices with tailored messages, Due-soon filter on Transactions |
| 28 | GST | PLAN | CGST/SGST/IGST/cess, HSN/SAC, inclusive/exclusive, place of supply, reverse charge |
| 29 | GST reports | PLAN | GSTR-1/3B summaries, HSN summary, input/output tax |
| 35 | Warehouses | PLAN | creation, warehouse stock, transfers, reports (schema: warehouses, inventory_transfers) |
| 39 | CRM | PLAN | leads, follow-ups (schema: customer_followups), tasks, customer value |
| 42 | WhatsApp | PARTIAL | invoice share + overdue reminders (Transactions) + receipt Share + customer statement Share; extend to catalogue |
| 45 | Multi-user | PLAN | invite members (schema: team_invitations), roles, acceptance flow |
| 46 | Permissions | PARTIAL | client capability map; align with server `salesdesk_can` matrix |
| 56 | Notifications | PARTIAL | alerts centre on dashboard (low stock/OOS + overdue recv/payables with amounts) + Cash focus strip (due today & overdue recv/payables); add expiry/subscription expiry + push/email delivery |
| 60 | Quick create + search | PARTIAL | global ＋ New menu (sale/product/customer/supplier/purchase/expense, deep-links & auto-opens dialogs) + global search |

## Phase 3 — Advanced
| # | Area | Notes |
|---|------|-------|
| 8 | Invoice customisation | PARTIAL | A4 itemised invoice print + 58mm thermal receipt (letterhead/address, item lines, totals, paid/balance, status); add themes, logo, bank/UPI, QR, PDF/email |
| 23 | Other income | commission/interest/rent/cashback ledger entries |
| 24 | Cash management | PARTIAL | cash position panel on Analytics: received (cash sales + collections) vs paid out (supplier payments) + net + movement ledger; also on print report. Add opening balance, cash ledger with expenses by mode, deposits |
| 25 | Bank accounts | multiple accounts, opening balance, transfers, history |
| 26 | Cheques | received/issued, deposited/cleared/bounced/cancelled |
| 27 | Accounting | chart of accounts, ledger, journal entries, trial balance, P&L, balance sheet, cash flow (schema: accounts, journal_entries) |
| 30 | E-invoice | IRN/ack/QR architecture, modular gov API |
| 31 | E-way bill | modular integration, fields on bill |
| 32 | TDS/TCS | rates, invoice calc, reports |
| 33 | Profit & loss | PARTIAL | P&L panel on Analytics: revenue/COGS/gross/expenses/net for range + 6-month monthly table + on print report. Add product/customer-wise profit |
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
| 48 | Audit log | PARTIAL | DB triggers exist; add admin/UI view |
| 49 | Security | DONE | auth, RLS, storage rules, server validation; add 2FA option later |
| 50 | Backup | DONE | scripts + docs; automate scheduling |
| 51 | Import | PARTIAL | CSV import on Products/Customers/Suppliers (header mapping, preview+confirm, per-row error skip, permission-gated); add opening-stock import |
| 52 | Export | PARTIAL | JSON backup + CSV per module (sales/expenses/inventory/receivables/statement/payables) + Tally vouchers + Print/PDF; add Excel export |
| 53 | Tally export | PARTIAL | Settings → Export to Tally: sales vouchers, purchase vouchers, party ledgers (Sundry Debtors/Creditors + outstanding), Tally-ready CSV |
| 55 | Financial year | PLAN | FY selection, closing, carry-forward |
| 57 | Search | PARTIAL | per-page filters + global search (products/customers/suppliers/invoices/purchases → deep-link & highlight rows) |
| 58 | Responsive UI | DONE | 320px→large, mobile card tables; continue polish |
| 59 | UI/UX premium | DONE | dark/light, Jakarta Sans, KPI cards; keep improving |
| 62 | Subscriptions | DONE | Razorpay + UPI fallback; add free trial, plan gating |
| 63 | Admin panel | PARTIAL | payment verification; add main analytics + plan management |

## Non-functional commitments
- Every tenant table carries `business_id`; RLS enforced; writes server-validated.
- SQL migrations live in `supabase/migrations/`; RPCs are the only write path for money/stock.
- All features: validation, loading/empty/error states, confirm dialogs, toasts.
- Commit strategy: batch single commit after each phase is verified green (85+ tests).