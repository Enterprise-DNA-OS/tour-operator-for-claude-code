# Record checks for NZ tour operations

Checked 5 October 2026. Run npm run tours -- compliance. These checks identify absent or stale recorded evidence. They do not certify safety, legal compliance, supplier suitability or the validity of a traveller's contract. Scope: an NZ operator. Australian operations need their own jurisdiction-specific review.

| Check | Recorded rule | Authority and limit |
|---|---|---|
| adventure-registration | For a confirmed booking with an NZ supplier marked adventure_activity, flag a missing registration reference, missing recorded check, or an expiry before service date. | [WorkSafe registration list](https://www.worksafe.govt.nz/topic-and-industry/adventure-activities/register-of-adventure-activity-operators/) says registered operators have passed a safety audit and are authorised for stated activities and periods. A person must verify activity scope and current registration. This command does not query the live register. |
| retention-review | Flag passengers whose operator-set retention_review_on is due. | [Privacy Principle 9](https://www.privacy.org.nz/privacy-principles/9/) restricts retention beyond lawful need. The date is the operator's review policy, not a statutory deletion deadline. Check accounting obligations and legal holds before deleting anything. Nothing is deleted here. |
| terms-evidence | Flag a confirmed booking without a reference to accepted terms. | Internal operating policy, not a claim of a statutory consent form. Recording a reference does not obtain agreement. |

To clear a registration finding, check the supplier's actual registration and record the evidence and dates with /supplier-check. Never insert a fictional registration. The sample data is explicitly fictional and cannot authorise an activity.

Departure readiness also needs passenger counts, supplier confirmations and cancellation deadlines. /manifest-gaps, /supplier-chase and /cancellation-watch check those operational records. Cancellation dates are entered from each contract, never invented as a legal notice period. Database access controls, backups, staff identity, privacy notices and cross-border disclosures remain deployment work. Do not store passport copies or medical details in this base.
