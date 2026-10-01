## What it does

Supply Chain X-ray (formerly Order X-ray) shows the full lifecycle of a sales, purchase, production, batch, transfer or return order in one side panel next to D365, and tells you why it is stuck. It also traces a batch or serial number through the orders it passed.

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

**Production and batch orders**

- The header, with the status timeline from Created to Ended and what the order is made for.
- Materials (BOM or formula lines): reserved, picked and consumed per line, with the stock on hand when a component is short.
- Operations with their resources, hours, and good and error quantities.
- Outputs, with co- and by-products and their put-away.
- Estimated vs. realized cost per cost group.
- Unposted journals, raw material picking work and quality orders.
- The order compared with its BOM or formula ("As designed").
- 16 "why stuck?" checks, such as material shortage, released but not started, and an operation behind schedule.
- Links from a sales line to its production order, from a production order to its sales order, and from a component to its sub-order; **Back** returns.

**Transfer orders**

- The route from the shipping warehouse through transit to the receiving warehouse, per line.
- Warehouse work and loads on both sides.
- 12 "why stuck?" checks, such as not shipped on time, in transit too long, and received but not put away.

**Return orders (RMA)**

- The return order or RMA number: the panel finds it by either.
- Each line with its disposition code and the sales line it came back from.
- Arrival journals, return work, packing slips, credit notes and the replacement order.
- 8 "why stuck?" checks, such as arrived without a disposition code, arrived but the packing slip isn't posted, and received but not credited.

**Batch / serial trace (recall)**

- Where a batch came from and where it went: purchase, production (by lot or by order), transfers, sales and returns.
- A summary, the stock on hand now, and the affected customers as a CSV file.

**In every X-ray**

- A **Trace** card with the linked orders (including returns against a sales order, and intercompany orders in another company) and the order's batches; a batch opens its trace.
- Quality orders, and a stock line that names stock blocked by an inventory status, a batch disposition code, or an expired batch.

**Charges** (sales and purchase orders)

- Header and line charges, on the order and on its posted invoices, with the totals per currency.
- A badge per line with charges, and the charges in the line details.
- A check for charges on a fully invoiced sales order that are on none of its invoices.
- An estimate for percentage and per-unit charges that D365 only calculates at invoicing.

## Using it

1. Open D365 and click the Supply Chain X-ray icon in the toolbar, or press **Alt+Shift+O**. The side panel opens, with the company taken from the page address.
2. Open or select a sales, purchase, production, batch, transfer or return order in D365: the panel follows it. Use the switch above the search box (Sales, Purchase, Production, Transfer, Return, Batch) to search another type.
3. You can also type an order number and press Enter, or click an order number anywhere in D365 and press **Alt+Shift+L**. The panel doesn't need to be on the right type: a number it doesn't find is looked up as every other order type, as a quality order (which opens its order) and as a batch number (which opens the trace, with the item found from the batch).

The checks and their thresholds are on the settings page (⚙ → *All settings…*), with the batch disposition codes that block reservation, whether expired batches count as unavailable, and **Show Debug** (off by default) for every request and check result. Charges need a few D365 table ids, which the panel finds and remembers per environment; if D365 doesn't allow that, enter them under settings. IDs are copied with a click, and **Copy summary** on the order header copies a short text summary of the order for an e-mail or chat. You can change the keyboard shortcuts at `edge://extensions/shortcuts`.

The first query after D365 has been idle can take 20 to 30 seconds while D365 warms up. The panel starts this warm-up as soon as it opens.

## Supported environments

Microsoft-hosted F&O environments on `*.operations.dynamics.com` and `*.operations.eu.dynamics.com`, and cloud-hosted development machines on `*.cloudax.dynamics.com`. Requires Edge or Chrome 116 or later.

## Privacy

- **Read-only.** All network access goes through one function that refuses anything other than a `GET`, and any address other than the D365 page's own `/data/` endpoint.
- **No data leaves the browser.** Queries run in the D365 page with your own session and security roles. There is no server, no analytics and no remote code.
- Order data is kept in memory for at most 60 seconds per tab and is never stored.
