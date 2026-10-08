# POLITY-P2-02 — Macedon and Macedonian Empire historical scope judgment

**Status:** CLOSED / KEEP_SEPARATE / NO_DB_MUTATION
**Date:** 2026-10-09
**Authority:** issue #1895, current Production, Oxford historical references

## Scope and live database

Current normalized Production holds two live historical Polities:
- Macedon (마케도니아): `87517d54-5a6f-42f0-88aa-12c2239bf36f`, 8 Activity rows belonging to 6 distinct Persons.
- Macedonian Empire (마케도니아 제국): `2f6e890f-1704-5c76-aa94-f18d7f905e06`, 1 Activity row belonging to 1 Person.

The Empire's existing Activity `1aff946b-e4fa-560c-9eff-37571baf8199` is Alexander's c.336–323 BCE kingship/conquests. It must not be duplicated as a second identical reign solely to fill the Macedon UUID. Macedon holds Eurydice I, Philip II, Cynane, Olympias, two Pyrrhus reigns and two Antigonus II reigns. The Macedonian kingdom's earlier and later identity is not contingent on the continuing existence of Alexander's imperial dominions.

## Historical decision

Oxford University Press's *Alexander the Great: A Very Short Introduction* identifies Alexander's accession to the Macedonian kingship (336 BCE) and his subsequent overthrow of Achaemenid Persian rule. Oxford's *Macedonia under the Argead Kings* distinguishes the earlier Argead kingdom and its rise to imperial conquest power; the *Oxford Classical Dictionary* entry on Diadochi identifies partition and fragmentation of Alexander's empire after 323 BCE.

A broad imperial territorial/governance scope covering conquered Persian dominions is not interchangeable with the narrower kingdom's persistent Macedonian homeland, royal administration and post-Alexander histories. Their overlapping rule under Alexander does **not** mean two unrelated contemporary sovereign states or two distinct Alexanders. The existing pair is retained as different modeling scopes, preserving kingdom continuity and imperial expansion/partition. This is a **KEEP_SEPARATE** registry judgment, not a general rule to split every kingdom after conquest.

No precise imperial foundation day is inferred. No generic successor-state edge is invented, because imperial fragmentation was not a single successor relation.

## Production decision and safeguards

- Preserve both existing Polity UUIDs.
- Preserve 9 existing combined Person Activity UUIDs, temporal fields and Source provenance.
- Do not duplicate Alexander, relink his single historical Activity, retire either Polity, or manufacture a new designation.
- No Production Correction, identity merge, SQL mutation, territory geometry, relation or Person write is necessary.
- Mark registry `macedon-empire` **KEEP_SEPARATE**, terminal and locked.
- Continue to the next pending historical-family seed: **Empire of Brazil ↔ United States of Brazil / Brazil**.
- France residual still requires user approval; P14 stays parked.

## Sources

- Oxford University Press, Hugh Bowden, *Alexander the Great: A Very Short Introduction* (2014): https://academic.oup.com/book/554
- Oxford University Press, Ian Worthington, *Macedonia under the Argead Kings* (2026): https://academic.oup.com/book/62725
- Oxford Classical Dictionary, *Diadochi* (2015): https://academic.oup.com/edited-volume/61673/chapter-abstract/548722980

**Acceptance:** reviewed historical scope and exact connected Production census; zero canonical mutation.