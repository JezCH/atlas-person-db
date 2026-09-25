((root,factory)=>{
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.ATLAS_ENTITY_ROUTE=api;
})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  "use strict";

  const DOMAIN_ORDER=Object.freeze(["dashboard","persons","spacetime","polities","places","events","sources","geometry"]);
  const ENTITY_BY_DOMAIN=Object.freeze({
    persons:"person",
    polities:"polity"
  });
  const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function text(value){ return value==null?"":String(value).trim(); }
  function normalizeDomain(value){
    const domain=text(value).replace(/^atlas-/,"");
    return DOMAIN_ORDER.includes(domain)?domain:"persons";
  }
  function normalizeUuid(value){
    const id=text(value).toLowerCase();
    return UUID_PATTERN.test(id)?id:null;
  }
  function domainHash(domain){
    return `#atlas-${normalizeDomain(domain)}`;
  }
  function entityHash(domain,entityType,entityId){
    const normalizedDomain=normalizeDomain(domain);
    const expectedType=ENTITY_BY_DOMAIN[normalizedDomain];
    const id=normalizeUuid(entityId);
    if(!expectedType||text(entityType)!==expectedType||!id) return domainHash(normalizedDomain);
    return `${domainHash(normalizedDomain)}/${expectedType}/${id}`;
  }
  function parseHash(hash){
    const raw=text(hash).replace(/^#/,"").replace(/^atlas-/,"");
    const segments=raw.split("/").filter(Boolean);
    const domain=normalizeDomain(segments[0]||"persons");
    const expectedType=ENTITY_BY_DOMAIN[domain]||null;
    const requestedType=text(segments[1]);
    const entityId=normalizeUuid(segments[2]);
    const validEntity=Boolean(expectedType&&requestedType===expectedType&&entityId&&segments.length===3);
    return Object.freeze({
      domain,
      entity_type:validEntity?expectedType:null,
      entity_id:validEntity?entityId:null,
      canonical_hash:validEntity?entityHash(domain,expectedType,entityId):domainHash(domain)
    });
  }

  return Object.freeze({
    DOMAIN_ORDER,
    ENTITY_BY_DOMAIN,
    UUID_PATTERN,
    normalizeDomain,
    normalizeUuid,
    domainHash,
    entityHash,
    parseHash
  });
});
