## What it does

Hold **Alt** and hover over an item number field anywhere in Dynamics 365 Finance & Operations. A tooltip shows the stock per warehouse and the product details you care about, without leaving the page you're working on.

It works on sales order lines, formula and BOM lines, loads, released products, product variants and any other page with an item number field.

| Part | Content |
|---|---|
| Header | Item number and product name |
| Product details | Fields from the released product that you choose, such as item model group, tracking dimension group, coverage group or your own extension fields. New installs start with 20 standard fields |
| Stock | One row per warehouse with Physical, Available, Reserved, Ordered and On order. You choose which columns show and in what order |
| Dimensions | Config, Color, Size, Style and Version columns, but only when the item actually uses them |
| Company | A Company column when cross-company mode shows stock from several legal entities |

## Using it

1. Open D365 and hold **Alt** while you hover over an item number, or over the caption of an item number field.
2. A "Retrieving inventory..." tooltip appears straight away and is replaced by the result a moment later.
3. Move onto the tooltip to keep it open. It closes when you leave both the item and the tooltip.

Only item number fields trigger a lookup. An order number, batch number or item group never does, even when its value looks like an item number.

**The toolbar popup** has the day-to-day controls: refresh the inventory data, switch cross-company mode on or off, open the settings, and see the last 10 requests with the exact OData request and response.

**The settings page** decides what the tooltip shows: the quantity columns and their order, the product fields (search the environment's own field list, reorder, relabel), a one- or two-column layout, and a JSON export to share your setup with a colleague.

## Supported environments

Every Microsoft-hosted F&O environment works out of the box: production and sandbox in every region (`*.operations.dynamics.com`, `*.operations.eu.dynamics.com` and the other regions, US Government clouds), plus cloud-hosted development machines (`*.cloudax.dynamics.com`, `*.axcloud.dynamics.com`) and OneBox.

An environment on another address, for example behind a Microsoft Defender for Cloud Apps proxy (`.mcas.ms`), is enabled from the popup with **Enable on this site**. The browser asks permission for that one site only.

## Privacy

- Requests go **only to the D365 environment in your current tab**, with the session you are already signed in with, so your D365 security roles apply exactly as in the UI.
- Every request is a read-only `GET`. There is no server, no analytics, no telemetry and no remotely loaded code.
- A content security policy blocks the popup, settings page and background worker from making any network request at all.
- Settings, a five-minute lookup cache and the query log stay in your browser profile.
