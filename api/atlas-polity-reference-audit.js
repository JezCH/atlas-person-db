"use strict";

const { createPolityReferenceAuditHandler } = require("../server/atlas-polity-reference-audit-handler.js");

module.exports = createPolityReferenceAuditHandler();
module.exports.createPolityReferenceAuditHandler = createPolityReferenceAuditHandler;
