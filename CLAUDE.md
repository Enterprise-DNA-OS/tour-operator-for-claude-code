# Tour Operator for Claude Code

For an NZ inbound tour operator or destination management company reviewing supplier commitments, group departures and booking margins. Configure the business, operators and policies before live use.

Every answer starts with a current CLI read. Run npm run tours -- help. Read docs/cli.md before writing. Names are case insensitive. Ambiguity lists candidates and exits 1. AGENTS.md routes Codex, OpenCode and Cursor here.

| Recipe | Job |
|---|---|
| /supplier-check | Record a verified supplier registration reference, expiry and check date. |
| /suppliers | Review supplier contacts and recorded registration dates. |
| /products | Read the supplier product list by location. |
| /rates | Review contracted dates, units, costs and cancellation terms. |
| /bookings | Read the booking register. |
| /departures | Review confirmed departures in the next thirty days. |
| /services | Read the itinerary services and confirmations. |
| /supplier-chase | Find requested services and the supplier who must confirm them. |
| /release-dates | Review held allotments approaching release and the unsold units. |
| /margin-watch | Compare service costs and selling amounts by booking currency. Zero services means missing cost detail. |
| /quote-followup | Review quote expiry and days since last contact. |
| /deposits-due | Review deposits due after externally reconciled receipts. |
| /cancellation-watch | Review contractual cancellation deadlines in the next seven days. |
| /rooming-list | Read recorded passenger names and room assignments. |
| /manifest-gaps | Compare named passengers with expected group sizes. |
| /supplier-exposure | Group confirmed commitments by supplier and supplier currency. |
| /agent-margin | Compare current service margins by agent and currency. |
| /unconfirmed-low-margin | Find confirmed departures with thin margins and unconfirmed services. |
| /imported-summaries | Read financial snapshots from the Tourplan export separately from current service costing. |
| /compliance | Read docs/compliance.md, then identify missing evidence. Do not call a clear list legal approval. |
| /attention | Collect overdue confirmations, releases, deposits and quotes. |
| /booking | Run `npm run tours -- booking "<code, name or UUID prefix>"`. Read the booking, services, passengers and notes before drafting. If ambiguous, show the candidates and resolve the reference. |
| /add | Read docs/cli.md and the migration. Put supplied fields in a private JSON file, then run `npm run tours -- add <type> --data=imports/record.json`. Read the result back. Never infer supplier terms or exchange rates. |
| /log | Read the booking first. Run `npm run tours -- log <booking> --author="<recorder>" --text="<observed event>"`. Notes are append-only. Corrections are new notes naming the earlier entry. |
| /confirm | Read the service and actual supplier evidence. Run `npm run tours -- confirm <service> --reference="<confirmation reference>"`. Recording evidence sends no booking request. |
| /service-status | Read the service. Record a supplied event with `npm run tours -- service-status <service> --status=requested or cancelled`. No cancellation notice is sent. |
| /booking-status | Read the booking and all services. Run `npm run tours -- booking-status <booking> --status=quote or confirmed or completed or cancelled`. Cancellation changes local services too. Supplier cancellation and fees need separate review. |
| /terms | Read the booking and accepted terms evidence. Run `npm run tours -- terms <booking> --reference="<evidence>"`. Never treat a draft as acceptance. |
| /record-receipt | Reconcile against the external account first. Run `npm run tours -- record-receipt <booking> --cents=<cumulative_received_total>`. This sets a cumulative total and writes a note. It does not take payment. |
| /release | Read release-dates and the allotment. Run `npm run tours -- release <allotment>`. Only unsold units are removed from local capacity. Tell the operator the hotel has not been notified. |
| /import | Read docs/replace-tourplan.md. Export the documented Tour Summary CSV with booking currency and costs. Run `npm run tours -- import tourplan --file=imports/tour-summary.csv --dry-run`, reconcile the fields, then repeat without --dry-run. Do not promise services or passenger names from a summary. |
| /export | Create a private exports directory. Run `npm run tours -- export --out=exports/new-backup.json`. Verify all nine record types. Keep a database backup too. Never publish customer records. |
| /weekly-review | Run `npm run tours -- attention`, `npm run tours -- margin-watch` and `npm run tours -- compliance`. Name the departures, deadlines, currencies and missing evidence. Read booking details for exceptions. Save with draft-weekly. |
| /draft-weekly | Run `npm run tours -- draft-weekly`. Inspect the Markdown in drafts/. It uses current attention, margin-watch and compliance results. Nothing sends. |
| /documents | Set brand.json to the business identity. Run `npm run docs` and inspect the itinerary, rooming list, costing and voucher drafts. A requested service cannot become a confirmed voucher. Nothing sends. |
| /new-view | Read views.json and the existing database views. Add a fixed read-only query for the requested report, then run `npm run view` and `npm test`. Inspect the HTML. Keep customer data local. |
| /customise | Read the schema and export a backup first. Write a new numbered migration for the requested field, stage or rule. Apply with `npm run migrate`. Update the CLI allowlist, query, document and recipe as needed. Run `npm test` and demonstrate the changed workflow. Never edit an applied migration or invent records. |

## Rules

- Never invent a supplier confirmation, contract rate, passenger, registration, receipt or exchange rate.
- Everything is local. Never send, charge, reserve with a supplier or cancel externally. Communications and documents are drafts.
- Monetary amounts stay grouped by currency. Supplier buys and booking sells can use different currencies. fx is an explicitly recorded conversion rate.
- Imported summary amounts remain separate from service costing and the operational deposit tally. A missing itinerary is not a zero-cost trip.
- Compliance means evidence checks, not a safety audit or legal approval. Read docs/compliance.md.
- Keep passenger data and exports private. Do not store passport scans or medical details.
- Staff authentication, permissions, encrypted backups and deployment validation are required for shared operation.
- New fields and policies go through numbered migrations and npm test. Never edit an applied migration.

Schema: supabase/migrations. CLI: scripts/tours.mjs. Rendering: brand.json, views.json and documents.json. Omni by Enterprise DNA customises and operates the system.
