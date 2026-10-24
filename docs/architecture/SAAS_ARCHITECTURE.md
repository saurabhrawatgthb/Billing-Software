# OmniPOS — Multi-Tenant SaaS Architecture

## 1. Overview
OmniPOS is an enterprise-grade, multi-tenant restaurant management and Point of Sale (POS) SaaS platform. It powers single cafes, high-volume dine-in restaurants, and nationwide franchise chains.

## 2. Core Architectural Principles
1. **Multi-Tenancy with Hard Isolation:** Every restaurant brand is encapsulated in an `Organization`. Outlets (`Franchise`), users, menus, inventory, table sessions, invoices, and thermal receipt templates are scoped to the authenticated tenant.
2. **Subscription & Entitlement Engine:** Features (e.g. `pos.kds`, `inventory.management`, `crm.campaigns`) and resource capacities (max outlets, max seats) are dictated server-side by the organization's active `CommercialPlan`.
3. **Atomic Promotional Campaigns:** The founding-partner campaign (`FOUNDING_10`) employs atomic conditional database updates to ensure that exactly 10 restaurants can claim the 1-year free subscription, preventing race conditions.
4. **Offline Resilience with Dual Storage:** Offline billing operations persist asynchronously to browser `IndexedDB` with `localStorage` synchronization, eliminating the 5MB browser quota ceiling and preventing data loss during network interruptions.
5. **Hardware Agnostic Thermal Printing:** Supports direct ESC/POS byte-level printing, silent kiosk mode Chromium flags, and 58mm/80mm customizable receipt templates.
