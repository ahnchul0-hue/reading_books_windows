// 4자리 PIN 입력 패드 (오버레이). 4자리 채우면 resolve, 취소 시 null.
export function showPinPad(title: string): Promise<string | null> {
  return new Promise((resolve) => {
    let pin = ''
    const overlay = document.createElement('div')
    overlay.className = 'pin-overlay'
    overlay.innerHTML = `
      <div class="pin-box">
        <div class="pin-title">${title}</div>
        <div class="pin-dots" id="dots"></div>
        <div class="pin-msg" id="pmsg"></div>
        <div class="pin-pad" id="pad"></div>
        <button class="btn" id="pcancel">취소</button>
      </div>`
    document.body.appendChild(overlay)
    const dots = overlay.querySelector('#dots') as HTMLElement
    const pad = overlay.querySelector('#pad') as HTMLElement
    const draw = () => {
      dots.textContent = '●'.repeat(pin.length) + '○'.repeat(4 - pin.length)
    }
    draw()
    const done = (v: string | null) => {
      overlay.remove()
      resolve(v)
    }
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
    for (const k of keys) {
      const b = document.createElement('button')
      if (k === '') {
        b.style.visibility = 'hidden'
      } else {
        b.className = 'pin-key'
        b.textContent = k
        b.addEventListener('click', () => {
          if (k === '⌫') pin = pin.slice(0, -1)
          else if (pin.length < 4) pin += k
          draw()
          if (pin.length === 4) setTimeout(() => done(pin), 120)
        })
      }
      pad.appendChild(b)
    }
    ;(overlay.querySelector('#pcancel') as HTMLElement).addEventListener('click', () => done(null))
  })
}

export function setPinError(msg: string): void {
  const el = document.querySelector('#pmsg') as HTMLElement | null
  if (el) el.textContent = msg
}
