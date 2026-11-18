/* Human-admin-only waitlist intake; no Person authoring and no automatic request. */
(() => {
  "use strict";
  const preset = [
  {
    "candidate_id": "user-selected-pending14-20261019-henri-matisse",
    "name": "Henri Matisse",
    "display_name_ko": "앙리 마티스",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-anton-chekhov",
    "name": "Anton Chekhov",
    "display_name_ko": "안톤 체호프",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-gustave-flaubert",
    "name": "Gustave Flaubert",
    "display_name_ko": "귀스타브 플로베르",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-peter-paul-rubens",
    "name": "Peter Paul Rubens",
    "display_name_ko": "페테르 파울 루벤스",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-j-m-w-turner",
    "name": "J. M. W. Turner",
    "display_name_ko": "윌리엄 터너",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-auguste-rodin",
    "name": "Auguste Rodin",
    "display_name_ko": "오귀스트 로댕",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-arnold-schoenberg",
    "name": "Arnold Schoenberg",
    "display_name_ko": "아르놀트 쇤베르크",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-bela-bartok",
    "name": "Bela Bartok",
    "display_name_ko": "벨러 버르토크",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-giovanni-pierluigi-da-palestrina",
    "name": "Giovanni Pierluigi da Palestrina",
    "display_name_ko": "팔레스트리나",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-charlie-parker",
    "name": "Charlie Parker",
    "display_name_ko": "찰리 파커",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-john-coltrane",
    "name": "John Coltrane",
    "display_name_ko": "존 콜트레인",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-edmund-husserl",
    "name": "Edmund Husserl",
    "display_name_ko": "에드문트 후설",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-stanley-kubrick",
    "name": "Stanley Kubrick",
    "display_name_ko": "스탠리 큐브릭",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-selected-pending14-20261019-ingmar-bergman",
    "name": "Ingmar Bergman",
    "display_name_ko": "잉마르 베리만",
    "source_issue": 2545
  },
  {
    "candidate_id": "user-writers-a-20261026-kurt-vonnegut",
    "name": "Kurt Vonnegut",
    "display_name_ko": "커트 보니것",
    "lookup_names": [
      "Kurt Vonnegut",
      "커트 보니것"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-goncalves-dias",
    "name": "Goncalves Dias",
    "display_name_ko": "곤사우베스 지아스",
    "lookup_names": [
      "Goncalves Dias",
      "곤사우베스 지아스"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-jm-synge",
    "name": "J. M. Synge",
    "display_name_ko": "J. M. 싱",
    "lookup_names": [
      "J. M. Synge",
      "J. M. 싱"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-richard-brinsley-sheridan",
    "name": "Richard Brinsley Sheridan",
    "display_name_ko": "리처드 브린즐리 셰리든",
    "lookup_names": [
      "Richard Brinsley Sheridan",
      "리처드 브린즐리 셰리든"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-dylan-thomas",
    "name": "Dylan Thomas",
    "display_name_ko": "딜런 토머스",
    "lookup_names": [
      "Dylan Thomas",
      "딜런 토머스"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-karen-blixen",
    "name": "Karen Blixen",
    "display_name_ko": "카렌 블릭센",
    "lookup_names": [
      "Karen Blixen",
      "카렌 블릭센"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-george-chapman",
    "name": "George Chapman",
    "display_name_ko": "조지 채프먼",
    "lookup_names": [
      "George Chapman",
      "조지 채프먼"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-john-webster",
    "name": "John Webster",
    "display_name_ko": "존 웹스터",
    "lookup_names": [
      "John Webster",
      "존 웹스터"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-thomas-middleton",
    "name": "Thomas Middleton",
    "display_name_ko": "토머스 미들턴",
    "lookup_names": [
      "Thomas Middleton",
      "토머스 미들턴"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-noel-coward",
    "name": "Noël Coward",
    "display_name_ko": "노엘 카워드",
    "lookup_names": [
      "Noël Coward",
      "노엘 카워드"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-terence-rattigan",
    "name": "Terence Rattigan",
    "display_name_ko": "테런스 래티건",
    "lookup_names": [
      "Terence Rattigan",
      "테런스 래티건"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-constantine-cavafy",
    "name": "Constantine Cavafy",
    "display_name_ko": "콘스탄티노스 카바피스",
    "lookup_names": [
      "Constantine Cavafy",
      "콘스탄티노스 카바피스"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-nikos-kazantzakis",
    "name": "Nikos Kazantzakis",
    "display_name_ko": "니코스 카잔차키스",
    "lookup_names": [
      "Nikos Kazantzakis",
      "니코스 카잔차키스"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-sadegh-hedayat",
    "name": "Sadegh Hedayat",
    "display_name_ko": "사데크 헤다야트",
    "lookup_names": [
      "Sadegh Hedayat",
      "사데크 헤다야트"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  },
  {
    "candidate_id": "user-writers-a-20261026-antonio-machado",
    "name": "Antonio Machado",
    "display_name_ko": "안토니오 마차도",
    "lookup_names": [
      "Antonio Machado",
      "안토니오 마차도"
    ],
    "representative_domain": "culture",
    "priority": "A",
    "source_issue": 2619
  }
];
  const input=document.getElementById("waitlistJson");
  const load=document.getElementById("waitlistPreset");
  const preview=document.getElementById("waitlistPreview");
  const apply=document.getElementById("waitlistApply");
  const output=document.getElementById("waitlistResult");
  if(!input||!load||!preview||!apply||!output) return;
  let approved=null;
  let busy=false;
  function invalidate(){approved=null;apply.disabled=true;}
  input.addEventListener("input",invalidate);
  load.addEventListener("click",()=>{if(busy)return;input.value=JSON.stringify(preset,null,2);invalidate();output.textContent="선택된 29명 대기열 목록. 먼저 사전검증하세요.";});
  async function run(commit){
    if(busy)return;
    if(commit && (!approved || input.value!==approved.raw)) {invalidate();return;}
    const raw=input.value;
    const token=approved?.token;
    invalidate();
    busy=true;preview.disabled=true;load.disabled=true;input.disabled=true;
    output.textContent=commit?"대기열 반영 중…":"읽기 전용 사전검증 중…";
    try {
      const response=await fetch("/api/atlas-authoring?__atlas_authoring_surface=reviewed-candidate",{
        method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({operation:"admit_waitlist",items:JSON.parse(raw),commit,...(commit?{expected_token:token}:{})})
      });
      const result=await response.json();
      if(!response.ok||!result.ok)throw Error(result.code||"HTTP "+response.status);
      const names=(result.plan||[]).map(r=>r.name+" — "+r.status);
      output.textContent=[commit?"대기열 신규 반영 "+result.inserted.length+"건":"신규 반영 가능 "+result.ready_count+"건",...names,"기존 후보 및 Person은 수정하지 않습니다."].join("\n");
      if(!commit && result.ready_count>0){approved={raw,token:result.preview_token};apply.disabled=false;}
    } catch(error) { output.textContent="실패: "+error.message+" (다시 사전검증 필요)"; }
    finally {busy=false;preview.disabled=false;load.disabled=false;input.disabled=false;}
  }
  preview.addEventListener("click",()=>run(false));
  apply.addEventListener("click",()=>{if(approved&&window.confirm("사전검증을 통과한 신규 대기 후보만 추가합니다. 인물 등록 승인은 하지 않습니다. 계속할까요?"))run(true);});
})();
