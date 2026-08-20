(() => {
  "use strict";

  const referencesByPersonId = Object.freeze({
    "da0303c2-1faf-40b8-9dc2-1325b77488d7": Object.freeze({
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D"
        })
      ])
    })
  });

  function entryForPerson(person) {
    const id = String(person?.id || "").trim().toLowerCase();
    return referencesByPersonId[id] || null;
  }

  function linksForPerson(person) {
    return entryForPerson(person)?.links || [];
  }

  function linkForPerson(person, provider) {
    const wanted = String(provider || "").trim().toLowerCase();
    return linksForPerson(person).find((link) => String(link.provider || "").toLowerCase() === wanted) || null;
  }

  window.ATLAS_PERSON_EXTERNAL_REFERENCES = Object.freeze({
    entryForPerson,
    linksForPerson,
    linkForPerson
  });
})();
