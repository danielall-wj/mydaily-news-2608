# 오늘의 트렌드 뉴스

2시간마다 분야별 RSS 뉴스를 자동 수집해 웹 페이지로 보여주고, 하루 한 번 AI 요약과 함께 Discord로 전송하는 프로젝트입니다.

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

## 필요한 설정 (배포 전 체크리스트)

1. **GitHub 저장소 연결**: 이 프로젝트를 GitHub 원격 저장소에 push (Actions는 원격 저장소가 있어야 동작)
2. **Discord Webhook 생성**: Discord 서버 → 채널 설정 → 연동 → 웹후크 → URL 복사
3. **Anthropic API 키 발급**: [console.anthropic.com](https://console.anthropic.com)에서 발급
4. **GitHub Secrets 등록**: 저장소 Settings → Secrets and variables → Actions
   - `DISCORD_WEBHOOK_URL`
   - `ANTHROPIC_API_KEY`
5. **Vercel 배포 + Git 연동**: Vercel에 저장소를 연결해두면, GitHub Actions가 새 뉴스를 커밋할 때마다 자동으로 재배포되어 화면이 최신 상태로 유지됩니다.

## 데이터 저장 방식

별도 데이터베이스 없이, 수집한 뉴스를 `data/news/*.json`으로 리포지토리에 직접 커밋합니다. 소규모 트래픽에는 충분히 단순하고 비용이 들지 않으며, 필요해지면 나중에 Postgres/KV 등으로 옮길 수 있습니다.
