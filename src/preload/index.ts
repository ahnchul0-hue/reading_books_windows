import { contextBridge } from 'electron'

// Phase 1: 통로가 살아있는지 확인용 최소 노출. Phase 4에서 ipc-contract의 Api로 확장.
contextBridge.exposeInMainWorld('api', {
  ping: (): string => 'pong',
})
