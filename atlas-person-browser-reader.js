(() => {
  "use strict";

  const ENDPOINT = "/api/atlas-person-read";
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const PRIMARY_HISTORICITY_VALUE = "historical";
  const HIDDEN_ORPHAN_PERSON_IDS = new Set([
    "93b50bf5-9468-41ea-93a4-12510b9ed0c4" // duplicate/orphan Gorgo; keep Gorgo of Sparta
  ]);

  function text(value) {
    return value == null ? "" : String(value);
  }

  function publicPersons(persons) {
    return (persons || []).filter((person) => !HIDDEN_ORPHAN_PERSON_IDS.has(text(person?.id)));
  }

  function observedHistoricityValues(persons) {
    return [...new Set((persons || []).map((person) => text(person?.historicity)))].sort();
  }

  function historicityGroup(person) {
    return text(person?.historicity) === PRIMARY_HISTORICITY_VALUE ? "historical" : "other_or_uncertain";
  }

  function partitionByHistoricity(persons) {
    const historical = [];
    const otherOrUncertain = [];
    for (const person of publicPersons(persons)) {
      if (historicityGroup(person) === "historical") historical.push(person);
      else otherOrUncertain.push(person);
    }
    const visiblePersons = publicPersons(persons);
    return Object.freeze({
      historical: Object.freeze(historical),
      other_or_uncertain: Object.freeze(otherOrUncertain),
      observed_historicity_values: Object.freeze(observedHistoricityValues(visiblePersons))
    });
  }

  function facetRows(person, key) {
    const value = person?.facets?.[key];
    return Array.isArray(value) ? value : [];
  }

  function activityRows(person) {
    return Array.isArray(person?.activity_summaries) ? person.activity_summaries : [];
  }

  function facetText(item) {
    if (!item) return [];
    return [
      item.display_name,
      item.preferred_name_ko,
      item.canonical_name_en,
      item.source_label,
      item.code,
      item.category
    ].map(text).filter(Boolean);
  }

  function boundarySearchText(boundary) {
    if (!boundary) return [];
    const tokens = [boundary.month, boundary.day, boundary.granularity, boundary.certainty, boundary.calendar]
      .map(text)
      .filter(Boolean);
    if (Number.isInteger(boundary.year)) {
      tokens.push(String(boundary.year));
      if (boundary.year < 0) {
        const absolute = Math.abs(boundary.year);
        tokens.push(`BC ${absolute}`, `BCE ${absolute}`, `기원전 ${absolute}`);
      } else if (boundary.year > 0) {
        tokens.push(`AD ${boundary.year}`, `CE ${boundary.year}`, `서기 ${boundary.year}`);
      } else {
        tokens.push("year 0", "연도 0");
      }
    }
    return tokens;
  }

  function activitySearchText(activity) {
    if (!activity) return [];
    return [
      ...facetText(activity.polity),
      ...facetText(activity.relation),
      ...facetText(activity.role),
      ...facetText(activity.period_basis),
      ...boundarySearchText(activity.start),
      ...boundarySearchText(activity.end),
      activity.confidence,
      activity.chronology_status,
      activity.notes
    ].map(text).filter(Boolean);
  }

  function searchableText(person) {
    const names = Array.isArray(person?.names) ? person.names.map((row) => row?.name) : [];
    const descriptions = Array.isArray(person?.descriptions) ? person.descriptions.map((row) => row?.content) : [];
    const facets = ["polities", "relations", "roles", "period_bases"]
      .flatMap((key) => facetRows(person, key).flatMap(facetText));
    const activities = activityRows(person).flatMap(activitySearchText);
    return [person?.display_name, person?.canonical_name_en, person?.preferred_name_ko, ...names, ...descriptions, ...facets, ...activities]
      .map(text)
      .join("\n")
      .toLocaleLowerCase("ko");
  }

  function personMatchesQuery(person, query) {
    const needle = text(query).trim().toLocaleLowerCase("ko");
    return !needle || searchableText(person).includes(needle);
  }

  function hasFacetId(person, key, id) {
    const expected = text(id).trim();
    return !expected || facetRows(person, key).some((item) => text(item?.id) === expected);
  }

  function personMatchesFacets(person, facetFilters = {}) {
    return hasFacetId(person, "polities", facetFilters.polity_id)
      && hasFacetId(person, "relations", facetFilters.relation_type_id)
      && hasFacetId(person, "roles", facetFilters.role_id)
      && hasFacetId(person, "period_bases", facetFilters.period_basis_id);
  }

  function facetItemLabel(item) {
    return text(item?.display_name || item?.preferred_name_ko || item?.canonical_name_en || item?.source_label || item?.code || item?.id);
  }

  function facetCatalog(persons) {
    const dimensions = {
      polities: new Map(),
      relations: new Map(),
      roles: new Map(),
      period_bases: new Map()
    };
    for (const person of publicPersons(persons)) {
      for (const key of Object.keys(dimensions)) {
        for (const item of facetRows(person, key)) {
          const id = text(item?.id);
          if (id && !dimensions[key].has(id)) dimensions[key].set(id, item);
        }
      }
    }
    const output = {};
    for (const [key, map] of Object.entries(dimensions)) {
      output[key] = Object.freeze([...map.values()].sort((left, right) => {
        const byLabel = facetItemLabel(left).localeCompare(facetItemLabel(right), "ko");
        return byLabel || text(left?.id).localeCompare(text(right?.id));
      }));
    }
    return Object.freeze(output);
  }

  function comparePersons(left, right, sortOrder = "start-asc") {
    const leftYear = Number.isInteger(left?.first_activity_year) ? left.first_activity_year : null;
    const rightYear = Number.isInteger(right?.first_activity_year) ? right.first_activity_year : null;
    if (leftYear == null && rightYear != null) return 1;
    if (leftYear != null && rightYear == null) return -1;
    if (leftYear != null && rightYear != null && leftYear !== rightYear) {
      return sortOrder === "start-desc" ? rightYear - leftYear : leftYear - rightYear;
    }
    return text(left?.display_name || left?.canonical_name_en || left?.id)
      .localeCompare(text(right?.display_name || right?.canonical_name_en || right?.id), "ko");
  }

  function preparePersonGroups(persons, {
    query = "",
    sortOrder = "start-asc",
    facetFilters = {},
    secondaryPredicate = null
  } = {}) {
    const visiblePersons = publicPersons(persons);
    const partitioned = partitionByHistoricity(visiblePersons);
    const filterAndSort = (rows) => rows
      .filter((person) => personMatchesQuery(person, query))
      .filter((person) => personMatchesFacets(person, facetFilters))
      .filter((person) => typeof secondaryPredicate === "function" ? secondaryPredicate(person) : true)
      .slice()
      .sort((left, right) => comparePersons(left, right, sortOrder));

    return Object.freeze({
      historical: Object.freeze(filterAndSort(partitioned.historical)),
      other_or_uncertain: Object.freeze(filterAndSort(partitioned.other_or_uncertain)),
      observed_historicity_values: partitioned.observed_historicity_values,
      facet_catalog: facetCatalog(visiblePersons)
    });
  }

  async function getJson(url, fetchImpl = globalThis.fetch) {
    if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");
    const response = await fetchImpl(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { accept: "application/json" }
    });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok || payload?.ok !== true) {
      const error = new Error(payload?.code || payload?.error || `PERSON_READ_FAILED_${response.status}`);
      error.status = response.status;
      error.code = payload?.code || null;
      throw error;
    }
    return payload;
  }

  async function listPersons({ fetchImpl = globalThis.fetch } = {}) {
    const payload = await getJson(ENDPOINT, fetchImpl);
    if (payload.mode !== "list" || !Array.isArray(payload.persons)) throw new Error("INVALID_PERSON_LIST_RESPONSE");
    const persons = publicPersons(payload.persons);
    return Object.freeze({
      schema: payload.schema,
      source: payload.source,
      persons: Object.freeze(persons.slice()),
      summary: payload.summary || null,
      groups: partitionByHistoricity(persons),
      facet_catalog: facetCatalog(persons)
    });
  }

  async function readPerson(personId, { fetchImpl = globalThis.fetch } = {}) {
    const id = text(personId).trim();
    if (!UUID_PATTERN.test(id) || HIDDEN_ORPHAN_PERSON_IDS.has(id)) {
      const error = new Error("INVALID_PERSON_ID");
      error.code = "INVALID_PERSON_ID";
      throw error;
    }
    const payload = await getJson(`${ENDPOINT}?person_id=${encodeURIComponent(id)}`, fetchImpl);
    if (payload.mode !== "detail" || !payload.person) throw new Error("INVALID_PERSON_DETAIL_RESPONSE");
    return Object.freeze({ schema: payload.schema, source: payload.source, person: payload.person });
  }

  window.ATLAS_PERSON_BROWSER_READER = Object.freeze({
    ENDPOINT,
    PRIMARY_HISTORICITY_VALUE,
    UUID_PATTERN,
    historicityGroup,
    observedHistoricityValues,
    partitionByHistoricity,
    facetRows,
    activityRows,
    facetCatalog,
    personMatchesQuery,
    personMatchesFacets,
    comparePersons,
    preparePersonGroups,
    listPersons,
    readPerson
  });
})();