// preload 통로 연결 확인 (Phase 1 스모크)
declare global {
  interface Window {
    api?: { ping: () => string }
  }
}

const status = document.getElementById('status')
if (status && window.api?.ping) {
  status.textContent = `읽기 훈련 앱 — preload 연결됨: ${window.api.ping()}`
}

export {}
