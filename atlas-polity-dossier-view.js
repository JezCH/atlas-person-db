((root,factory)=>{
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.ATLAS_POLITY_DOSSIER_VIEW=api;
})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  "use strict";

  function text(value){ return value==null?"":String(value).trim(); }
  function yearValue(value){ return Number.isInteger(value)?value:null; }
  function formatYear(value){
    if(!Number.isInteger(value)) return "미상";
    if(value<0) return "기원전 "+Math.abs(value);
    if(value>0) return String(value);
    return "0";
  }
  function activitySpan(activity){
    const start=yearValue(activity?.activity_start);
    const end=yearValue(activity?.activity_end);
    const startLabel=start==null?"시작 미상":formatYear(start);
    const endLabel=activity?.chronology_status==="ongoing"?"현재":end==null?"종료 미상":formatYear(end);
    return startLabel+"–"+endLabel;
  }
  function observedSpan(rows){
    const starts=rows.map((row)=>yearValue(row?.activity_start)).filter((value)=>value!=null);
    const ends=rows.map((row)=>yearValue(row?.activity_end)).filter((value)=>value!=null);
    const ongoing=rows.some((row)=>row?.chronology_status==="ongoing");
    const start=starts.length?Math.min(...starts):null;
    const end=ends.length?Math.max(...ends):null;
    return {
      start,
      end,
      ongoing,
      label:(start==null?"시작 미상":formatYear(start))+"–"+(ongoing?"현재":end==null?"종료 미상":formatYear(end))
    };
  }

  function groupPeople(polity){
    const byPerson=new Map();
    for(const activity of polity?.activities||[]){
      const personId=text(activity?.person_id);
      if(!personId) continue;
      if(!byPerson.has(personId)){
        byPerson.set(personId,{
          person_id:personId,
          display_name:text(activity?.person_display_name||activity?.person_name_ko||activity?.person_name_en||personId),
          activities:[]
        });
      }
      byPerson.get(personId).activities.push(activity);
    }
    return Object.freeze([...byPerson.values()].map((row)=>{
      const activities=row.activities.slice().sort((left,right)=>{
        const a=yearValue(left?.activity_start);
        const b=yearValue(right?.activity_start);
        if(a==null&&b!=null) return 1;
        if(a!=null&&b==null) return -1;
        if(a!=null&&b!=null&&a!==b) return a-b;
        return text(left?.id).localeCompare(text(right?.id));
      });
      return Object.freeze({
        person_id:row.person_id,
        display_name:row.display_name,
        activity_count:activities.length,
        observed_span:Object.freeze(observedSpan(activities)),
        activities:Object.freeze(activities)
      });
    }).sort((left,right)=>
      (left.observed_span.start??Number.POSITIVE_INFINITY)-(right.observed_span.start??Number.POSITIVE_INFINITY)
      || left.display_name.localeCompare(right.display_name,"ko")
      || left.person_id.localeCompare(right.person_id)
    ));
  }

  function observedDesignations(polity){
    const groups=new Map();
    for(const activity of polity?.activities||[]){
      const ko=text(activity?.polity_designation_name_ko);
      const en=text(activity?.polity_designation_name_en);
      if(!ko&&!en) continue;
      const key=(ko||en).normalize("NFKC").toLocaleLowerCase("und");
      if(!groups.has(key)) groups.set(key,{display_name:ko||en,canonical_name_en:en||null,activities:[],person_ids:new Set()});
      const group=groups.get(key);
      group.activities.push(activity);
      if(activity?.person_id) group.person_ids.add(String(activity.person_id));
    }
    return Object.freeze([...groups.values()].map((group)=>Object.freeze({
      display_name:group.display_name,
      canonical_name_en:group.canonical_name_en,
      activity_count:group.activities.length,
      person_count:group.person_ids.size,
      observed_span:Object.freeze(observedSpan(group.activities))
    })).sort((left,right)=>
      (left.observed_span.start??Number.POSITIVE_INFINITY)-(right.observed_span.start??Number.POSITIVE_INFINITY)
      || left.display_name.localeCompare(right.display_name,"ko")
    ));
  }

  function dossierForPolity(polity){
    const activities=Array.isArray(polity?.activities)?polity.activities:[];
    const people=groupPeople(polity);
    const designations=observedDesignations(polity);
    const unresolved=Number(polity?.unresolved_activity_count||0);
    const ongoing=activities.filter((row)=>row?.chronology_status==="ongoing").length;
    return Object.freeze({
      identity:Object.freeze({
        id:text(polity?.id),
        display_name:text(polity?.display_name||polity?.preferred_name_ko||polity?.canonical_name_en||polity?.id),
        canonical_name_en:text(polity?.canonical_name_en)||null,
        canonical_key:text(polity?.canonical_key)||null,
        polity_type:text(polity?.polity_type)||null,
        historicity:text(polity?.historicity)||null,
        names:Object.freeze(Array.isArray(polity?.names)?polity.names.slice():[])
      }),
      observed_span:Object.freeze(observedSpan(activities)),
      activity_count:activities.length,
      person_count:people.length,
      ongoing_activity_count:ongoing,
      unresolved_activity_count:unresolved,
      designations,
      people
    });
  }

  function createRenderer({escapeHtml}={}){
    if(typeof escapeHtml!=="function") throw new Error("ATLAS_POLITY_DOSSIER_RENDERER_DEPENDENCY_MISSING");

    function value(value,fallback="—"){
      return value?escapeHtml(value):fallback;
    }

    function namesHtml(names){
      if(!names.length) return '<p class="polity-dossier-empty">등록 명칭 없음</p>';
      return '<div class="polity-dossier-name-list">'+names.map((row)=>{
        const meta=[text(row?.locale),text(row?.name_type),row?.is_preferred===true?"preferred":""].filter(Boolean).join(" · ");
        return '<span><b>'+escapeHtml(row?.name||"")+'</b>'+(meta?'<small>'+escapeHtml(meta)+'</small>':"")+'</span>';
      }).join("")+'</div>';
    }

    function designationsHtml(rows){
      if(!rows.length) return '<p class="polity-dossier-empty">Activity에서 관측된 시대 명칭 없음</p>';
      return '<div class="polity-dossier-designations">'+rows.map((row)=>
        '<article><div><strong>'+escapeHtml(row.display_name)+'</strong>'+
          (row.canonical_name_en&&row.canonical_name_en!==row.display_name?'<small>'+escapeHtml(row.canonical_name_en)+'</small>':"")+
        '</div><span>'+escapeHtml(row.observed_span.label)+'</span><span>'+row.person_count+'명 · '+row.activity_count+' Activity</span></article>'
      ).join("")+'</div>';
    }

    function activityMeaning(activity){
      return [
        text(activity?.relation_code),
        text(activity?.role_name||activity?.role_code),
        text(activity?.period_basis),
        text(activity?.confidence)
      ].filter(Boolean).join(" · ");
    }

    function peopleHtml(rows){
      if(!rows.length) return '<p class="polity-dossier-empty">연결 인물 없음</p>';
      return '<div class="polity-dossier-people">'+rows.map((row)=>
        '<article class="polity-dossier-person">'+
          '<header><button type="button" data-polity-person-id="'+escapeHtml(row.person_id)+'"><strong>'+escapeHtml(row.display_name)+'</strong><small>'+escapeHtml(row.person_id)+'</small></button>'+
          '<span>'+escapeHtml(row.observed_span.label)+' · '+row.activity_count+' Activity</span></header>'+
          '<ul>'+row.activities.map((activity)=>{
            const designation=text(activity?.polity_designation_name_ko||activity?.polity_designation_name_en);
            const meaning=activityMeaning(activity);
            return '<li><b>'+escapeHtml(activitySpan(activity))+'</b><span>'+escapeHtml([designation,meaning].filter(Boolean).join(" · ")||"Activity 의미 미기록")+'</span></li>';
          }).join("")+'</ul>'+
        '</article>'
      ).join("")+'</div>';
    }

    function dossierHtml(polity){
      const dossier=dossierForPolity(polity);
      const id=dossier.identity;
      return '<div class="polity-dossier">'+
        '<section class="polity-dossier-overview" aria-label="정치체 관측 범위와 데이터 상태">'+
          '<div><small>관측 활동 범위</small><strong>'+escapeHtml(dossier.observed_span.label)+'</strong></div>'+
          '<div><small>연결 인물</small><strong>'+dossier.person_count+'</strong></div>'+
          '<div><small>Activity</small><strong>'+dossier.activity_count+'</strong></div>'+
          '<div><small>연대 미해결</small><strong>'+dossier.unresolved_activity_count+'</strong></div>'+
        '</section>'+
        '<section class="polity-dossier-section"><div class="polity-dossier-section-head"><div><small>IDENTITY</small><h4>정치체 식별 정보</h4></div></div>'+
          '<div class="polity-dossier-identity">'+
            '<span><small>canonical key</small><code>'+value(id.canonical_key)+'</code></span>'+
            '<span><small>type</small><b>'+value(id.polity_type)+'</b></span>'+
            '<span><small>historicity</small><b>'+value(id.historicity)+'</b></span>'+
            '<span><small>UUID</small><code>'+value(id.id)+'</code></span>'+
          '</div>'+namesHtml(id.names)+
        '</section>'+
        '<section class="polity-dossier-section"><div class="polity-dossier-section-head"><div><small>TEMPORAL DESIGNATION</small><h4>Activity에서 관측된 시대 명칭</h4></div><p>표시 범위는 명칭 자체의 존속기간이 아니라 해당 명칭으로 연결된 Activity의 관측 범위입니다.</p></div>'+
          designationsHtml(dossier.designations)+
        '</section>'+
        '<section class="polity-dossier-section"><div class="polity-dossier-section-head"><div><small>PEOPLE</small><h4>연결 인물</h4></div><p>동일 인물의 여러 Activity를 한 묶음으로 표시합니다.</p></div>'+
          peopleHtml(dossier.people)+
        '</section>'+
      '</div>';
    }

    return Object.freeze({dossierHtml});
  }

  return Object.freeze({
    formatYear,
    activitySpan,
    observedSpan,
    groupPeople,
    observedDesignations,
    dossierForPolity,
    createRenderer
  });
});
