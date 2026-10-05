# Move a Tourplan booking summary

Tourplan documents Home > Reports > Operations Reports > Tour Summary and Download CSV in its [Tour Summary manual](https://usermanuals.tourplan.com/V2_5/Content/NX%20Reports/B-Operations%20Reports/B-TourSummary.htm). Its [version 1.6 release notes](https://www.tourplan.com/wp-content/uploads/2023/02/Version-1.6-highlights.pdf) also confirm CSV reporting. Checked 5 October 2026.

Choose all required booking statuses and a checked date range. Use booking currency, show costs and keep the tax basis consistent. Do not enable Show Sell as Cost. Record these report settings with the export. Save the raw file privately before changing any headings. The illustrative fixture uses documented field names, not an actual customer export. Tourplan installations can have different captions and status codes.

```bash
npm run tours -- import tourplan --file=examples/tourplan-summary.csv --dry-run
npm run tours -- import tourplan --file=examples/tourplan-summary.csv
npm run tours -- imported-summaries
```

This is one command for the supported booking summary report, not a whole-system migration. It brings reference, booking name, agent, consultant, departure date, passenger count, currency, source status, cost, agent amount, commission, invoiced and receipted snapshots. It keeps these amounts separate from service costing and operational deposit receipts. It does not infer a deposit due date or a service from a total.

Headings are matched case insensitively. Reference accepts Booking Reference, Booking Ref and (Booking) Reference. Agent is a code, while Agent (Amount) is a financial amount. All financial columns are required, including explicit zeros. Amounts accept decimal points and optional thousands commas. Negative amounts, credits and decimal commas need separate reviewed mapping. Summary and subtotal rows must be excluded. ISO dates work directly. For day/month/year exports add --date-format=DMY. Other formats fail instead of guessing.

If a caption differs, pass --mapping=imports/columns.json. The file maps internal keys to exact report captions, for example {"code":"Tour Ref","summary_sell_cents":"Agent Sell"}. Internal keys are listed in scripts/tours.mjs under aliases. Custom booking statuses require an explicit, reviewed change to the importer. Never guess that a cancelled-with-cost booking has no remaining liability: its imported costs remain in the snapshot.

The import is transactional. Dry runs roll everything back. Identical repeats skip. Changed repeats and existing reference conflicts fail the whole file without replacing records. After import compare row counts, currencies, passenger counts and each financial column against the source report. Check one known booking manually. Keep the source archive until the operator signs off the reconciliation.

Supplier contracts, dated rates, allotments, individual services, confirmation references, passenger names, rooming, attachments and accounting history do not appear in this report and are not imported. Export those separately with Tourplan support and map them through the add commands or a reviewed extension. Real-time hotel availability, distribution connections and accounting remain separate integration work. The free base does not process payments.

Export every domain record with npm run tours -- export --out=exports/backup.json after creating the private exports directory. Existing files are never overwritten. Preserve a database backup as well as this portable JSON archive. The JSON is not a one-command restore format.
