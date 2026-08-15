(() => {
  "use strict";

  const ENDPOINT = "/api/atlas-person-read";
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const PRIMARY_HISTORICITY_VALUE = "historical";

  function text(value) {
    return value == null ? "" : String(value);
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
    for (const person of persons || []) {
      if (historicityGroup(person) === "historical") historical.push(person);
      else otherOrUncertain.push(person);
    }
    return Object.freeze({
      historical: Object.freeze(historical),
      other_or_uncertain: Object.freeze(otherOrUncertain),
      observed_historicity_values: Object.freeze(observedHistoricityValues(persons))
    });
  }

  function searchableText(person) {
    const names = Array.isArray(person?.names) ? person.names.map((row) => row?.name) : [];
    const descriptions = Array.isArray(person?.descriptions) ? person.descriptions.map((row) => row?.content) : [];
    return [person?.display_name, person?.canonical_name_en, person?.preferred_name_ko, ...names, ...descriptions]
      .map(text)
      .join("\n")
      .toLocaleLowerCase("ko");
  }

  function personMatchesQuery(person, query) {
    const needle = text(query).trim().toLocaleLowerCase("ko");
    return !needle || searchableText(person).includes(needle);
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
    secondaryPredicate = null
  } = {}) {
    const partitioned = partitionByHistoricity(persons);
    const filterAndSort = (rows) => rows
      .filter((person) => personMatchesQuery(person, query))
      .filter((person) => typeof secondaryPredicate === "function" ? secondaryPredicate(person) : true)
      .slice()
      .sort((left, right) => comparePersons(left, right, sortOrder));

    return Object.freeze({
      historical: Object.freeze(filterAndSort(partitioned.historical)),
      other_or_uncertain: Object.freeze(filterAndSort(partitioned.other_or_uncertain)),
      observed_historicity_values: partitioned.observed_historicity_values
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
    return Object.freeze({
      schema: payload.schema,
      source: payload.source,
      persons: Object.freeze(payload.persons.slice()),
      summary: payload.summary || null,
      groups: partitionByHistoricity(payload.persons)
    });
  }

  async function readPerson(personId, { fetchImpl = globalThis.fetch } = {}) {
    const id = text(personId).trim();
    if (!UUID_PATTERN.test(id)) {
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
    personMatchesQuery,
    comparePersons,
    preparePersonGroups,
    listPersons,
    readPerson
  });
})();
