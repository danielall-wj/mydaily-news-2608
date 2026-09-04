# 오늘의 트렌드 뉴스

2시간마다 분야별 RSS 뉴스를 자동 수집해 웹 페이지로 보여주고, 하루 한 번 AI 요약과 함께 Discord로 전송하는 프로젝트입니다.

- **배포 주소**: https://mynews-2608.vercel.app
- **저장소**: https://github.com/frontierall/mynews-2608

## 구성

- **수집**: `scripts/collect-news.ts` — `src/lib/categories.ts`에 정의된 분야별 RSS 피드에서 기사를 모아 `data/news/YYYY-MM-DD.json`(KST 기준)에 저장
  - AI / IT / 경제: AI타임스·전자신문·한국경제·긱뉴스 등 직접 지정한 피드 사용
  - 정치 / 세계 / 스포츠 / 연예: 당분간 Google News RSS로 유지 (추후 직접 소스로 교체 가능)
- **표시**: `src/app/page.tsx` — 최근 데이터를 분야별로 정리해서 보여주고, 급상승 키워드를 하이라이트
- **Discord 전송**: `scripts/send-discord-digest.ts` — 그날 수집된 기사를 분야별로 Claude(`claude-haiku-4-5`)로 요약해 Discord Webhook으로 전송
- **자동화**: `.github/workflows/collect-news.yml`(2시간마다), `.github/workflows/discord-digest.yml`(매일 21:00 KST)

## 로컬 실행

```bash
npm install
npm run dev              # 웹 페이지 확인 (http://localhost:3000)
npm run collect:news     # 수동으로 뉴스 수집
npm run digest:discord   # 수동으로 Discord 전송 (.env에 아래 값 필요)
```

`.env.example`을 `.env`로 복사하고 값을 채워주세요.

## 설정 현황

| 항목 | 상태 |
| --- | --- |
| GitHub 원격 저장소 연결 | ✅ `frontierall/mynews-2608` |
| GitHub Secrets 등록 (`DISCORD_WEBHOOK_URL`, `ANTHROPIC_API_KEY`) | ✅ 완료 |
| `collect-news` 워크플로우 실제 실행 검증 | ✅ 수동 실행 성공 (Actions 환경에서 정상 커밋/푸시 확인) |
| `discord-digest` 워크플로우 실제 실행 검증 | ⏳ 매일 21:00 KST 예정 실행에서 확인 예정 |
| Vercel 배포 + Git 연동 | ✅ push할 때마다 자동 재배포 |

## 데이터 저장 방식

별도 데이터베이스 없이, 수집한 뉴스를 `data/news/*.json`으로 리포지토리에 직접 커밋합니다. 소규모 트래픽에는 충분히 단순하고 비용이 들지 않으며, 필요해지면 나중에 Postgres/KV 등으로 옮길 수 있습니다.
