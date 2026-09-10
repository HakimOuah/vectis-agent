# Hackathon presentation draft — September 10, 2026

Status: prepared, not submitted. Animated SDK replay video prepared; final export in progress. Organizer eligibility confirmation outstanding.

## Post draft

Built Vectis Agent with Monid: sponsorship research tools for your own AI assistant.

Give your agent an athlete profile and a spending cap. It can research brands, discover professional contacts, find emails and explicitly verify them with Hunter. Your model makes the decisions; Vectis supplies evidence and saves the handoff. No SponsorAI model key required.

A live MCP SDK workflow covered one athlete, two brands and four targeted contacts. Two addresses received valid Hunter verdicts; two contacts had no address. Fourteen data calls cost $0.20784 in measured Monid charges, excluding the client model. No emails were drafted or sent.

Website: https://vectis-agent.vercel.app
Code: https://github.com/HakimOuah/vectis-agent
Setup: https://github.com/HakimOuah/vectis-agent#install-locally
Evidence and limitations: https://github.com/HakimOuah/vectis-agent/blob/main/VALIDATION.md

The workflow targets sponsorship prospecting performed with Apollo/Hunter subscriptions; Apollo and Hunter remain data suppliers through Monid. This is not a claim to replace their full products or to prove subscription savings.

Client compatibility is still being validated: Codex connected using ChatGPT authentication and read the tools, but its unattended approval policy blocked mission creation. Claude is untested. Existing SponsorAI integration work predates this standalone package; eligibility is unconfirmed.

## Demo outline — 75 to 90 seconds

This is a recording plan, not a recording or a claim of a new successful assistant run.

1. Show the actual public repository and installation instructions (0–15 seconds).
2. Show the example brief, explicit $0.50 cap and client-model ownership (15–30 seconds).
3. Show the existing sanitized validation report: research → contact discovery → explicit email verification (30–50 seconds). Label this as the completed SDK test; do not depict it as the blocked autonomous Codex run.
4. Show two valid addresses out of four contacts as counts only, $0.20784 provider charges, separate model cost, and no drafted/sent emails (50–65 seconds).
5. Show source link and outstanding host compatibility work (65–90 seconds).

Do not display API keys, raw provider payloads, private email addresses, local environment files or account information. Do not fabricate a terminal interaction or successful run.

## Before submission

- Complete an interactive client run with the host's own approval flow.
- Record the actual demo, with the SDK/client distinction visible if still applicable.
- Public landing deployed: https://vectis-agent.vercel.app (Vercel).
- Confirm organizer rules on pre-existing project work and the submission deadline.
- If making cost-comparison claims, price an equivalent operation/coverage basket using current official competitor prices and include model costs. Do not compare this small sample directly with a full monthly plan.
- Submit only after the final links and claims are checked.
