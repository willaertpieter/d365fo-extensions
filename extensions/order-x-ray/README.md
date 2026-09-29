## What it does

Order X-ray shows the full lifecycle of a sales or purchase order in one side panel next to D365, and tells you why it is stuck.

**Sales orders**

- The header with holds, credit and confirmation.
- A stage timeline from ordered to paid.
- Every line, with a drilldown.
- The documents, with their payment status.
- The customer card.
- 17 "why stuck?" checks.

**Purchase orders**

- Approval and vendor responses.
- The stages from ordered, approved, confirmed, arrived and received to invoiced and paid, net of returns.
- Product receipts, invoices with payment status, and pending invoices.
- The vendor card.
- 9 "why stuck?" checks.

**Charges** (sales and purchase orders)

- Header and line charges, on the order and on its posted invoices, with the totals per currency.
- A badge per line with charges, and the charges in the line details.
- A check for charges on a fully invoiced sales order that are on none of its invoices.
- An estimate for percentage and per-unit charges that D365 only calculates at invoicing.

## Using it

1. Open D365 and click the Order X-ray icon in the toolbar, or press **Alt+Shift+O**. The side panel opens, with the company taken from the page address.
2. Open or select a sales or purchase order in D365: the panel follows it. Use the switch above the search box to change between sales and purchase orders.
3. You can also type an order number and press Enter, or click an order number anywhere in D365 and press **Alt+Shift+L**.

The thresholds for the checks can be set per order type under settings (⚙). Charges need a few D365 table ids, which the panel finds and remembers per environment; if D365 doesn't allow that, enter them under settings. IDs are copied with a click, and **Copy summary** on the order header copies a short text summary of the order for an e-mail or chat. You can change the keyboard shortcuts at `edge://extensions/shortcuts`.

The first query after D365 has been idle can take 20 to 30 seconds while D365 warms up. The panel starts this warm-up as soon as it opens.

## Supported environments

Microsoft-hosted F&O environments on `*.operations.dynamics.com` and `*.operations.eu.dynamics.com`, and cloud-hosted development machines on `*.cloudax.dynamics.com`. Requires Edge or Chrome 116 or later.

## Privacy

- **Read-only.** All network access goes through one function that refuses anything other than a `GET`, and any address other than the D365 page's own `/data/` endpoint.
- **No data leaves the browser.** Queries run in the D365 page with your own session and security roles. There is no server, no analytics and no remote code.
- Order data is kept in memory for at most 60 seconds per tab and is never stored.
