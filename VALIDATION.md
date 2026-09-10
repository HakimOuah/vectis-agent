# Validation — September 10, 2026

A live MCP workflow was tested through a real SDK client: athlete research → sponsor evidence → contact discovery → email discovery/enrichment → Hunter verification → saved handoff to the client model.

- Sample: one athlete (Dayot Upamecano), two brands (air up and waterdrop), four targeted professional contacts.
- Result: two addresses reported valid by Hunter with successful SMTP checks and non-catch-all verdicts; two contacts without an address.
- 14 data calls: six Exa searches, one Apollo search, two Apollo enrichments, three Hunter finder calls, two Hunter verifier calls.
- Measured Monid cost: **$0.20784**. Conservative reservations: $0.25568. Budget: $2. No unknown charges.
- One repeated verification request after restart returned the same stored provider run without a new paid call.
- 14 automated tests pass, including MCP transport, duplicate submission protection, persisted budgets, unknown charges, verification evidence, latest-verdict precedence and floating-point accounting.
- The skill passes the skill-creator validator. The packaged archive was tested separately from the source checkout.

No drafts or emails were generated or sent. No SponsorAI model or production database was used. The client assistant performed the reasoning; its model cost is separate and not included in the Monid total.

## Limits

This is a functional sample, not a representative coverage or deliverability benchmark. Provider-valid does not guarantee delivery or a reply. The air up contact with a valid address has Benelux/global content responsibilities; decision-making authority for France was not established. Commercial fit, available budgets and athlete exclusivities remain unverified.

One Finder result marked the domain catch-all, while the later explicit Verifier result did not. Both responses were retained privately; the latest explicit verification determines the reported verdict.

Personal contact details, provider payloads, API keys and local mission files are excluded from this repository. They are not needed to run the automated tests. Live tests require the user's own Monid key and incur charges.

## Provenance and release status

The package was developed on September 10, 2026 using existing SponsorAI business knowledge and Monid integration patterns. Its public Git history begins with this export; it does not imply that all underlying work originated during the hackathon. Eligibility has not been confirmed by the organizers.

Manual compatibility checks with individual assistant apps, a comparable competitor-price benchmark, hosted deployment, the demo video and hackathon submission remain separate work.
