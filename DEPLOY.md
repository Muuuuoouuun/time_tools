# 배포 가이드 — classin.cloud/timetools

교실 타이머는 **100% 정적 클라이언트 앱**입니다. 백엔드·DB·환경변수 없이 `dist/`를 웹서버의 `/timetools/` 경로에 올리면 끝입니다.

## 1. 빌드

```bash
npm install      # 최초 1회
npm run build    # dist/ 생성 (tsc 타입체크 + vite 빌드)
```

산출물은 `dist/`:
```
dist/
  index.html
  assets/
    index-*.js      # 앱 (~50KB, gzip ~15KB)
    index-*.css     # 스타일 (~8KB)
    *.woff2 / *.woff # Sora + JetBrains Mono (self-host, CDN 불필요)
```
파일명 해시가 붙어 있어 캐시 무효화가 자동입니다.

## 2. 경로(base) 설정

앱은 `classin.cloud/timetools`에서 서비스되는 것을 전제로, 모든 자산 URL이 `/timetools/`로 시작하도록 빌드됩니다 (`vite.config.ts`의 `base: '/timetools/'`).

**다른 경로로 바꾸려면** `vite.config.ts`의 `base` 한 줄만 고치고 다시 빌드하세요.
- 예: 루트(`classin.cloud/`)에 올리려면 `base: '/'`
- 예: 다른 서브패스(`/tools/timer/`)면 `base: '/tools/timer/'`

## 3. 서버별 배치

### nginx (권장)

`dist/`의 내용을 예컨대 `/var/www/timetools/`에 복사한 뒤:

```nginx
# 앱 셸 — SPA지만 라우팅이 없으므로 index.html만 서빙하면 충분
location /timetools/ {
    alias /var/www/timetools/;
    try_files $uri $uri/ /timetools/index.html;
}

# 해시된 자산은 장기 캐시 (내용이 바뀌면 파일명이 바뀜)
location /timetools/assets/ {
    alias /var/www/timetools/assets/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

`index.html`은 **캐시하지 않도록**(`no-cache`) 두는 것이 안전합니다. 재배포 시 새 자산 해시를 즉시 반영합니다:

```nginx
location = /timetools/index.html {
    alias /var/www/timetools/index.html;
    add_header Cache-Control "no-cache";
}
```

### Apache

`dist/` 내용을 `.../timetools/`에 복사. 별도 rewrite 불필요(내부 라우팅 없음). 캐시 헤더만 위와 동일하게 권장.

### 정적 호스팅 (Cloudflare Pages / Netlify / Vercel / S3+CloudFront)

- 퍼블리시 디렉터리: `dist/`
- 서브패스로 서비스한다면 위 `base` 설정을 맞춘 뒤 빌드
- 리다이렉트/rewrite 규칙 불필요 (단일 페이지, 클라이언트 라우팅 없음)

## 4. 동작 특성

- **오프라인**: 최초 로드 후에는 네트워크 없이 동작(모든 자산·폰트 로컬 번들, 소리는 Web Audio 합성).
- **저장**: 설정·타이머·교시·테마 등은 브라우저 `localStorage`(키 `timetools:v1`)에 저장 — 서버 저장 없음.
- **정확도**: 타이머는 종료 시각(timestamp) 기준이라 탭 백그라운드/복귀 후에도 정확합니다.

## 5. 로컬 확인

```bash
npm run preview   # http://localhost:4173/timetools/ 에서 빌드 결과 확인
npm run dev       # 개발 서버(HMR)
npm test          # 로직 유닛 테스트 (vitest)
```
