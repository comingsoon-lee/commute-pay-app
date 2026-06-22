# 쌤페이 (Ssam-Pay)

선생님들의 일일 근무 시간과 등·하원(오전/오후) 형태를 기록하고, 이에 따른 월별 급여를 자동으로 정산해주는 웹 기반 애플리케이션입니다.

## 🚀 주요 기능

- **근무 기록 달력:** 직관적인 달력 UI를 통해 매일의 근무 형태(정상 근무, 부모 직접 등하원, 선생님 휴가, 공휴일 휴무)와 시간을 기록합니다.
- **자동 급여 정산:** 설정된 기본 시급을 바탕으로 하루 일당과 이번 달 총 예상 급여를 자동으로 계산합니다.
- **급여 명세서 생성:** 월별 급여 내역을 표 형태로 한눈에 볼 수 있는 명세서 페이지를 제공합니다.
- **PDF 출력 및 인쇄:** 정산된 급여 명세서를 깔끔한 PDF 파일로 다운로드하거나 바로 인쇄할 수 있습니다.
- **다크/라이트 모드 지원:** 사용자의 환경과 취향에 맞게 테마를 변경할 수 있습니다.
- **클라우드 동기화 (Firebase):** Google 계정 로그인을 통해 데이터를 안전하게 클라우드(Firestore)에 저장하고, 여러 기기에서 동기화하여 사용할 수 있습니다.
- **PWA (Progressive Web App):** 모바일 홈 화면에 앱처럼 추가하여 오프라인 캐싱과 함께 네이티브 앱과 같은 사용 경험을 제공합니다.
- **백업 및 복원:** 데이터를 로컬 JSON 파일로 내보내거나 가져와서 수동으로 백업할 수 있습니다.
- **간편 송금 연동:** 모바일 환경에서 토스(Toss) 등과 연동하여 정산된 금액을 터치 한 번에 송금할 수 있도록 지원합니다.

## 🛠 기술 스택

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
- **Backend/BaaS:** Firebase Authentication (Google Login), Cloud Firestore
- **Libraries:** [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) (PDF 내보내기)
- **Deployment:** Firebase Hosting (권장) / 정적 웹 호스팅 환경

## ⚙️ 설치 및 로컬 실행 방법

이 프로젝트는 정적 파일(HTML, CSS, JS)로 구성되어 있어 별도의 빌드 과정 없이 바로 실행할 수 있습니다. 단, 로컬에서 실행할 때 ES6 Module과 Service Worker를 정상적으로 로드하기 위해 로컬 웹 서버가 필요합니다.

1. **저장소 클론:**
   ```bash
   git clone https://github.com/comingsoon-lee/ssam-pay.git
   cd ssam-pay
   ```

2. **로컬 웹 서버 실행 (Python 예시):**
   ```bash
   python3 -m http.server 8080
   ```
   이후 브라우저에서 `http://localhost:8080`에 접속합니다.

## 🔥 Firebase 연동 및 배포 주의사항

이 앱은 Firebase를 사용하여 데이터를 관리합니다. `config.js` 파일에 포함된 Firebase Config는 실제 운영 환경에 맞게 본인의 Firebase 프로젝트 설정으로 교체해야 합니다. 

Firebase 웹 API 키는 프론트엔드 코드에 포함되어 브라우저에 노출되는 것이 정상입니다. 따라서 **반드시 Firestore 보안 규칙을 설정하여 허가된 사용자만 데이터에 접근할 수 있도록 보호해야 합니다.**

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트를 생성합니다.
2. **Authentication**에서 'Google' 로그인 제공업체를 활성화합니다.
3. **Firestore Database**를 생성하고, 상단 **규칙 (Rules)** 탭에서 아래와 같이 보안 규칙을 설정합니다.
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         // 허용할 구글 이메일 주소를 아래에 입력하세요
         allow read, write: if request.auth != null && (
           request.auth.token.email == 'your.email@gmail.com' ||
           request.auth.token.email == 'wife.email@gmail.com'
         );
       }
     }
   }
   ```
4. 웹 앱을 등록하고 발급받은 `firebaseConfig` 객체를 `config.js` 파일에 덮어씁니다.
5. 이제 깃허브 페이지(Github Pages) 등을 통해 자유롭게 배포하여 사용하시면 됩니다!

## 🤝 기여 방법 (Contributing)

버그 리포트나 기능 제안은 [Issues](https://github.com/comingsoon-lee/ssam-pay/issues) 탭을 이용해 주시고, 코드 기여를 원하신다면 Pull Request를 남겨주시면 감사하겠습니다.

## 📄 라이선스 (License)

이 프로젝트는 오픈소스로 공개되며 자유롭게 사용 및 수정이 가능합니다.
