# Hackathon submission copy — September 10, 2026

Status: GitHub materials prepared; social post and email not sent. Attach the demo video to the X post. Replace the email's social URL placeholder after publishing.

## X post (attach the demo)

I built Vectis Agent to cut Apollo/Hunter subscriptions out of sponsorship prospecting.

Your AI thinks. Monid supplies the data.

Live test: 14 calls, 2 validated emails, $0.21 in data costs. Not even a baguette 🥖

https://vectis-agent.vercel.app #monid

## Email reply to Jasper

Reply in the existing email thread, preserving its subject.

Hi Jasper,

Thanks for the update! Here is Vectis Agent, my entry for We Kill.

Social post: [PASTE THE PUBLISHED X POST URL]
Live site: https://vectis-agent.vercel.app
Repository: https://github.com/HakimOuah/vectis-agent
Demo video: https://github.com/HakimOuah/vectis-agent/releases/download/v0.1.0/vectis-agent-demo.mp4

1. What I killed and its price: the Apollo/Hunter subscription stack for sponsorship prospecting — Apollo Basic at $69 per seat/month and Hunter Starter at €49/month, using monthly billing prices observed on September 10. Vectis exposes this workflow as installable MCP tools for the user's own AI. Apollo and Hunter remain upstream data providers through Monid; this is a scoped workflow replacement, not full-product parity.
2. Monid endpoints used: Exa `/search`; Apollo `/mixed_people/api_search` and `/people/match`; Hunter (`hunterio`) `/email-finder` and `/email-verifier`.
3. Real measured cost: $0.20784 across 14 data calls (6 Exa searches, 1 Apollo search, 2 Apollo enrichments, 3 Hunter finder calls, 2 Hunter verifier calls). One athlete, two brands, four contacts: two provider-validated emails and two missing addresses. Client-model costs are separate; no emails were sent.

The video is an animated replay of the completed MCP SDK test, with simulated assistant interfaces. The installable package was created on September 10 from existing SponsorAI work; this prior-work provenance is documented in the repo for your eligibility review.

Thanks for organizing this — happy to share more details!

Hakim

## Submission checklist

- Publish the demo on social channels with `#monid` in every post.
- Replace the social URL placeholder and reply to the organizer's email.
- Organizer email supplied by the participant says registration is already complete and submission closes September 14, 2026 at 23:59 ET (September 15 at 05:59 Europe/Paris).
- Prior-work provenance and client compatibility limits are documented in [VALIDATION.md](../VALIDATION.md).

## Public assets

- [Release and demo download](https://github.com/HakimOuah/vectis-agent/releases/tag/v0.1.0)
- [MP4](https://github.com/HakimOuah/vectis-agent/releases/download/v0.1.0/vectis-agent-demo.mp4)
- [Live site](https://vectis-agent.vercel.app)
- [Measured validation](../VALIDATION.md)
