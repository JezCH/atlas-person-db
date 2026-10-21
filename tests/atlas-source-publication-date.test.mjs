import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizeBibliographicSource,createSource}=require('../server/atlas-source-service.js');
const source={title:'Reviewed source',source_key:'reviewed:publication-date'};

test('Source rejects impossible publication dates before any database work',async()=>{
  for(const publication_date of ['2023-02-29','1900-02-29','2024-04-31','2024-00-01','2024-13-01','2024-01-00','2024-01-32','0000-01-01']){
    assert.throws(()=>normalizeBibliographicSource({...source,publication_date}),/SOURCE_PUBLICATION_DATE_INVALID/,publication_date);
    let queries=0;
    await assert.rejects(()=>createSource({async query(){queries++;throw Error('DATABASE_MUST_NOT_BE_REACHED');}},{...source,publication_date}),/SOURCE_PUBLICATION_DATE_INVALID/,publication_date);
    assert.equal(queries,0);
  }
});

test('Source preserves valid leap dates and early CE years without Date year coercion',()=>{
  for(const publication_date of ['2024-02-29','2000-02-29','1900-02-28','2024-04-30','0001-01-01','0004-02-29','0099-12-31']){
    assert.equal(normalizeBibliographicSource({...source,publication_date}).publication_date,publication_date);
  }
});

test('Source preserves optional dates and independent BCE publication years',()=>{
  for(const publication_date of [undefined,null,'']){
    const result=normalizeBibliographicSource({...source,publication_date,publication_year:-44});
    assert.equal(result.publication_date,null);
    assert.equal(result.publication_year,-44);
  }
  for(const publication_date of ['2024/02/29','2024-2-29','not a date'])
    assert.throws(()=>normalizeBibliographicSource({...source,publication_date}),/SOURCE_PUBLICATION_DATE_INVALID/);
});
