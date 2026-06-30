// 접이식(기본 접힘) 옵션 메뉴 헬퍼 — 사용자가 펼쳐서 선택.
import { sound } from './sound'

/** 접이식 옵션: 머리(라벨·현재값)를 누르면 +/- 스테퍼가 펼쳐진다. 기본은 접힘. */
export function collapsibleStepper(
  label: string,
  valueText: () => string,
  onStep: (dir: number) => void,
): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'collapsible'

  const head = document.createElement('button')
  head.className = 'collapsible-head'
  const drawHead = () => {
    head.innerHTML = ''
    const l = document.createElement('span')
    l.className = 'col-label'
    l.textContent = label
    const v = document.createElement('span')
    v.className = 'col-value'
    v.textContent = valueText()
    const c = document.createElement('span')
    c.className = 'chev'
    c.textContent = open ? '▾' : '▸'
    head.append(l, v, c)
  }

  const body = document.createElement('div')
  body.className = 'collapsible-body'
  body.style.display = 'none'
  const stepRow = document.createElement('div')
  stepRow.className = 'stepper-row'
  const minus = document.createElement('button')
  minus.className = 'chip'
  minus.textContent = '−'
  const val = document.createElement('span')
  val.className = 'val'
  const plus = document.createElement('button')
  plus.className = 'chip'
  plus.textContent = '+'
  const draw = () => {
    val.textContent = valueText()
    drawHead()
  }
  minus.addEventListener('click', () => {
    sound.select()
    onStep(-1)
    draw()
  })
  plus.addEventListener('click', () => {
    sound.select()
    onStep(+1)
    draw()
  })
  stepRow.append(minus, val, plus)
  body.appendChild(stepRow)

  let open = false
  head.addEventListener('click', () => {
    open = !open
    body.style.display = open ? 'block' : 'none'
    drawHead()
  })
  drawHead()
  val.textContent = valueText()
  wrap.append(head, body)
  return wrap
}

/** 접이식 토글(테마처럼 두 값 전환). */
export function collapsibleToggle(
  label: string,
  valueText: () => string,
  onToggle: () => void,
): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'collapsible'
  const head = document.createElement('button')
  head.className = 'collapsible-head'
  const body = document.createElement('div')
  body.className = 'collapsible-body'
  body.style.display = 'none'
  const btn = document.createElement('button')
  btn.className = 'btn'
  let open = false
  const drawHead = () => {
    head.innerHTML = ''
    const l = document.createElement('span')
    l.className = 'col-label'
    l.textContent = label
    const v = document.createElement('span')
    v.className = 'col-value'
    v.textContent = valueText()
    const c = document.createElement('span')
    c.className = 'chev'
    c.textContent = open ? '▾' : '▸'
    head.append(l, v, c)
  }
  const drawBtn = () => (btn.textContent = valueText())
  btn.addEventListener('click', () => {
    sound.select()
    onToggle()
    drawBtn()
    drawHead()
  })
  body.appendChild(btn)
  head.addEventListener('click', () => {
    open = !open
    body.style.display = open ? 'block' : 'none'
    drawHead()
  })
  drawHead()
  drawBtn()
  wrap.append(head, body)
  return wrap
}
