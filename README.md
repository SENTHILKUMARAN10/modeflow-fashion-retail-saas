# SalesDesk

SalesDesk is a cloud-based business management SaaS for small and medium businesses. It brings sales, inventory, customers, expenses, suppliers, staff, reports, recurring work and business insights into one workspace.

This repository contains the production application, Supabase migrations, protected API services, deployment configuration and automated verification workflows.

## Release discipline

Customer releases are prepared on `salesdesk-production-v1`, validated against staging, and promoted to `main` only after production-readiness gates pass.
