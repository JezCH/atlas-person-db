"use strict";

const { createPostgresClient }=require("../server/atlas-postgres-client.js");
const { createUnit5ReconciliationHandler }=require("../server/atlas-core-unit5-reconciliation-handler.js");

module.exports=createUnit5ReconciliationHandler({clientFactory:createPostgresClient});
