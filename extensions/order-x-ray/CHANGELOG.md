### 0.7.0

A shorter panel, and settings on their own page. No new permissions.

- **Less scrolling.** Charges, Progress, Documents and the customer or vendor fold to a one-line summary, and the panel remembers which ones you opened. The lines now start on the first screen.
- **Progress** is a compact strip; open it for the full table.
- **The search** folds to one line once an order is shown; click *Change* to search again.
- **Lines:** show all, only the ones not complete, or only the ones with an issue. Lines named in an issue are marked, and clicking a line in an issue's evidence jumps to it.
- **Settings** have their own page (⚙ → *All settings…*), with each check next to its threshold, and a *Check for updates* link. The ⚙ menu keeps *Follow D365* and the charge table-id test.

### 0.6.3

No new permissions.

- Charges per a specific unit (for example per m² or per kg) now show that unit, like D365: "0.50 per m²".
- Such a charge that D365 hasn't calculated yet gets an estimate when its unit is the order line's own unit. Otherwise no estimate is guessed, because it would need D365's unit conversion.

### 0.6.2

- Check **Not reserved, stock available**: the next step now just says "Reserve the lines".

### 0.6.1

No new permissions.

- **Estimated charges.** A percentage or per-unit charge that D365 only calculates at invoicing now shows what it will likely be, for example "≈ -$157.34 estimate". It's based on the charge's own percentage and the order's current lines, and hovering it shows how it was worked out. Estimates are never mixed with real amounts.
- **Copy summary.** A button on the order header copies a short text summary of the order, ready to paste into an e-mail or chat. It includes the status, where the order stands, the "why stuck?" issues with next steps, charges and invoices.

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
