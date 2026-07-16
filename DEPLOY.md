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

`vite.config.ts`의 `base: './'` (상대 경로)로 빌드됩니다. 자산이 `index.html` **기준 상대 경로**로 로드되므로, 하나의 빌드가 **루트**와 **서브패스** 양쪽에서 동작합니다. 이 앱은 클라이언트 라우팅이 없어 상대 경로가 안전합니다.

- **루트 배포** (예: `time-tools.vercel.app/`, `classin.cloud/`) — 그대로 동작.
- **서브패스 배포** (예: `classin.cloud/timetools/`) — **끝에 슬래시를 붙여** 서비스해야 합니다. `/timetools`(슬래시 없음)로 접근하면 `./assets/`가 `/assets/`로 잘못 풀립니다 → 아래 nginx 설정에 `/timetools` → `/timetools/` 리다이렉트를 넣으세요.

> 절대 경로가 필요하면(예: 특정 서브패스 고정) `base: '/timetools/'`로 바꿔 빌드할 수 있지만, 그 빌드는 루트에서는 동작하지 않습니다.

## 3. 서버별 배치

### nginx (권장)

`dist/`의 내용을 예컨대 `/var/www/timetools/`에 복사한 뒤:

```nginx
# 슬래시 없는 접근을 슬래시 붙은 경로로 (상대 경로 자산 해결에 필요)
location = /timetools { return 301 /timetools/; }

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
- 서브패스로만 서비스한다면 위 `base` 설정을 맞춘 뒤 빌드
- 단일 경로로만 서비스할 땐 리다이렉트/rewrite 규칙 불필요 (단일 페이지, 클라이언트 라우팅 없음)

**Vercel에서 root와 서브패스를 동시에 서비스**하려면(예: `classin.cloud/`와 `classin.cloud/time/` 둘 다), `base: './'` 빌드 하나로 `vercel.json`의 rewrite만으로 처리 가능:

```json
{
  "redirects": [
    { "source": "/time", "destination": "/time/", "permanent": true }
  ],
  "rewrites": [
    { "source": "/time/", "destination": "/index.html" },
    { "source": "/time/:path+", "destination": "/:path+" }
  ]
}
```

`/time`(슬래시 없음)은 `/time/`으로 308 리다이렉트해 상대 경로 자산이 올바르게 풀리게 합니다. `/time/`은 `/index.html`로 명시적으로 매핑하고(`:path*`가 빈 값일 때 `/`로 치환되면 Vercel이 index.html로 자동 매핑해주지 않아 404가 남), 그 아래 경로는 `/time/:path+`가 root에 이미 배포된 파일을 그대로 서빙합니다.

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
