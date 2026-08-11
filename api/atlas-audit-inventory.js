"use strict";

const { createAuditInventoryHandler } = require("../server/atlas-audit-inventory-handler.js");

const handler = createAuditInventoryHandler();

module.exports = handler;
module.exports.createAuditInventoryHandler = createAuditInventoryHandler;
