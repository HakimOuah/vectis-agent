# Vectis Agent

Sponsorship research tools for **your own AI assistant**. Your model researches, scores and writes. Vectis retrieves evidence through your Monid account and saves missions, sources, contact handoffs and provider receipts locally. By default the workflow stops at email verification; writing belongs to the client model when requested.

This is an installable first version extracted from the SponsorAI/Vectis project. It does not call SponsorAI's AI engine, production database, LinkedIn browser session or mailboxes. No OpenAI or Anthropic model credentials are read by the server.

## Choose your model

- **An assistant with a subscription:** connect this local MCP server to a host that supports stdio MCP servers. The host uses its own supported login and model. Vectis does not authenticate against or consume your subscription itself.
- **Your own API key:** use an MCP-capable agent host configured with your OpenAI, Anthropic or other model API key. The host performs the reasoning loop; Vectis supplies tools. This package is not a standalone LLM runner.

A ChatGPT or Claude subscription does not itself supply API credit. See [OpenAI billing](https://help.openai.com/en/articles/9039756-chatgpt-search) and [Claude subscription/API distinction](https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-do-i-have-to-pay-separately-to-use-the-claude-api-and-console). Compatibility with individual client UIs has not yet been manually validated. A real MCP SDK client over stdio is tested.

## Install locally

Requires Node.js 22 or later. Clone this repository first:

```sh
git clone https://github.com/HakimOuah/vectis-agent.git
cd vectis-agent
```

Then install:

```sh
npm ci --ignore-scripts
cp .env.example .env
chmod 600 .env
```

Edit `.env` locally with your own Monid key and an absolute private `VECTIS_DATA_DIR` if desired. Do not commit the file. Set an explicit spending limit. No paid call is made at startup.

Add a stdio server in your assistant's MCP configuration. For clients accepting the conventional JSON format, replace both paths below with your actual absolute paths:

```json
{
  "mcpServers": {
    "vectis": {
      "command": "node",
      "args": [
        "--env-file=/absolute/path/vectis-agent/.env",
        "/absolute/path/vectis-agent/src/server.mjs"
      ]
    }
  }
}
```

Some hosts use a different configuration format. Use the same executable and arguments in their MCP settings. If the app cannot resolve Node, use its absolute executable path.

Enable the included `skills/vectis-sponsoring` skill in hosts that support skills. Otherwise ask the assistant to call `vectis_get_workflow` first; the same instructions are returned. The MCP `sponsor-research` prompt is also available.

Example request:

> Read the Vectis workflow. Research sponsors for this athlete using the profile below, target France and Germany, and spend at most $0.50 through Monid. Return up to five justified matches, current professional contacts where verified, and verified professional emails. Stop before writing; cite sources and identify missing evidence. Do not send anything. [Paste athlete profile.]

## Tools

| Tool | Function |
| --- | --- |
| `vectis_get_workflow` | Instructions for your own model |
| `vectis_start_mission` / `vectis_list_missions` / `vectis_get_mission` | Persistent local missions and receipts |
| `vectis_inspect` | Current provider schema and pricing, without a paid data run |
| `vectis_search_web` | Exa web search and source text; up to 10 results, no generated summaries |
| `vectis_search_contacts` | Apollo people search by exact company domain and role |
| `vectis_enrich_contact` | Apollo person enrichment; personal email and phone reveals disabled |
| `vectis_find_email` / `vectis_verify_email` | Hunter professional email discovery and verification |
| `vectis_refresh_call` | Poll the original saved run without submitting another paid call |
| `vectis_save_report` | Save your assistant's sourced analysis and drafts |

Provider outputs are preserved as evidence. Vectis does not certify an assistant's scores or conclusions. Stored JSON files include personal data returned by providers; keep the directory private and only distribute redacted evidence.

## Budget and recovery

`VECTIS_MAX_USD` defaults to 2 USD and applies across **all missions retained in the data directory**, including previous processes. Each mission also has its own smaller cap. Calls inspect the current tariff and persist a conservative reservation before submitting. Unknown or changed price models are blocked.

This is a local admission limit based on provider pricing, not a contractual guarantee that an upstream vendor cannot overcharge. Actual charges above the reservation are counted before subsequent calls. Reported costs, failed charges and unknown charges remain visible. The user's model, subscription, hosting and other costs are separate.

Use the same `requestId` with the same arguments after a retry or reconnection. It returns the stored attempt. Different arguments with the same ID are rejected. If pending, refresh it; do not create a new paid request. An uncertain submission or unknown charge blocks all new paid calls. With no returned run ID, reconcile manually in Monid; this release does not automate reconciliation.

One MCP process exclusively owns a data directory. A stale `process.lock` after a crash must be removed only after confirming no other process uses that directory. Keep the same directory to preserve billing history. Never reset the directory merely to work around a budget or uncertain-charge block.

## Verification and packaging

```sh
npm test
npm pack --dry-run
```

Optional live check, **up to $0.05 of your Monid balance**, using an isolated local directory. It inspects all five operations and submits only one public Exa query. Re-running reuses the same saved request:

```sh
node --env-file=.env scripts/smoke-live.mjs
```

To distribute a local archive, run `npm pack`, copy the `.tgz`, extract it, then run `npm ci --ignore-scripts` inside the extracted `package` directory. The archive includes its lockfile. The package is private to prevent accidental registry publication; no npm release or public hosted endpoint exists yet. The source repository is https://github.com/HakimOuah/vectis-agent.

## Scope and hackathon claims

Implemented: installable local MCP server, user-owned model workflow, five data operations, persistent budgets/evidence/reports, async polling and duplicate-call protection.

Not implemented: hosted HTTP/OAuth connector, universal one-click subscription login, automatic autonomous model runner, CRM synchronization, email sending, scheduled follow-ups, pipeline and analytics. Existing SponsorAI remains separate.

The comparison target is the **sponsorship prospecting workflow** using Apollo/Hunter; these vendors remain upstream data suppliers through Monid. Do not claim to replace their entire products or databases. A live contact-validation run now covers one athlete, two brands and four targeted contacts (two verified addresses, two missing), for $0.20784 in measured Monid charges. This is not a representative coverage benchmark. Broader testing and independent user installation are required before claiming feature or cost equivalence. Monid receipts alone do not prove all-in cost or contact quality.

Built on existing SponsorAI work. New package work begins September 10, 2026. Existing Monid integration predates this package; hackathon eligibility requires checking the actual commit history against the event's new-work requirement. No eligibility approval is implied.

Email verification uses the latest explicit Hunter verifier result for the exact address. A report cannot mark an address verified without matching successful evidence. Catch-all, invalid and inconclusive results remain distinct; a provider-valid verdict is not a delivery guarantee.
