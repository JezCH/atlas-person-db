# ATLAS Governance Context Contract v1

> Status: STAGE 2 DOMAIN CONTRACT / AUDIT ONLY
>
> Production DB mutation: **none**
>
> Purpose: separate the map-level political actor (**Polity**) from the government, constitutional order, or governing regime through which that polity is administered in a given period.

## 1. Core distinction

```text
Polity
  ├─ has Territory history
  └─ has Governance history
        └─ Governance Context

Person
  └─ Activity -> Polity
        └─ relation_type
```

A Governance Context does not automatically own a map polygon. Territory remains a time-dependent state of Polity.

Examples of the distinction:

- France / French Republic -> **French Fifth Republic**
- Japan -> **Tokugawa Shogunate** (subject to the unresolved layered-authority model)
- Tibet -> **Ganden Phodrang**
- Florence -> republican / Medici governing phases where historically justified

By contrast:

- Great Qi -> a short-lived rebel **Polity**, not merely a governance context;
- Oda Clan -> a house/lineage, not automatically a government;
- a person's changing opposition/service relationship -> Activity relation semantics, not a Governance Context.

## 2. Why Governance Context is an entity

A government/regime is not a property of one Person. Multiple people can serve or govern under the same constitutional/governmental order, and the same order exists independently of any single Activity row.

Therefore ATLAS should not duplicate strings such as `Fifth Republic` on every Person Activity as the primary model.

Recommended conceptual structure:

```text
governance_contexts
  id UUID
  canonical_key
  governance_type
  historicity

governance_context_names
  governance_context_id
  locale
  name
  name_type
  is_preferred

polity_governance_periods
  id UUID
  polity_id
  governance_context_id
  start / end temporal interval
  confidence
  provenance / sources
```

Exact SQL is deferred until the historical audit and temporal-precision contract are complete.

## 3. Governance type — keep it small

The first schema should use only the distinctions needed by real ATLAS data. Recommended initial controlled values:

- `government` — an organized governing apparatus/order such as Ganden Phodrang or a shogunate when modeled as the government of a broader polity;
- `constitutional_regime` — a constitutionally defined political order such as the French Fifth Republic;
- `governing_regime` — a historically identifiable ruling regime/order that is useful as governance context but is not adequately described as a constitutional regime.

Do **not** create separate top-level entity systems now for every dynasty, house, clan, cabinet, ministry, court, ideology, or party. Those are separate concepts and should be promoted only when an actual query/use case requires them.

## 4. Governance belongs primarily to Polity + time

Simple case:

```text
Person: Charles de Gaulle
Activity: France / President / rules / 1959-1969

Polity governance period:
France -> French Fifth Republic / 1958-
```

The Activity does not need to duplicate `Fifth Republic` merely to know the governing context for 1959-1969; it can be derived by time intersection.

This avoids:

- repeating the same regime on every Person row;
- making a regime look like a country;
- tying regime identity to one office-holder;
- duplicating changes when a regime period is corrected.

## 5. Optional Activity-to-Governance link is deferred

Some historical systems have multiple simultaneous authority structures. Japan under the bakuhan order is the clearest current example: shogunal government, imperial/court legitimacy, domains, and different direct-control scopes coexist.

ATLAS may eventually need an optional Activity -> Governance Context link when:

- several governance contexts overlap for one Polity and period; and
- the Person's role is specifically attached to one of them.

This is **not** added in v1. First resolve the Polity-to-Polity / layered-authority contract. A mandatory `governance_context_id` on every Activity would duplicate derivable data and falsely imply that all political systems have one exclusive government layer.

## 6. Explicit reconciliation of the old `governance_context` planning signal

The current master ledger's dependency classifier is deliberately broad and scans audit prose. It is a work-finding signal, not a schema ground truth. The seven current rows carrying that signal reconcile as follows.

| Activity | Current semantic signal | Governance conclusion |
|---|---|---|
| Huang Chao / Great Qi | prose includes “rebel regime” | **False positive for schema need.** Great Qi is retained as a rebel Polity. |
| Oda Nobunaga / Oda Clan | clan context appears in a Polity-research row | **Not a Governance Context conclusion.** Oda Clan is lineage/house context; territorial political authority remains research. |
| Hideyoshi / Toyotomi Regime | current pseudo-Polity is explicitly a regime | **True governance case.** Preserve Toyotomi Regime as governance context while splitting/researching the correct Polity/territory phases. |
| Hideyoshi / Japan | competing Japan row overlaps the regime row | **True governance-after-split case.** Japan may be the map-level Polity in an appropriate later phase, with Toyotomi Regime as governance context; chronology remains unresolved. |
| Harriet Tubman / United States | old audit prose mentioned regime review | **Not primarily governance.** Her row must split `opposes / serves / active_in` relation phases. |
| Mahatma Gandhi / British Raj | multiple structural problems overlap | **Not primarily governance.** Relation, chronology, colonial/dependent-polity structure must be resolved first. |
| Charles de Gaulle / French Fifth Republic | constitutional regime used as Polity | **True governance case.** Relink to the appropriate France/French Republic Polity identity and preserve Fifth Republic as governance context. |

So the old count `7` must not be read as “ATLAS needs exactly seven governance migrations.”

## 7. True cases missed by the old keyword queue

The broad dependency queue also has false negatives because governance semantics may be described without the exact trigger words.

Current reviewed examples:

### Niccolò Machiavelli — Florence

The current continuous Republic of Florence 1498-1527 row crosses the republican government and Medici restoration. The Polity continuity question and the person's service/activity phases must be split, while governance history preserves the republican/Medici order distinction.

### Tokugawa Ieyasu — Japan / Tokugawa Shogunate

The current rows prove that the shogunate is a governance/authority structure relevant to the Person, but ATLAS still needs the layered Japan/bakufu/domain political-authority model before a final Polity relink. Governance Context is necessary, but not sufficient by itself.

These cases are explicit evidence that governance modeling should be driven by reviewed history, not by string-keyword dependency extraction.

## 8. What is not Governance Context

Do not use the Governance entity as a dumping ground.

- dynasty/house/clan -> not governance by default;
- party -> not governance by default;
- revolt/war/event -> Event, not governance;
- ethnicity/people -> not governance;
- dependent polity -> still a Polity if it is a historically identifiable political actor;
- person's service/opposition -> Activity relation;
- claimed territory -> Territory control/claim semantics;
- polity renaming/state-form continuity -> Polity identity/history contract.

## 9. Runtime behavior

Runtime should resolve governance from the selected Polity + year when a reviewed Governance Context exists.

Example:

```text
1959
France
  polity territory -> France geometry
  governance -> French Fifth Republic
  person -> Charles de Gaulle / President / rules
```

The map polygon remains France's Territory Record. `French Fifth Republic` appears as governance metadata/layer, not as a separate country polygon.

## 10. Authoring behavior

Authoring must be able to preserve:

- unknown governance start/end;
- overlapping governance contexts where history requires it;
- disputed classification;
- source conflicts;
- governance context known even when the final Polity relink is not yet resolved.

No placeholder Polity or fake geometry may be created merely to satisfy Runtime.

## 11. Schema gate

Before implementing the database migration, complete:

1. explicit governance audit of reviewed current cases;
2. layered Polity relation contract;
3. Polity identity/continuity contract;
4. temporal precision decision;
5. source/provenance shape for governance periods;
6. clean-schema migration and rollback tests.

The expected minimal implementation is a **shared Governance Context identity + Polity-governance temporal link**, not a mandatory regime string/foreign key copied onto every Activity.
