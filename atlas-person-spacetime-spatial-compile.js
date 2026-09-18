((root, factory) => {
  "use strict";
  const modelApi = typeof module === "object" && module.exports ? require("./atlas-person-spacetime-model.js") : root?.ATLAS_PERSON_SPACETIME_MODEL;
  const spaceAxisApi = typeof module === "object" && module.exports ? require("./atlas-person-spacetime-space-axis.js") : root?.ATLAS_PERSON_SPACETIME_SPACE_AXIS;
  const api = factory(modelApi, spaceAxisApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_SPATIAL_COMPILE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (modelApi, spaceAxisApi) => {
  "use strict";

  if (!modelApi) throw new Error("ATLAS_PERSON_SPACETIME_MODEL is required");
  if (!spaceAxisApi) throw new Error("ATLAS_PERSON_SPACETIME_SPACE_AXIS is required");

  function text(value) { return value == null ? "" : String(value).trim(); }

  function normalizedRefs(refs) {
    return Object.freeze(Array.from(new Set((Array.isArray(refs) ? refs : []).map(text).filter(Boolean))).sort());
  }

  function bindingSignature(value) {
    return JSON.stringify([
      text(value?.polity_id),
      text(value?.function_type || value?.place_function_type),
      text(value?.place_name),
      ...normalizedRefs(value?.source_refs || value?.historical_source_refs)
    ]);
  }

  const REVIEWED_PLACE_BINDINGS = Object.freeze([
    Object.freeze({
      place_id: "place-isfahan", polity_id: "01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7", function_type: "capital", place_name: "Isfahan",
      macroregion_code: "west-asia", subregion_code: "iranian-plateau",
      source_refs: Object.freeze(["British Museum Collections Online: Seljuq dynasty (x41057)"])
    }),
    Object.freeze({
      place_id: "place-constantinople", polity_id: "074510f4-f2e7-5795-8cfb-2a4206fa7254", function_type: "capital", place_name: "Constantinople",
      macroregion_code: "europe", subregion_code: "balkans",
      source_refs: Object.freeze(["1911 Encyclopaedia Britannica: Constantinople"])
    }),
    Object.freeze({
      place_id: "place-nicaea", polity_id: "074510f4-f2e7-5795-8cfb-2a4206fa7254", function_type: "capital", place_name: "Nicaea",
      macroregion_code: "west-asia", subregion_code: "anatolia",
      source_refs: Object.freeze(["1911 Encyclopaedia Britannica: Nicaea"])
    }),
    Object.freeze({
      place_id: "place-ankara", polity_id: "28448862-277d-4738-9fb4-7f51a9e4c03a", function_type: "capital", place_name: "Ankara",
      macroregion_code: "west-asia", subregion_code: "anatolia",
      source_refs: Object.freeze(["Atatürk Ansiklopedisi: Ankara’nın Başkent Oluşu"])
    }),
    Object.freeze({
      place_id: "place-pella", polity_id: "2f6e890f-1704-5c76-aa94-f18d7f905e06", function_type: "capital", place_name: "Pella",
      macroregion_code: "europe", subregion_code: "balkans",
      source_refs: Object.freeze(["Hellenic Ministry of Culture and Sports, Odysseus: Pella","Hellenic Ministry of Culture, Cultural Egnatia: Pella"])
    }),
    Object.freeze({
      place_id: "place-rio-de-janeiro", polity_id: "3b8f7efc-40ae-5a33-8956-e9e852fbede4", function_type: "capital", place_name: "Rio de Janeiro",
      macroregion_code: "americas", subregion_code: "south-america",
      source_refs: Object.freeze(["Governo do Brasil: Linha do Tempo da Independência"])
    }),
    Object.freeze({
      place_id: "place-constantinople", polity_id: "5d9a6186-bbe6-5d1a-ba93-02190ae4c417", function_type: "capital", place_name: "Constantinople",
      macroregion_code: "europe", subregion_code: "balkans",
      source_refs: Object.freeze(["1911 Encyclopaedia Britannica: Constantinople"])
    }),
    Object.freeze({
      place_id: "place-rome", polity_id: "5d9a6186-bbe6-5d1a-ba93-02190ae4c417", function_type: "capital", place_name: "Rome",
      macroregion_code: "europe", subregion_code: "italy",
      source_refs: Object.freeze(["1911 Encyclopaedia Britannica: Constantine (emperors)"])
    }),
    Object.freeze({
      place_id: "place-rangoon", polity_id: "5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90", function_type: "political_center", place_name: "Rangoon",
      macroregion_code: "southeast-asia", subregion_code: "mainland-southeast-asia",
      source_refs: Object.freeze(["Government of India / IGNCA chronology: Bose civil and military headquarters moved to Burma in January 1944","Odisha Review: headquarters of the Provisional Government, Indian Independence League and Supreme Command shifted from Singapore to Rangoon"])
    }),
    Object.freeze({
      place_id: "place-singapore", polity_id: "5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90", function_type: "political_center", place_name: "Singapore",
      macroregion_code: "southeast-asia", subregion_code: "maritime-southeast-asia",
      source_refs: Object.freeze(["Press Information Bureau, Government of India: Anniversary of the formation of Azad Hind Government (21 Oct 1943)","Publications Division, Government of India: Builders of Modern India — Subhas Chandra Bose"])
    }),
    Object.freeze({
      place_id: "place-samarkand", polity_id: "6539c314-ec29-42e0-a0c2-90991fb9ffd8", function_type: "capital", place_name: "Samarkand",
      macroregion_code: "central-asia", subregion_code: "western-central-asia",
      source_refs: Object.freeze(["The Metropolitan Museum of Art: The Art of the Timurid Period (ca. 1370–1507)"])
    }),
    Object.freeze({
      place_id: "place-muscat", polity_id: "68c83ef6-0023-5af9-a6e8-26ccf5b8e116", function_type: "capital", place_name: "Muscat",
      macroregion_code: "west-asia", subregion_code: "arabia",
      source_refs: Object.freeze(["National Museum of Oman: Architectural Heritage — Muscat"])
    }),
    Object.freeze({
      place_id: "place-stone-town-zanzibar", polity_id: "68c83ef6-0023-5af9-a6e8-26ccf5b8e116", function_type: "capital", place_name: "Stone Town, Zanzibar",
      macroregion_code: "africa", subregion_code: "east-africa",
      source_refs: Object.freeze(["National Museum of Oman: Architectural Heritage — Muscat","Oman Ministry of Foreign Affairs: History"])
    }),
    Object.freeze({
      place_id: "place-bursa", polity_id: "6d1520e2-0aff-5063-b2b7-95eb86daf372", function_type: "capital", place_name: "Bursa",
      macroregion_code: "west-asia", subregion_code: "anatolia",
      source_refs: Object.freeze(["Republic of Türkiye Bursa Governorship: Tarihçe"])
    }),
    Object.freeze({
      place_id: "place-constantinople", polity_id: "6d1520e2-0aff-5063-b2b7-95eb86daf372", function_type: "capital", place_name: "Constantinople",
      macroregion_code: "europe", subregion_code: "balkans",
      source_refs: Object.freeze(["1911 Encyclopaedia Britannica: Constantinople"])
    }),
    Object.freeze({
      place_id: "place-edirne", polity_id: "6d1520e2-0aff-5063-b2b7-95eb86daf372", function_type: "capital", place_name: "Edirne",
      macroregion_code: "europe", subregion_code: "balkans",
      source_refs: Object.freeze(["Türkiye Culture Portal: Edirne - Genel Bilgiler"])
    }),
    Object.freeze({
      place_id: "place-sogut", polity_id: "6d1520e2-0aff-5063-b2b7-95eb86daf372", function_type: "capital", place_name: "Söğüt",
      macroregion_code: "west-asia", subregion_code: "anatolia",
      source_refs: Object.freeze(["Republic of Türkiye Ministry of National Education, Söğüt District: İlçemiz - Söğüt"])
    }),
    Object.freeze({
      place_id: "place-kufa", polity_id: "a1697cdb-1085-545c-850e-1bbc25cdb61b", function_type: "capital", place_name: "Kufa",
      macroregion_code: "west-asia", subregion_code: "mesopotamia",
      source_refs: Object.freeze(["Encyclopaedia Iranica: Kufa — Ali (r. 656–61) chose Kufa as his capital"])
    }),
    Object.freeze({
      place_id: "place-medina", polity_id: "a1697cdb-1085-545c-850e-1bbc25cdb61b", function_type: "capital", place_name: "Medina",
      macroregion_code: "west-asia", subregion_code: "arabia",
      source_refs: Object.freeze(["Cambridge University Press: Rituals of Islamic Monarchy — the conquest society c. 628–c. 660"])
    }),
    Object.freeze({
      place_id: "place-shangdu-dadu-court-core", polity_id: "d54c540c-f3fb-5d05-9dc0-26af4ee9815a", function_type: "imperial_court_core", place_name: "Kublai court in North China (Shangdu–Dadu)",
      macroregion_code: "east-asia", subregion_code: "china",
      source_refs: Object.freeze(["Cambridge History of the Mongol Empire: Mongolia in the Mongol Empire","Metropolitan Museum of Art: China, 1000–1400 A.D. chronology","UNESCO World Heritage Centre: Site of Xanadu"])
    }),
    Object.freeze({
      place_id: "place-avarga-karakorum-court-core", polity_id: "d54c540c-f3fb-5d05-9dc0-26af4ee9815a", function_type: "imperial_court_core", place_name: "Mongolian imperial court core (Avarga–Karakorum)",
      macroregion_code: "central-asia", subregion_code: "eastern-central-asia-steppe",
      source_refs: Object.freeze(["Cambridge Antiquity: Mapping Karakorum, the capital of the Mongol Empire","Cambridge Modern Asian Studies: The cosmopolitanism of Karakorum, capital of the Mongol empire in Mongolia","UNESCO World Heritage Centre: Archaeological Site at Khuduu Aral and Surrounding Cultural Landscape"])
    }),
    Object.freeze({
      place_id: "place-cairo", polity_id: "e3da3007-529a-40ec-9934-7b70dfd11cb7", function_type: "capital", place_name: "Cairo",
      macroregion_code: "africa", subregion_code: "nile-valley",
      source_refs: Object.freeze(["Getty Thesaurus of Geographic Names: Mamluk Sultanate (TGN 6003667)"])
    })
  ]);

  const REVIEWED_BINDING_BY_SIGNATURE = new Map(REVIEWED_PLACE_BINDINGS.map((binding) => [bindingSignature(binding), binding]));

  function reviewedPlaceBindingForFunction(polityId, fn) {
    return REVIEWED_BINDING_BY_SIGNATURE.get(bindingSignature({
      polity_id: polityId,
      function_type: fn?.function_type,
      place_name: fn?.place_name,
      source_refs: fn?.source_refs
    })) || null;
  }

  function reviewedPlaceBindingForSegment(segment) {
    const representativeFunction = (Array.isArray(segment?.active_place_functions) ? segment.active_place_functions : []).find((fn) =>
      text(fn?.function_type) === text(segment?.place_function_type) &&
      text(fn?.place_name) === text(segment?.place_name)
    );
    if (representativeFunction) {
      const exact = reviewedPlaceBindingForFunction(segment?.polity_id, representativeFunction);
      if (exact) return exact;
    }
    return reviewedPlaceBindingForFunction(segment?.polity_id, {
      function_type: segment?.place_function_type,
      place_name: segment?.place_name,
      source_refs: segment?.source_refs
    });
  }

  function normalizedActivePlaceFunctions(segment) {
    return Object.freeze((Array.isArray(segment?.active_place_functions) ? segment.active_place_functions : []).map((fn) => Object.freeze({
      function_type: text(fn?.function_type) || null,
      place_name: text(fn?.place_name) || null,
      place_id: text(fn?.place_id) || null,
      region_code: text(fn?.region_code) || null,
      confidence: text(fn?.confidence) || null,
      source_refs: normalizedRefs(fn?.source_refs)
    })));
  }

  function compileSubregionRange(continuum, macroregionCode, subregionCode) {
    const macro = continuum?.bandForCode?.(text(macroregionCode));
    const subregion = continuum?.bandForCode?.(text(subregionCode));
    if (!macro || macro.kind !== "macroregion") return null;
    if (!subregion || subregion.kind !== "subregion" || subregion.parent_code !== macro.code) return null;
    return Object.freeze({
      macroregion_code: macro.code,
      subregion_code: subregion.code,
      x_anchor: subregion.center_space,
      x_min: subregion.min_space,
      x_max: subregion.max_space
    });
  }

  function baseCompiledSegment(segment, macro) {
    return {
      activity_id: text(segment?.activity_id), polity_id: text(segment?.polity_id), region_code: text(segment?.region_code),
      macroregion_code: macro?.code || null, subregion_code: text(segment?.subregion_code) || null, location_label: text(segment?.location_label),
      place_function_type: text(segment?.place_function_type) || null, place_name: text(segment?.place_name) || null,
      place_id: text(segment?.place_id) || null, start_year: segment?.start_year ?? null, end_year: segment?.end_year ?? null,
      historical_placement_basis: text(segment?.placement_basis), historical_confidence: text(segment?.confidence),
      historical_source_refs: normalizedRefs(segment?.source_refs),
      active_place_functions: normalizedActivePlaceFunctions(segment)
    };
  }

  function unresolvedSegment(segment, macro, reason) {
    return Object.freeze({
      ...baseCompiledSegment(segment, macro), status: "spatial_compile_unresolved", reason,
      x_anchor: null, x_min: null, x_max: null, spatial_precision: "unresolved", display_anchor_basis: null
    });
  }

  function compiledDisplayPlacePoints(segment, continuum, macro) {
    const points = [];
    for (const fn of normalizedActivePlaceFunctions(segment)) {
      const binding = reviewedPlaceBindingForFunction(segment?.polity_id, fn);
      if (!binding || binding.macroregion_code !== macro?.code) continue;
      const range = compileSubregionRange(continuum, binding.macroregion_code, binding.subregion_code);
      if (!range) continue;
      points.push(Object.freeze({
        place_id: binding.place_id,
        place_name: binding.place_name,
        function_type: binding.function_type,
        macroregion_code: binding.macroregion_code,
        subregion_code: range.subregion_code,
        x_anchor: range.x_anchor,
        display_anchor_basis: "reviewed_place_point",
        display_source_refs: normalizedRefs(binding.source_refs)
      }));
    }
    return Object.freeze(points);
  }

  function compilePlacementSegment(segment, continuum = spaceAxisApi.createSpatialContinuum()) {
    const macroCode = text(segment?.region_code);
    const macro = continuum?.bandForCode?.(macroCode);
    if (!macro || macro.kind !== "macroregion") return unresolvedSegment(segment, null, "invalid_macroregion");

    const binding = reviewedPlaceBindingForSegment(segment);
    if (binding) {
      if (binding.macroregion_code !== macro.code) return unresolvedSegment(segment, macro, "reviewed_place_macroregion_conflict");
      const range = compileSubregionRange(continuum, binding.macroregion_code, binding.subregion_code);
      if (!range) return unresolvedSegment(segment, macro, "reviewed_place_subregion_invalid");
      return Object.freeze({
        ...baseCompiledSegment(segment, macro),
        place_id: binding.place_id,
        subregion_code: range.subregion_code,
        status: "placed", reason: null,
        x_anchor: range.x_anchor, x_min: range.x_anchor, x_max: range.x_anchor,
        spatial_precision: "place", display_anchor_basis: "reviewed_place_point",
        display_confidence: "reviewed",
        display_source_refs: normalizedRefs(binding.source_refs),
        display_place_points: compiledDisplayPlacePoints(segment, continuum, macro)
      });
    }

    const reviewedSubregionCode = text(segment?.subregion_code);
    if (reviewedSubregionCode) {
      const range = compileSubregionRange(continuum, macro.code, reviewedSubregionCode);
      const activityOverride = text(segment?.placement_basis) === "activity_override";
      if (!range) return unresolvedSegment(segment, macro, activityOverride ? "reviewed_activity_subregion_invalid" : "reviewed_polity_subregion_invalid");
      return Object.freeze({
        ...baseCompiledSegment(segment, macro),
        subregion_code: range.subregion_code,
        status: "placed", reason: null,
        x_anchor: range.x_anchor, x_min: range.x_min, x_max: range.x_max,
        spatial_precision: "subregion", display_anchor_basis: activityOverride ? "reviewed_activity_subregion" : "reviewed_polity_subregion",
        display_confidence: "reviewed",
        display_source_refs: normalizedRefs(segment?.source_refs),
        display_place_points: compiledDisplayPlacePoints(segment, continuum, macro)
      });
    }

    return unresolvedSegment(segment, macro, "macroregion_only_unresolved");
  }

  function compileActivityPlacement(placementResult, continuum = spaceAxisApi.createSpatialContinuum()) {
    if (!placementResult || placementResult.status !== "placed") {
      return Object.freeze({ activity_id: text(placementResult?.activity_id), polity_id: text(placementResult?.polity_id), status: text(placementResult?.status) || "spatial_compile_unresolved", reason: text(placementResult?.reason) || text(placementResult?.chronology_reason) || text(placementResult?.status) || null, segments: Object.freeze([]) });
    }
    const compiled = (placementResult.segments || []).map((segment) => compilePlacementSegment(segment, continuum));
    const unresolved = compiled.find((segment) => segment.status !== "placed");
    return Object.freeze({ activity_id: text(placementResult.activity_id), polity_id: text(placementResult.polity_id), status: unresolved ? "spatial_compile_unresolved" : "placed", reason: unresolved?.reason || null, segments: Object.freeze(compiled) });
  }

  function compileActivities(activities, spatialLookup, continuum = spaceAxisApi.createSpatialContinuum()) {
    return Object.freeze((Array.isArray(activities) ? activities : []).map((activity) => compileActivityPlacement(modelApi.resolveActivityPlacement(activity, spatialLookup), continuum)));
  }

  return Object.freeze({
    REVIEWED_PLACE_BINDINGS,
    bindingSignature,
    reviewedPlaceBindingForFunction,
    reviewedPlaceBindingForSegment,
    normalizedActivePlaceFunctions,
    compiledDisplayPlacePoints,
    compileSubregionRange,
    compilePlacementSegment,
    compileActivityPlacement,
    compileActivities
  });
});