# Tour operator CLI

Use npm run tours -- help. Every read accepts --json. References accept an exact code, UUID prefix or case-insensitive name. Ambiguous matches list candidates and exit 1. Unknown options and unexpected arguments fail.

## Writes

- supplier-check <supplier> --reference="Evidence" --until=YYYY-MM-DD --date=YYYY-MM-DD records a supplier registration check already performed by a person.

- add <suppliers|products|rates|bookings|allotments|services|passengers> --data=imports/record.json accepts only fields in the FIELDS allowlist in scripts/tours.mjs. Foreign references accept codes or names. Required database fields and checks are in supabase/migrations/0001_tours.sql. Create suppliers, products, rates, bookings, allotments and then services in that order.
- log <booking> --author="Actual recorder" --text="Observed event" [--date=YYYY-MM-DD] appends a note. Corrections are new notes. Notes cannot be edited or deleted.
- confirm <service> --reference="Supplier confirmation" records an existing confirmation. It does not request a reservation.
- service-status <service> --status=requested|cancelled records a known event.
- booking-status <booking> --status=quote|confirmed|completed|cancelled changes the booking. Cancelling also cancels its services atomically. It sends no supplier cancellation and computes no cancellation fees. Reopening leaves services cancelled until separately reviewed.
- terms <booking> --reference="Accepted terms record" records evidence already obtained.
- record-receipt <booking> --cents=50000 sets the externally reconciled cumulative received total and records a note. It does not increment, take money or allocate ledger entries. Repeat reconciliation cannot double count. Use the booking currency.
- release <allotment> releases only unsold capacity locally. Allocated units stay held. It does not notify the hotel.
- import tourplan --file=export.csv [--mapping=columns.json] [--date-format=DMY] [--dry-run] imports the documented Tour Summary subset. See replace-tourplan.md.
- export [--out=exports/new-backup.json] includes all nine domain record types and the original mapped import payloads. Files are exclusive-create.
- draft-weekly creates a local Markdown review from attention, margin-watch and compliance. Nothing sends.

Amounts ending in _cents are whole minor units. A service buy_cents is per unit in the rate currency; sell_cents is per unit in booking currency. fx means booking currency units per one supplier currency unit. Same-currency fx must be 1. Service costs are fixed snapshots, not live market rates. Rates and service dates must match. Tax and commissions are not calculated in service costing. Imported summary commission remains separate. Allotment units and service units must represent the same unit, such as rooms.

Use only controlled local files for imports. Imported customer data never belongs in Git. Local mode is single-process. Schema tours has RLS enabled without public policies, and views respect the caller's permissions. Provision staff roles and policies for a shared production deployment.
