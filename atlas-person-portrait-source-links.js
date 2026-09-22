(() => {
  "use strict";

  function normalizeLink(row) {
    const sourceId=String(row?.source_id || "").trim();
    const evidenceRole=String(row?.evidence_role || "").trim();
    if (!sourceId || !evidenceRole) return null;
    return Object.freeze({ source_id:sourceId, evidence_role:evidenceRole });
  }

  function preserve(portrait) {
    if (!Array.isArray(portrait?.sources)) return [];
    return portrait.sources
      .map(normalizeLink)
      .filter(Boolean)
      .map((row)=>({ source_id:row.source_id, evidence_role:row.evidence_role }));
  }

  function add(links,{ sourceId,evidenceRole }={}) {
    const next=Array.isArray(links) ? links.map((row)=>({ ...row })) : [];
    const normalized=normalizeLink({ source_id:sourceId, evidence_role:evidenceRole });
    if (!normalized) throw new Error("PORTRAIT_SOURCE_LINK_ADD_INVALID");
    next.push({ source_id:normalized.source_id, evidence_role:normalized.evidence_role });
    return next;
  }

  function updateRole(links,{ sourceId,originalRole,evidenceRole }={}) {
    const id=String(sourceId || "").trim();
    const original=String(originalRole || "").trim();
    const nextRole=String(evidenceRole || "").trim();
    if (!id || !original || !nextRole) throw new Error("PORTRAIT_SOURCE_LINK_UPDATE_INVALID");
    return (Array.isArray(links) ? links : []).map((row)=>{
      const current=normalizeLink(row);
      if (!current) return null;
      return current.source_id === id && current.evidence_role === original
        ? { source_id:id, evidence_role:nextRole }
        : { source_id:current.source_id, evidence_role:current.evidence_role };
    }).filter(Boolean);
  }

  function remove(links,{ sourceId,evidenceRole }={}) {
    const id=String(sourceId || "").trim();
    const role=String(evidenceRole || "").trim();
    if (!id || !role) throw new Error("PORTRAIT_SOURCE_LINK_REMOVE_INVALID");
    return (Array.isArray(links) ? links : [])
      .map(normalizeLink)
      .filter(Boolean)
      .filter((row)=>!(row.source_id === id && row.evidence_role === role))
      .map((row)=>({ source_id:row.source_id, evidence_role:row.evidence_role }));
  }

  window.ATLAS_PERSON_PORTRAIT_SOURCE_LINKS = Object.freeze({
    normalizeLink,
    preserve,
    add,
    updateRole,
    remove
  });
})();
