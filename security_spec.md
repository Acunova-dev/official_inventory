# Security Spec for Acu-invent Inventory Manager

## Data Invariants
1. All business inventory resources (Products, Categories, Suppliers, Customers, Stock Movements, Quotations, Receipts, System Logs, Settings) reside within `/businesses/{businessId}/...` collection hierarchy.
2. A user can read/write resources under `/businesses/{businessId}/` ONLY IF `request.auth.uid != null` AND the user's profile at `/users/{request.auth.uid}` has `businessId == businessId`.
3. Self-registration creates a user profile at `/users/{request.auth.uid}` and a default business at `/businesses/{businessId}`.
4. User role transitions and business changes are protected.

## The Dirty Dozen Payloads (Target Security Vulnerabilities Tested)
1. Unauthorized Cross-Tenant Read on `/businesses/biz-other/products/p1`
2. Unauthorized Cross-Tenant Write on `/businesses/biz-other/products/p1`
3. Unauthenticated User Read/Write Attempt on `/businesses/biz-1/products/p1`
4. Invalid/Poisoned Document ID injection (`/businesses/biz-1/products/???invalid$$$`)
5. Overly Long Product String injection (Name length > 200 chars)
6. Negative Stock Amount injection on stock movements
7. Shadow Field injection on product update (`isAdminOverride: true`)
8. Unverified Email write bypass attempt
9. Modification of immutable creation timestamp `createdAt`
10. Impersonating another user ID in `userId` field
11. Modifying system logs from another business
12. Attempting to bypass owner checks on user profile `/users/uid-target`
