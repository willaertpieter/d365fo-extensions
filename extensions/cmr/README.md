## What it does

Print CMR consignment notes straight from your Dynamics 365 Finance & Operations loads.

Open an outbound load in D365 and click **Create CMR**. The extension reads the load, its sales or transfer orders, the delivery address, the carrier and the weights, and fills in an IRU-model CMR: 24 boxes, four coloured copies, A4. Check it on screen, change what you need, and print.

- Fills boxes 1 to 24 from D365: sender, consignee, place of delivery, goods rows, gross weight, volume, carrier and license plates.
- Prints the form's own text in up to four languages: Dutch, French, German, English, Spanish, Italian, Polish, Portuguese, Czech, Slovak, Hungarian and Romanian. The first CMR takes the languages of your company's country, and you can change them per shipment.
- Counts pallets from the warehouse work, and can group load lines into fewer rows.
- Words the packing in box 8 from D365's unit descriptions, and writes dates and decimals the way your main language does.
- Makes one CMR per delivery address when a load goes to several addresses.
- Keeps a draft of every CMR you edit, and a register of every CMR you print, with a CSV export. Any printed CMR opens again exactly as it printed.
- Saves a PDF of each printed CMR in Downloads or a folder you choose, including a SharePoint library synced by OneDrive.
- Creates sender and carrier profiles from D365, and shares the setup with colleagues through a settings file or a browser policy.

## Setting up

Done once, usually by a key user in logistics or IT:

1. Open D365, go to **Warehouse management > Loads > All loads**, select a load and click **Create CMR**. The first time, the extension asks whether to add this D365 site. Say yes: the company in the address becomes the default company.
2. Let the **environment check** run. It confirms that every entity and field the extension uses exists in your environment, and takes a few seconds.
3. Check the **sender profile** (box 1), **carrier profiles** (box 16) and **packing wording** (box 8) in the settings.
4. Optionally export the settings to a file, so colleagues can import the same setup.

## Daily use

- **From D365:** select one or more loads under **Warehouse management > Loads > All loads** and click **Create CMR** (or **Create CMRs**) in the action pane.
- **From the toolbar popup:** type one or more load IDs, or pick a date (and optionally a warehouse) to open every outbound load shipping that day.
- Every box can be edited on the page. A coloured bar shows where each value came from, and on-screen notes point out values worth checking. Notes are never printed.
- **Print** (or Ctrl+P) gives each CMR a number, adds it to the CMR register and opens the print dialog.

## Requirements

- Edge or Chrome, version 120 or later.
- Read access in D365 to loads, sales orders and transfer orders in your company.
- A D365 tab that is open and signed in whenever you make a CMR. The extension tells you when there is none.

No app registration, service account or password is needed.

## Privacy

- It reads D365 through the browser session you are already signed in with, so you only see what you may see in D365.
- It never writes to D365.
- Nothing leaves your browser. There is no server, no tracking and no analytics.
