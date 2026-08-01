# ATLAS Person × Politic Database

인물과 관련 Politic, 활동기간을 온라인 표로 관리하는 최소 웹앱입니다.

## 포함 기능

- 인물 기록 추가·수정·삭제
- Politic → 활동 시작연도 → 종료연도 → 인물명 자동 정렬
- 인물·Politic·역할 검색
- Politic 필터
- Excel 가져오기·내보내기
- BCE 연도 지원: 기원전 연도는 음수로 입력 (`-44` = 기원전 44년)
- Supabase 온라인 저장

## 1. Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor를 열고 `schema.sql` 전체를 실행합니다.
3. Project Settings → API에서 다음 값을 확인합니다.
   - Project URL
   - anon public key
4. `config.js`를 열고 두 값을 입력합니다.

```js
window.ATLAS_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "ey..."
};
```

> 주의: 현재 SQL 정책은 개인용 초기 버전으로, 웹주소를 아는 사람은 데이터를 수정할 수 있습니다. 민감한 데이터에는 사용하지 마십시오. 추후 로그인 기능을 붙이면 계정 기반 정책으로 교체할 수 있습니다.

## 2. GitHub 업로드

새 저장소를 만든 뒤 이 폴더의 모든 파일을 업로드합니다.

## 3. Vercel 배포

1. Vercel에서 `Add New Project`
2. GitHub 저장소 선택
3. Framework Preset: `Other`
4. Build Command: 비워둠
5. Output Directory: 비워둠
6. Deploy

별도의 npm 설치나 빌드가 필요 없습니다.

## 엑셀 열 이름

가져오기용 첫 번째 시트는 다음 열을 인식합니다.

- 인물
- Politic
- 활동 시작연도
- 활동 종료연도
- 역할
- 기간 기준
- 비고

## 보안 개선 예정

- Supabase Auth 로그인
- 사용자별 RLS 정책
- 관리자 전용 쓰기 권한
