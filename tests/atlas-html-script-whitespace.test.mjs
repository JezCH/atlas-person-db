import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mainHtml=readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("Main script elements are separated only by real HTML whitespace",()=>{
  // A literal backslash-n sequence is a visible DOM text node, not a line break.
  const separators=[...mainHtml.matchAll(/<\/script>([\s\S]*?)(?=<script\b)/gi)];
  assert.ok(separators.length>0,"Expected adjacent script elements in the main HTML shell");
  for(const [index,match] of separators.entries()){
    assert.match(match[1],/^\s*$/,`Unexpected text between main scripts at boundary ${index+1}`);
  }
});
