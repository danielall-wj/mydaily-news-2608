# 오늘의 트렌드 뉴스

분야별 RSS 뉴스를 2시간마다 자동으로 모아 웹 페이지로 보여주고, 하루 한 번 분야별 헤드라인을
Discord로 보내주는 개인용 뉴스 브리핑 서비스입니다.

- **웹 페이지**: https://mynews-2608-frontieralls-projects.vercel.app
  (Vercel Authentication이 켜져 있어 로그인해야 열립니다 — 아래 6절 참고)
- **저장소**: https://github.com/danielall-wj/mydaily-news-2608 (public, 2026-10-27 `frontierall`에서 이전)
- **Discord**: 매일 21:00 KST, **매일뉴스브리핑** 채널로 분야별 브리핑 전송

---

## 1. 이 프로젝트가 하는 일

뉴스를 보려고 매체 여러 곳을 돌아다니는 대신, **하루에 한 번 브리핑을 받고 필요할 때 웹에서 훑어보는 것**이
목표입니다. 그래서 세 가지 경로로 같은 데이터를 씁니다.

| 경로 | 언제 | 무엇을 |
| --- | --- | --- |
| 수집 | 2시간마다 (`0 */2 * * *`) | 16개 RSS 피드에서 기사를 모아 저장소에 커밋 |
| 웹 | 상시 | 최근 **2일치**를 분야별로 정리 + 검색 · 즐겨찾기 · 급상승 키워드 |
| Discord | 매일 21:00 KST (`0 12 * * *` UTC) | 급상승 키워드 + 분야별 기사 3건씩 웹훅 전송 |

읽지 않고 지나가도 기사는 저장소에 그대로 남습니다. 데이터가 파일로 커밋되기 때문에
"어제 그 기사 뭐였지"를 `git log`나 `data/news/`에서 되짚을 수 있습니다.

---

## 2. 지금 수집하고 있는 것

10개 분야, 총 16개 피드입니다. `src/lib/categories.ts` 한 곳에서 관리합니다.

| 분야 | 피드 | 비고 |
| --- | --- | --- |
| 🤖 AI | AI타임스 전체, 전자신문 `04046`, 전자신문 `04`(AI·SW) | 직접 소스 |
| 💻 IT | 전자신문 `03`(통신), 한국경제 IT, 긱뉴스(news.hada.io) | 직접 소스 |
| 💰 경제 | 한국경제 경제 · 금융, 전자신문 `02`(경제) | 직접 소스 |
| 🏛️ 정치 | Google News `NATION` | 매체 혼합 |
| 🚨 사회 | 한국경제 사회 | 직접 소스 · **피드 1개** |
| 🌍 세계 | Google News `WORLD` | 매체 혼합 |
| 🔬 과학 | Google News `SCIENCE` | 매체 혼합 |
| 🏥 건강 | Google News `HEALTH` | 매체 혼합 |
| ⚽ 스포츠 | Google News `SPORTS` | 매체 혼합 |
| 🎬 연예 | Google News `ENTERTAINMENT` | 매체 혼합 |

**직접 소스 vs Google News의 차이**는 출처 표기 방식입니다. 직접 지정한 피드는 `source` 값을
그대로 쓰고, Google News 피드는 제목이 `헤드라인 - 매체명` 형태라 수집 시점에 뒤쪽을 잘라
매체명으로 씁니다(`splitTitleSource`). Google News로 둔 분야는 매체를 고정하고 싶으면
언제든 직접 피드로 교체할 수 있습니다.

> **사회 분야 주의** — 한국 사회면을 깔끔하게 덮는 Google News 토픽이 없어 한국경제 피드
> 하나만 씁니다. 이 피드가 조용해지면 분야 전체가 빕니다. 사회가 비어 보이면 여기부터 확인하세요.

### 수집 규칙

- **중복 제거**: 기사 링크의 SHA-1 앞 16자를 `id`로 씁니다. 같은 기사가 여러 번 걸려도 한 번만 저장됩니다.
- **분야별 상한**: 하루 파일에 분야당 최대 **80건**. 넘으면 발행 시각이 오래된 것부터 잘립니다.
- **피드 하나가 죽어도 계속 진행**: 실패한 피드는 로그만 남기고 나머지 피드로 수집을 마칩니다.
  그래서 **한 분야가 조용히 비어 있어도 워크플로우는 초록색**입니다 — 피드를 추가·변경했다면
  Actions 로그에서 `Failed to fetch`를 한 번 확인하세요.
- **날짜 기준은 KST**: 파일명 `data/news/YYYY-MM-DD.json`은 한국 시간 기준 날짜입니다.

---

## 3. 급상승 키워드는 어떻게 나오나

`src/lib/trending.ts`. 외부 형태소 분석기 없이 **제목의 단어 빈도**만 셉니다.

1. 최근 2일치 기사 제목에서 문자·숫자만 남기고 공백으로 자릅니다.
2. 2글자 미만 토큰과 불용어(`속보`, `단독`, `종합`, `오늘`, `위해`, `했다` …)를 버립니다.
3. **한 제목 안에서는 같은 단어를 한 번만 셉니다.** 제목에 "삼성 … 삼성"이 반복돼도 1점입니다.
4. 2건 이상 등장한 단어만 남겨 빈도순 상위 12개를 페이지에 표시합니다(Discord는 8개).

형태소 분석을 하지 않으므로 조사가 붙은 형태(`정부가`, `정부는`)는 서로 다른 단어로 셉니다.
여러 헤드라인에 반복 등장하는 고유명사를 띄우는 데는 충분하지만, 정밀한 토픽 추출은 아닙니다.
정확도를 높이려면 불용어 목록을 늘리거나 조사 제거 규칙을 넣는 것이 가장 값싼 개선입니다.

---

## 4. Discord 브리핑

`scripts/send-discord-digest.ts`가 그날 수집분을 읽어 급상승 키워드 1개 + 분야별 1개씩
embed를 만들고 웹훅으로 보냅니다. 각 분야 embed에는 **최신 기사 제목 3건**이 링크와 함께 들어갑니다.

> **AI 요약은 현재 꺼져 있습니다.** 스크립트에 `TODO: AI 카테고리 요약 재도입` 주석이 있고,
> `discord-digest.yml`은 `ANTHROPIC_API_KEY`를 job에 넘기지 않습니다. 지금 나가는 것은
> 요약이 아니라 **제목 목록**입니다. 요약을 되살리려면 스크립트와 워크플로우 양쪽을 손봐야 합니다.

**Discord는 메시지 하나에 embed를 10개까지만 받습니다.** 분야가 10개가 되면서 키워드 embed까지
11개가 되어, 브리핑은 10개씩 끊어 **여러 메시지로** 나갑니다. 첫 메시지만 제목 줄을 달고
나머지는 이어집니다. 분야를 더 늘려도 뒤쪽 분야가 조용히 잘리지 않습니다.

---

## 5. 구성 파일

| 파일 | 역할 |
| --- | --- |
| `src/lib/categories.ts` | 분야 정의와 RSS 피드 목록 — **수집 대상을 바꾸는 곳은 여기 하나** |
| `scripts/collect-news.ts` | 피드 수집 · 중복 제거 · 분야별 상한 적용 후 JSON 저장 |
| `src/lib/newsStore.ts` | 날짜별 JSON 읽기/쓰기, 최근 N일 병합 |
| `src/lib/trending.ts` | 급상승 키워드 추출 |
| `src/app/page.tsx` | 서버 컴포넌트. 최근 2일치를 읽어 렌더 (`revalidate = 3600`) |
| `src/components/NewsExplorer.tsx` | 분야 필터 · 검색 · 즐겨찾기(localStorage) |
| `scripts/send-discord-digest.ts` | 분야별 헤드라인을 embed로 묶어 Discord 웹훅 전송 |
| `.github/workflows/collect-news.yml` | 2시간마다 수집 후 자동 커밋·푸시 |
| `.github/workflows/discord-digest.yml` | 매일 21:00 KST Discord 전송 |

---

## 6. 배포

| 대상 | 방식 |
| --- | --- |
| 웹 | **Vercel** — 프로젝트 `mynews-2608`. GitHub 연동으로 `main`에 push할 때마다 자동 재배포 |
| 수집 · 전송 | **GitHub Actions** — 별도 서버 없음. 수집 결과는 Actions가 저장소에 직접 커밋 |
| 데이터 | **저장소 자체** — `data/news/*.json`. 별도 DB 없음 |

수집 워크플로우가 커밋을 밀어 넣으면 그게 다시 Vercel 재배포를 일으켜 페이지가 갱신됩니다.
즉 **2시간마다 데이터 커밋 → 자동 배포**가 한 줄로 이어집니다.

### 주소 정리 (2026-09-10 확인)

| 주소 | 상태 |
| --- | --- |
| `mynews-2608-frontieralls-projects.vercel.app` | 배포 성공. 단 **Vercel Authentication**이 켜져 있어 로그인 없이는 302로 튕깁니다 |
| `mynews-2608.vercel.app` | **배정돼 있지 않음** — `DEPLOYMENT_NOT_FOUND`. 예전 문서에 적혀 있던 주소입니다 |

즉 지금 이 사이트는 **공개 상태가 아닙니다.** 아무나 볼 수 있게 하려면 Vercel 프로젝트에서
Deployment Protection을 끄고, 원하면 짧은 별칭(`mynews-2608.vercel.app`)을 프로덕션에 붙이면 됩니다.
저장소 이름은 `mynews-2608` → `mydaily-news-2608`로 바뀌었지만 Vercel 프로젝트 이름은 그대로라
둘이 어긋나 있는 상태입니다.

### Secrets

| 이름 | 쓰이는 곳 | 상태 |
| --- | --- | --- |
| `DISCORD_WEBHOOK_URL` | `discord-digest` 워크플로우 | ✅ 등록 · 사용 중 |
| `ANTHROPIC_API_KEY` | (AI 요약 재도입 시) | ⚠️ 등록돼 있으나 현재 어느 워크플로우도 사용하지 않음 |

---

## 7. 데이터 저장 방식

별도 데이터베이스 없이 수집한 뉴스를 `data/news/*.json`으로 저장소에 직접 커밋합니다.
소규모 트래픽에는 충분히 단순하고 비용이 들지 않으며, 필요해지면 나중에 Postgres/KV 등으로
옮길 수 있습니다. 대신 **저장소 용량이 하루치 JSON만큼 계속 늘어난다**는 점은 감안해야 합니다
(분야 10개 × 최대 80건 기준 하루 1MB 안팎).

---

## 8. 로컬 실행

```bash
npm install
npm run dev              # 웹 페이지 확인 (http://localhost:3000)
npm run collect:news     # 수동으로 뉴스 수집 (환경변수 불필요)
npm run digest:discord   # 수동으로 Discord 전송 (DISCORD_WEBHOOK_URL 필요)
```

수집은 공개 RSS만 읽으므로 아무 설정 없이 바로 돌아갑니다.
Discord 전송만 웹훅 주소가 필요합니다.

```bash
cp .env.example .env     # DISCORD_WEBHOOK_URL 을 채워 넣으세요
```

`digest:discord`는 `--env-file-if-exists=.env`로 실행되므로 `.env`가 있으면 자동으로 읽고,
없으면 그냥 시스템 환경변수를 씁니다. `.env`는 `.gitignore`에 걸려 커밋되지 않습니다
(`.env.example`만 예외로 추적합니다).

> **주의** `digest:discord`는 진짜 Discord 채널에 글을 올립니다. 테스트할 때는 별도 채널의
> 웹훅을 쓰세요.

## 9. 수집 대상 바꾸기

`src/lib/categories.ts`의 `CATEGORIES` 배열만 고치면 됩니다.

```ts
// 기존 분야에 피드 추가 — 이것만으로 끝
{ url: "https://www.hankyung.com/feed/politics", source: "한국경제" }

// 새 분야 추가 — CategoryKey 유니온에 키를 먼저 추가해야 타입이 통과합니다
```

`CategoryKey`를 참조하는 곳은 `types.ts`, `NewsExplorer.tsx` 두 곳뿐이고 분야별 분기 코드가
없어서, 새 분야는 **유니온 한 줄 + `CATEGORIES` 항목 하나**로 끝납니다. 색을 지정하려면
`send-discord-digest.ts`의 `CATEGORY_COLORS`에도 한 줄 추가하세요(없으면 회색).

피드를 추가하기 전에는 살아 있는지 먼저 확인하세요. 항목 수가 0이면 죽은 피드입니다.

```bash
curl -sL "<피드 URL>" | grep -o "<item[ >]" | wc -l
```

### 확인해 본 뒤 제외한 피드

RSS를 내렸거나 주소가 바뀌어 **0건**이 나온 곳들입니다. 다시 시도하기 전에 참고하세요.

ZDNet Korea · 블로터 · 바이라인네트워크 · 코인데스크코리아 · 인벤 · 게임메카 · 플래텀 ·
사이언스타임즈 · 한국경제 자동차/문화/건강
