### 0.6.0

Charges, for sales and purchase orders. No new permissions.

- A **Charges** card under the order header shows the header and line charges: those on the order, and those billed on its posted invoices, each marked **Invoiced** with its invoice number. Its summary line has the totals per currency.
- Each line with charges shows a badge, for example "+2 charges · $45.00", and its charges in the line details.
- A percentage or per-unit charge that D365 calculates only at invoicing shows as "not calculated yet", never as 0.
- New check **Charges not invoiced** (info, sales orders): the order is fully invoiced, but a charge on the order is on none of its invoices. It can be switched off in settings.
- Charges need the D365 table ids of a few tables, which differ per environment. They're found automatically the first time and remembered per environment. If D365 doesn't allow that, enter them under settings (⚙) → **Charges: table ids**, and use **Test** to check them. Until then the card says "not configured", never "no charges".

Also since 0.5.1:

- The panel follows sales orders when "All sales orders" opens as the sales order grid (in some environments).
- The page is watched only while the panel is open.
- When D365 refuses a query, the panel shows D365's own error text, and the debug view shows the request that failed.

### 0.5.1

- First published version.
