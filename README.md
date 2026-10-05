# Tour Operator for Claude Code

Supplier rates, allotments, quotes, departures and travel documents in a database you own. MIT licensed code from Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free code. Install and operate it. Hosting and agent costs remain yours. | Your fields, operating rules, screens, connections and Tourplan data mapping. [Discuss your version](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=tourplan&utm_medium=github). | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [See the offer](https://enterprisedna.co/omni/instead-of/tourplan?utm_source=github&utm_medium=readme&utm_campaign=tourplan). |

## Quick start

```bash
git clone https://github.com/Enterprise-DNA-OS/tour-operator-for-claude-code.git
cd tour-operator-for-claude-code
npm install
npm run demo
npm test
npm run tours -- departures
npm run view
npm run docs
```

Node 20 or newer. The demo uses PGlite locally and fictional NZ tour records, including overdue confirmations, expired quotes, unsold hotel rooms and missing evidence. The seed is idempotent. Never seed a live operator database. Start with /departures, /supplier-chase and /release-dates.

For PostgreSQL 15 or newer, set DATABASE_URL through your environment and run npm run migrate. The tours schema has row security enabled without public access policies. Views respect caller permissions. The database owner connection is for controlled operator use. Shared deployment requires staff identity, permissions, encrypted backups, monitoring and business validation. Local PGlite supports one process at a time.

## What this base does

Nine record types cover suppliers, products, dated rates, bookings, allotments, services, passengers, append-only notes and import provenance. Four database views join these records for service detail, margins, room release and evidence checks. Services reject out-of-range dates and allotment overbooking. Every cost uses a recorded exchange rate. No cross-currency totals are added together.

Twenty read commands cover the booking register, upcoming departures, quote follow-up, supplier chasing, release dates, margins, deposit balances, cancellation deadlines and passenger counts. Four document families produce draft itineraries, rooming lists, booking costings and confirmed-service vouchers in your brand. Reports are read-only files, not a reservation front end.

This is an operations base, not a reproduction of every Tourplan module. It has no live supplier availability, distribution API, accounting ledger, payment processing or offline/mobile booking interface. Those integrations and screens need separate implementation and validation. Imported Tour Summary financial amounts are retained snapshots, not posted accounting transactions.

Tourplan's own [pricing FAQ](https://www.tourplan.com/resources/frequently-asked-questions/) lists cloud subscriptions starting at US$1,000 per month, with price determined by edition and concurrent users, checked 5 October 2026. Twelve months at that starting rate is US$12,000. The free code has no licence fee. Running and supporting it still costs money.

## Weekly operator jobs

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

## Ten questions across your records

These questions are implemented in this base. Tourplan offers custom reporting, so this is not a claim that it cannot produce equivalent reports. Here you can change the questions and the records together.

1. Which departures have unconfirmed services and less than twenty percent margin? (`unconfirmed-low-margin`)
2. Which hotel blocks still have unsold rooms at their release date? (`release-dates`)
3. Which confirmed groups have fewer named travellers than expected? (`manifest-gaps`)
4. Which agent produces the recorded margin in each currency? (`agent-margin`)
5. Which supplier holds the largest confirmed commitments in its own currency? (`supplier-exposure`)
6. Which departures have unpaid deposits approaching their due date? (`deposits-due`)
7. Which requested services are near a cancellation deadline? (`supplier-chase`)
8. Which quotes are expired and have gone quiet? (`quote-followup`)
9. Which adventure supplier records lack registration evidence for the trip date? (`compliance`)
10. How do imported booking totals compare with the services now recorded? (`imported-summaries and margin-watch`)

## Your first hour: ten things to ask for

1. Put our name and logo on the itinerary.
2. Add our supplier contract reference.
3. Use our booking stages.
4. Load a checked sample of our Tour Summary export.
5. Set our deposit review window.
6. Add our hotel release wording.
7. Group departure reports by consultant.
8. Add our passenger room labels.
9. Record our supplier evidence policy.
10. Draft Monday's supplier follow-up list.

/customise writes and applies a migration. /new-view adds a report. Read [the CLI guide](docs/cli.md), [switch guide](docs/replace-tourplan.md), [record checks](docs/compliance.md) and [why there is no front end](docs/why-no-front-end.md).

## Bring your booking history

```bash
npm run tours -- import tourplan --file=examples/tourplan-summary.csv --dry-run
npm run tours -- import tourplan --file=examples/tourplan-summary.csv
npm run tours -- imported-summaries
```

The fixture is illustrative, not a customer export. The supported report imports booking headers and financial snapshots only. Supplier contracts, services, allotments and passenger manifests need separate exports and mapping. Dry runs roll back. Repeated identical records skip. Changed records stop the entire import for reconciliation.

## Validation

npm test uses a temporary database and clears inherited DATABASE_URL so it cannot seed live data. It exercises all reads and writes, negative cases, capacity, currency conversion, transactional import, duplicate detection, drafts and record security. TEST_DATABASE_URL may point to an empty disposable PostgreSQL database for parity checks. The suite uses Node APIs and works without platform-specific shell commands. Windows and Linux jobs are included in .github/workflows/ci.yml.

Generated documents, reports, private imports and exports are ignored by Git. All drafts remain local until a person approves and sends them through their own system.

Built by Enterprise DNA. Tourplan is a third-party trademark. This independent project is not affiliated with Tourplan.
