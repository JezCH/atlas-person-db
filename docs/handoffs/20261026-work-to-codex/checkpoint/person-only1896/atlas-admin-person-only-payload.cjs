"use strict";
// Draft adapter: caller supplies the reviewed canonical timeline disposition.
// No network or authoring apply is performed here.
function personOnlyPayload(activityPayload, timelineDisposition) {
  if (!timelineDisposition || timelineDisposition.disposition === 'timeline') {
    throw new Error('NON_TIMELINE_REVIEW_REQUIRED');
  }
  const domain = activityPayload?.person?.representative_domain;
  if (!domain) throw new Error('REPRESENTATIVE_DOMAIN_REQUIRED');
  return {
    schema: 'atlas-human-person-authoring/v1',
    request_id: activityPayload.request_id,
    person: { ...activityPayload.person },
    representative_domain: domain,
    timeline_disposition: { ...timelineDisposition },
    sources: activityPayload.sources,
    external_references: activityPayload.external_references
  };
}
module.exports = { personOnlyPayload };
