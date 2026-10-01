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

  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  function normalizedRefs(refs) {
    return Object.freeze(Array.from(new Set((Array.isArray(refs) ? refs : []).map(text).filter(Boolean))).sort());
  }

  function normalizedHistoricalRefs(refs) {
    const unique = new Map();
    for (const raw of Array.isArray(refs) ? refs : []) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const sourceId = text(raw.source_id);
      const locator = text(raw.locator ?? raw.source_locator_key);
      if (!UUID_PATTERN.test(sourceId) || !locator) continue;
      const key = sourceId + "\u0000" + locator;
      if (!unique.has(key)) unique.set(key, Object.freeze({ source_id: sourceId, locator }));
    }
    return Object.freeze([...unique.values()].sort((a, b) => a.source_id.localeCompare(b.source_id) || a.locator.localeCompare(b.locator)));
  }

  function historicalRefKey(ref) {
    return text(ref?.source_id) + "\u0000" + text(ref?.locator ?? ref?.source_locator_key);
  }

  function bindingSignature(value) {
    return JSON.stringify([
      text(value?.place_id),
      text(value?.polity_id),
      text(value?.function_type || value?.place_function_type),
      ...normalizedHistoricalRefs(value?.source_refs || value?.historical_source_refs).map(historicalRefKey)
    ]);
  }

  const REVIEWED_PLACE_BINDINGS = Object.freeze([
    {
      "place_id": "5b1dc86d-d6d5-54ae-9b2d-ec6a2804699c",
      "polity_id": "01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7",
      "function_type": "capital",
      "place_name": "Isfahan",
      "macroregion_code": "west-asia",
      "subregion_code": "iranian-plateau",
      "source_refs": [
        {
          "source_id": "305858ea-e93f-56ec-a353-343eda963c51",
          "locator": "British Museum Collections Online: Seljuq dynasty (x41057)"
        }
      ]
    },
    {
      "place_id": "d36994cd-c9d0-5fcf-a215-0fec2b2242ba",
      "polity_id": "074510f4-f2e7-5795-8cfb-2a4206fa7254",
      "function_type": "capital",
      "place_name": "Constantinople",
      "macroregion_code": "europe",
      "subregion_code": "balkans",
      "source_refs": [
        {
          "source_id": "2781d1ec-bf75-5045-bf99-3f7cdc919d0d",
          "locator": "1911 Encyclopaedia Britannica: Constantinople"
        }
      ]
    },
    {
      "place_id": "480ae330-d16c-59da-aef9-5a693cae063d",
      "polity_id": "074510f4-f2e7-5795-8cfb-2a4206fa7254",
      "function_type": "capital",
      "place_name": "Nicaea",
      "macroregion_code": "west-asia",
      "subregion_code": "anatolia",
      "source_refs": [
        {
          "source_id": "044aaa9d-e264-5449-bbe4-e380c3f02220",
          "locator": "1911 Encyclopaedia Britannica: Nicaea"
        }
      ]
    },
    {
      "place_id": "2a249a61-de85-5b88-beaa-ab67a63af684",
      "polity_id": "28448862-277d-4738-9fb4-7f51a9e4c03a",
      "function_type": "capital",
      "place_name": "Ankara",
      "macroregion_code": "west-asia",
      "subregion_code": "anatolia",
      "source_refs": [
        {
          "source_id": "c3af4db8-6c27-51da-af04-5f562cbd5cc2",
          "locator": "Atatürk Ansiklopedisi: Ankara’nın Başkent Oluşu"
        }
      ]
    },
    {
      "place_id": "dd4811ef-44a5-5739-b09e-b1c4852b26e1",
      "polity_id": "2f6e890f-1704-5c76-aa94-f18d7f905e06",
      "function_type": "capital",
      "place_name": "Pella",
      "macroregion_code": "europe",
      "subregion_code": "balkans",
      "source_refs": [
        {
          "source_id": "01bff9e2-4a89-5056-a9e5-9e2b0574367c",
          "locator": "Hellenic Ministry of Culture and Sports, Odysseus: Pella"
        },
        {
          "source_id": "47fc9701-c079-5a5a-9360-90e059d4ca97",
          "locator": "Hellenic Ministry of Culture, Cultural Egnatia: Pella"
        }
      ]
    },
    {
      "place_id": "f1c62e8f-86ae-5833-b6d9-9a426e027d6e",
      "polity_id": "3b8f7efc-40ae-5a33-8956-e9e852fbede4",
      "function_type": "capital",
      "place_name": "Rio de Janeiro",
      "macroregion_code": "americas",
      "subregion_code": "south-america",
      "source_refs": [
        {
          "source_id": "38e7f5dc-b0d9-5a54-acd3-5159075e1c6b",
          "locator": "Governo do Brasil: Linha do Tempo da Independência"
        }
      ]
    },
    {
      "place_id": "d36994cd-c9d0-5fcf-a215-0fec2b2242ba",
      "polity_id": "5d9a6186-bbe6-5d1a-ba93-02190ae4c417",
      "function_type": "capital",
      "place_name": "Constantinople",
      "macroregion_code": "europe",
      "subregion_code": "balkans",
      "source_refs": [
        {
          "source_id": "2781d1ec-bf75-5045-bf99-3f7cdc919d0d",
          "locator": "1911 Encyclopaedia Britannica: Constantinople"
        }
      ]
    },
    {
      "place_id": "823049a0-9d73-5191-a9c5-26a662697436",
      "polity_id": "5d9a6186-bbe6-5d1a-ba93-02190ae4c417",
      "function_type": "capital",
      "place_name": "Rome",
      "macroregion_code": "europe",
      "subregion_code": "italy",
      "source_refs": [
        {
          "source_id": "89243eda-1366-50cc-8b72-546766cf5b33",
          "locator": "1911 Encyclopaedia Britannica: Constantine (emperors)"
        }
      ]
    },
    {
      "place_id": "41539b95-1782-5c82-9578-afe8cecd1a83",
      "polity_id": "5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90",
      "function_type": "political_center",
      "place_name": "Rangoon",
      "macroregion_code": "southeast-asia",
      "subregion_code": "mainland-southeast-asia",
      "source_refs": [
        {
          "source_id": "c88cdd70-16eb-5c3c-881b-425a880029f9",
          "locator": "Government of India / IGNCA chronology: Bose civil and military headquarters moved to Burma in January 1944"
        },
        {
          "source_id": "d0516347-22db-5919-80aa-ca80fe33574f",
          "locator": "Odisha Review: headquarters of the Provisional Government, Indian Independence League and Supreme Command shifted from Singapore to Rangoon"
        }
      ]
    },
    {
      "place_id": "4792157c-99ac-5d72-84bc-99baeb217911",
      "polity_id": "5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90",
      "function_type": "political_center",
      "place_name": "Singapore",
      "macroregion_code": "southeast-asia",
      "subregion_code": "maritime-southeast-asia",
      "source_refs": [
        {
          "source_id": "25cfc76c-7993-5d82-987c-7d46352fb048",
          "locator": "Publications Division, Government of India: Builders of Modern India — Subhas Chandra Bose"
        },
        {
          "source_id": "677c16aa-8a6b-52a7-ab98-27ef7a3190d4",
          "locator": "Press Information Bureau, Government of India: Anniversary of the formation of Azad Hind Government (21 Oct 1943)"
        }
      ]
    },
    {
      "place_id": "4d5eb343-f0d9-521e-8dec-078cd2bcfbc2",
      "polity_id": "6539c314-ec29-42e0-a0c2-90991fb9ffd8",
      "function_type": "capital",
      "place_name": "Samarkand",
      "macroregion_code": "central-asia",
      "subregion_code": "western-central-asia",
      "source_refs": [
        {
          "source_id": "25dfe37e-1389-52de-a203-3231e5a9f106",
          "locator": "The Metropolitan Museum of Art: The Art of the Timurid Period (ca. 1370–1507)"
        }
      ]
    },
    {
      "place_id": "d2845992-4a4c-5a66-a209-18a0ca21ee7b",
      "polity_id": "68c83ef6-0023-5af9-a6e8-26ccf5b8e116",
      "function_type": "capital",
      "place_name": "Muscat",
      "macroregion_code": "west-asia",
      "subregion_code": "arabia",
      "source_refs": [
        {
          "source_id": "51851bcf-6c36-56b8-bf2b-808c9aaf4c7d",
          "locator": "National Museum of Oman: Architectural Heritage — Muscat"
        }
      ]
    },
    {
      "place_id": "877dcabe-21b2-5a8f-b7b1-43a29e47ea9a",
      "polity_id": "68c83ef6-0023-5af9-a6e8-26ccf5b8e116",
      "function_type": "capital",
      "place_name": "Stone Town, Zanzibar",
      "macroregion_code": "africa",
      "subregion_code": "east-africa",
      "source_refs": [
        {
          "source_id": "51851bcf-6c36-56b8-bf2b-808c9aaf4c7d",
          "locator": "National Museum of Oman: Architectural Heritage — Muscat"
        },
        {
          "source_id": "b8a51ecc-5091-51e2-97b6-cb24b4cd7d48",
          "locator": "Oman Ministry of Foreign Affairs: History"
        }
      ]
    },
    {
      "place_id": "f0bbb5ec-a47f-53ad-adf2-6d12e431a586",
      "polity_id": "6d1520e2-0aff-5063-b2b7-95eb86daf372",
      "function_type": "capital",
      "place_name": "Bursa",
      "macroregion_code": "west-asia",
      "subregion_code": "anatolia",
      "source_refs": [
        {
          "source_id": "69e4362a-3589-52b4-9a32-5b8e83710552",
          "locator": "Republic of Türkiye Bursa Governorship: Tarihçe"
        }
      ]
    },
    {
      "place_id": "d36994cd-c9d0-5fcf-a215-0fec2b2242ba",
      "polity_id": "6d1520e2-0aff-5063-b2b7-95eb86daf372",
      "function_type": "capital",
      "place_name": "Constantinople",
      "macroregion_code": "europe",
      "subregion_code": "balkans",
      "source_refs": [
        {
          "source_id": "2781d1ec-bf75-5045-bf99-3f7cdc919d0d",
          "locator": "1911 Encyclopaedia Britannica: Constantinople"
        }
      ]
    },
    {
      "place_id": "ae91bb0d-d164-521f-85b7-d96ceca4fa2a",
      "polity_id": "6d1520e2-0aff-5063-b2b7-95eb86daf372",
      "function_type": "capital",
      "place_name": "Edirne",
      "macroregion_code": "europe",
      "subregion_code": "balkans",
      "source_refs": [
        {
          "source_id": "0a3dc36b-9eb9-5536-ac23-5fe71cb9467b",
          "locator": "Türkiye Culture Portal: Edirne - Genel Bilgiler"
        }
      ]
    },
    {
      "place_id": "0f81f69e-4b34-58c6-b9a3-65b48e786d63",
      "polity_id": "6d1520e2-0aff-5063-b2b7-95eb86daf372",
      "function_type": "capital",
      "place_name": "Söğüt",
      "macroregion_code": "west-asia",
      "subregion_code": "anatolia",
      "source_refs": [
        {
          "source_id": "7a0280a6-71d0-5ae9-809c-9d0db9e1d181",
          "locator": "Republic of Türkiye Ministry of National Education, Söğüt District: İlçemiz - Söğüt"
        }
      ]
    },
    {
      "place_id": "889c7eb5-f72e-5297-9759-c8c2d193efeb",
      "polity_id": "a1697cdb-1085-545c-850e-1bbc25cdb61b",
      "function_type": "capital",
      "place_name": "Kufa",
      "macroregion_code": "west-asia",
      "subregion_code": "mesopotamia",
      "source_refs": [
        {
          "source_id": "9ed98162-dc7d-5a2f-89da-db4aac4694ae",
          "locator": "Encyclopaedia Iranica: Kufa — Ali (r. 656–61) chose Kufa as his capital"
        }
      ]
    },
    {
      "place_id": "e9c69c90-7572-5a69-ae63-19f5ac1946b1",
      "polity_id": "a1697cdb-1085-545c-850e-1bbc25cdb61b",
      "function_type": "capital",
      "place_name": "Medina",
      "macroregion_code": "west-asia",
      "subregion_code": "arabia",
      "source_refs": [
        {
          "source_id": "82565127-eb9c-5da2-a1c4-8fcd738ecf87",
          "locator": "Cambridge University Press: Rituals of Islamic Monarchy — the conquest society c. 628–c. 660"
        }
      ]
    },
    {
      "place_id": "64b8f4c4-3d8e-58ad-9ba4-4b98fb49ef0f",
      "polity_id": "d54c540c-f3fb-5d05-9dc0-26af4ee9815a",
      "function_type": "imperial_court_core",
      "place_name": "Kublai court in North China (Shangdu–Dadu)",
      "macroregion_code": "east-asia",
      "subregion_code": "china",
      "source_refs": [
        {
          "source_id": "37f50f8f-b242-5dfe-aeeb-4230d9c31670",
          "locator": "Metropolitan Museum of Art: China, 1000–1400 A.D. chronology"
        },
        {
          "source_id": "91d307b2-a4e3-5795-9f37-c0a2fabee2c7",
          "locator": "UNESCO World Heritage Centre: Site of Xanadu"
        },
        {
          "source_id": "ea373bc1-66af-5950-a4c8-c31188c0f320",
          "locator": "Cambridge History of the Mongol Empire: Mongolia in the Mongol Empire"
        }
      ]
    },
    {
      "place_id": "e490f5ab-d605-56b5-842f-0916cbb7bb28",
      "polity_id": "d54c540c-f3fb-5d05-9dc0-26af4ee9815a",
      "function_type": "imperial_court_core",
      "place_name": "Mongolian imperial court core (Avarga–Karakorum)",
      "macroregion_code": "central-asia",
      "subregion_code": "eastern-central-asia-steppe",
      "source_refs": [
        {
          "source_id": "02e15cce-9ea1-5b3c-a3e1-c11842dfd8c9",
          "locator": "Cambridge Modern Asian Studies: The cosmopolitanism of Karakorum, capital of the Mongol empire in Mongolia"
        },
        {
          "source_id": "51e16f5a-ff7f-5d3c-b03e-034f9a1ef04d",
          "locator": "Cambridge Antiquity: Mapping Karakorum, the capital of the Mongol Empire"
        },
        {
          "source_id": "82cfad27-e6e5-57ed-97c7-28ae56bb5072",
          "locator": "UNESCO World Heritage Centre: Archaeological Site at Khuduu Aral and Surrounding Cultural Landscape"
        }
      ]
    },
    {
      "place_id": "53708ee8-020e-5efa-89f6-85d97d26cd82",
      "polity_id": "e3da3007-529a-40ec-9934-7b70dfd11cb7",
      "function_type": "capital",
      "place_name": "Cairo",
      "macroregion_code": "africa",
      "subregion_code": "nile-valley",
      "source_refs": [
        {
          "source_id": "e91f57ec-9c46-594b-859b-4a14c2af99ba",
          "locator": "Getty Thesaurus of Geographic Names: Mamluk Sultanate (TGN 6003667)"
        }
      ]
    }
  ].map((binding) => Object.freeze({
    ...binding,
    source_refs: Object.freeze(binding.source_refs.map((ref) => Object.freeze({ ...ref })))
  })));

  const REVIEWED_BINDING_BY_SIGNATURE = new Map(REVIEWED_PLACE_BINDINGS.map((binding) => [bindingSignature(binding), binding]));

  function reviewedPlaceBindingForFunction(polityId, fn) {
    return REVIEWED_BINDING_BY_SIGNATURE.get(bindingSignature({
      place_id: fn?.place_id,
      polity_id: polityId,
      function_type: fn?.function_type,
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
      place_id: segment?.place_id,
      function_type: segment?.place_function_type,
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
      source_refs: normalizedHistoricalRefs(fn?.source_refs)
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
      historical_source_refs: text(segment?.placement_basis) === "polity_place_function" ? normalizedHistoricalRefs(segment?.source_refs) : normalizedRefs(segment?.source_refs),
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
        display_source_refs: normalizedHistoricalRefs(binding.source_refs)
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
        display_source_refs: normalizedHistoricalRefs(binding.source_refs),
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