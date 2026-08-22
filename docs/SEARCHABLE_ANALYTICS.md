# Stage 10 — Searchable Analytics

Stage 10 turns analytics and global search into evidence-navigation tools. It does not add generated sample records, change existing client records, or alter the database schema.

## Universal owner search

The owner search now covers the bounded live workspace data returned by the authenticated owner API:

- clients and private studio notes;
- projects, summaries, tags, placement, and next actions;
- messages, appointments, and approvals;
- files and design assets;
- payment requests;
- tattoo sessions and healing check-ins;
- content candidates and client intake requests;
- captured knowledge items.

Search requires two characters, ranks direct title and prefix matches above matches inside supporting content, and routes each result to its owning workspace. Message content and private notes remain owner-only because this search is rendered only after owner authorization.

## Evidence-backed analytics

Analytics now has working Overview, Financial, and Workflow views. Every metric can be selected to reveal the exact records behind its count or amount. Lifecycle bars are also interactive and expose the projects in the chosen phase.

Financial metrics use the payment ledger rather than project budget estimates. Collected value subtracts confirmed refunds, and outstanding value includes only approved or open unpaid balances.

All operational analytics exclude projects marked as test data and projects that have been archived. The interface states this boundary next to the source records.

## Deep links

Analytics and search can open the relevant client, project, appointment, inbox conversation, design approval, finance ledger, lifecycle workspace, content studio, or knowledge library. Appointment search results focus the exact calendar record.

## Data safety

This stage adds a read-only knowledge selection to the owner workspace response. It has no destructive migration and leaves all alpha client data, project history, payments, messages, and audit events intact.
