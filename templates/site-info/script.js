// ─── THEME ───────────────────────────────────────────────────────────────────

function toggleTheme() {
  const html = document.documentElement
  const isDark = html.getAttribute('data-theme') === 'dark'
  const next = isDark ? 'light' : 'dark'
  html.setAttribute('data-theme', next)
  document.getElementById('theme-label').textContent = isDark ? 'Dark' : 'Light'
  document.getElementById('theme-icon').textContent  = isDark ? '○' : '●'
  try { localStorage.setItem('di-theme', next) } catch {}
}

;(function initTheme() {
  let saved = 'light'
  try { saved = localStorage.getItem('di-theme') || 'light' } catch {}
  document.documentElement.setAttribute('data-theme', saved)
  if (saved === 'dark') {
    document.getElementById('theme-label').textContent = 'Light'
    document.getElementById('theme-icon').textContent  = '●'
  }
})()

// ─── COLLECT ─────────────────────────────────────────────────────────────────

async function collect() {
  const data = {}

  data.navigator = {
    userAgent:           navigator.userAgent,
    platform:            navigator.platform,
    language:            navigator.language,
    languages:           navigator.languages,
    cookieEnabled:       navigator.cookieEnabled,
    onLine:              navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory:        navigator.deviceMemory,
    maxTouchPoints:      navigator.maxTouchPoints,
    vendor:              navigator.vendor,
  }

  data.screen = {
    width:       screen.width,
    height:      screen.height,
    availWidth:  screen.availWidth,
    availHeight: screen.availHeight,
    colorDepth:  screen.colorDepth,
    pixelDepth:  screen.pixelDepth,
  }

  data.window = {
    innerWidth:       window.innerWidth,
    innerHeight:      window.innerHeight,
    outerWidth:       window.outerWidth,
    outerHeight:      window.outerHeight,
    devicePixelRatio: window.devicePixelRatio,
  }

  data.storage = {
    localStorage:  testStorage(localStorage),
    sessionStorage: testStorage(sessionStorage),
    indexedDB:     !!window.indexedDB,
  }

  data.cookies = {
    enabled: navigator.cookieEnabled,
    test:    testCookies(),
  }

  data.permissions = await getPermissions()

  if (navigator.connection) {
    data.connection = {
      type:          navigator.connection.type,
      effectiveType: navigator.connection.effectiveType,
      downlink:      navigator.connection.downlink,
      rtt:           navigator.connection.rtt,
      saveData:      navigator.connection.saveData,
    }
  }

  if (navigator.getBattery) {
    try {
      const b = await navigator.getBattery()
      data.battery = { level: b.level, charging: b.charging }
    } catch { data.battery = 'blocked' }
  }

  data.webgl  = getWebGL()
  data.canvas = getCanvas()
  data.audio  = await getAudioFingerprint()

  try {
    data.mediaDevices = await navigator.mediaDevices.enumerateDevices()
  } catch { data.mediaDevices = 'blocked' }

  data.webrtcBasic = await getWebRTC()

  data.features = {
    bluetooth:     !!navigator.bluetooth,
    usb:           !!navigator.usb,
    clipboard:     !!navigator.clipboard,
    credentials:   !!navigator.credentials,
    serviceWorker: !!navigator.serviceWorker,
    share:         !!navigator.share,
  }

  data.protocols = {
    https:     location.protocol === 'https:',
    websocket: 'WebSocket' in window,
    webrtc:    'RTCPeerConnection' in window,
  }

  data.time = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset:   new Date().getTimezoneOffset(),
  }

  data.context = {
    iframe:     window.self !== window.top,
    visibility: document.visibilityState,
  }

  data.performance = performance.memory
    ? {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize:  performance.memory.usedJSHeapSize,
      }
    : 'not supported'

  data.network = await getNetworkInfo()

  return data
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function testStorage(s) {
  try { s.setItem('__t__', '1'); s.removeItem('__t__'); return true }
  catch { return false }
}

function testCookies() {
  document.cookie = 'cookietest=1'
  return document.cookie.includes('cookietest')
}

async function getPermissions() {
  const list = ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read']
  const result = {}
  for (const p of list) {
    try { const r = await navigator.permissions.query({ name: p }); result[p] = r.state }
    catch { result[p] = 'unsupported' }
  }
  return result
}

function getWebGL() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl')
  if (!gl) return null
  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  return {
    vendor:   dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   : '—',
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '—',
  }
}

function getCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 220; canvas.height = 30
  const ctx = canvas.getContext('2d')
  ctx.font = '14px monospace'
  ctx.fillStyle = '#555'
  ctx.fillText('fingerprint 👾', 8, 20)
  return canvas.toDataURL()
}

async function getAudioFingerprint() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const analyser = ctx.createAnalyser()
    osc.connect(analyser); analyser.connect(ctx.destination)
    osc.start()
    const d = new Float32Array(analyser.frequencyBinCount)
    analyser.getFloatFrequencyData(d)
    osc.stop()
    await ctx.close()
    return Array.from(d.slice(0, 20))
  } catch { return 'blocked' }
}

async function getWebRTC() {
  return new Promise(resolve => {
    const pc = new RTCPeerConnection({ iceServers: [] })
    pc.createDataChannel('')
    pc.createOffer().then(o => pc.setLocalDescription(o))
    pc.onicecandidate = e => {
      if (!e.candidate) return
      const ip = e.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/)
      if (ip) resolve(ip[1])
    }
    setTimeout(() => resolve('none'), 1000)
  })
}

async function getNetworkInfo() {
  const net = {}
  if (navigator.connection) {
    net.connection = {
      type:          navigator.connection.type,
      effectiveType: navigator.connection.effectiveType,
      downlink:      navigator.connection.downlink,
      rtt:           navigator.connection.rtt,
      saveData:      navigator.connection.saveData,
    }
  }
  net.publicIPs = await getPublicIPs()
  net.webrtc    = await getWebRTCFull()
  net.hostname  = location.hostname
  net.online    = navigator.onLine
  return net
}

async function getPublicIPs() {
  const urls = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
  ]
  const results = []
  for (const url of urls) {
    try {
      const r = await fetch(url)
      const j = await r.json()
      if (j.ip) results.push(j.ip)
    } catch {}
  }
  return results
}

async function getWebRTCFull() {
  return new Promise(resolve => {
    const ips = [], candidates = []
    const pc = new RTCPeerConnection({ iceServers: [] })
    pc.createDataChannel('')
    pc.createOffer().then(o => pc.setLocalDescription(o))
    pc.onicecandidate = e => {
      if (!e.candidate) { resolve({ ips, candidates }); return }
      const c = e.candidate.candidate
      candidates.push(c)
      const m = c.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})|([a-f0-9:]{6,})/i)
      if (m && !ips.includes(m[0])) ips.push(m[0])
    }
    setTimeout(() => resolve({ ips, candidates }), 1500)
  })
}

// ─── RENDER: NETWORK HERO ────────────────────────────────────────────────────

function renderNetHero(net) {
  const hero = document.getElementById('net-hero')
  const ips  = net.publicIPs || []
  const ipv4 = ips.find(ip => ip && !ip.includes(':')) || '—'
  const ipv6 = ips.find(ip => ip && ip.includes(':')) || null
  const rtcIPs = (net.webrtc && net.webrtc.ips) || []
  const conn = net.connection || {}

  const cells = [
    { k: 'online',    v: net.online ? 'yes' : 'no' },
    { k: 'hostname',  v: net.hostname || location.hostname || '—' },
    { k: 'effective', v: conn.effectiveType || '—' },
    { k: 'downlink',  v: conn.downlink != null ? conn.downlink + ' Mbps' : '—' },
    { k: 'rtt',       v: conn.rtt      != null ? conn.rtt + ' ms'    : '—' },
    { k: 'save data', v: conn.saveData != null ? (conn.saveData ? 'on' : 'off') : '—' },
    { k: 'local IPs', v: rtcIPs.length ? rtcIPs.join('\n') : '—' },
  ]

  hero.innerHTML = `
    <div class="net-label">Network</div>
    <div class="net-ip-primary">${ipv4}</div>
    ${ipv6 ? `<div class="net-ip-v6">${ipv6}</div>` : '<div class="net-ip-v6" style="margin-bottom:22px"></div>'}
    <div class="net-grid">
      ${cells.map(c => `
        <div class="net-cell">
          <div class="net-cell-k">${c.k}</div>
          <div class="net-cell-v">${c.v.replace(/\n/g, '<br>')}</div>
        </div>
      `).join('')}
    </div>
  `
}

// ─── RENDER: SECTIONS ────────────────────────────────────────────────────────

function el(tag, cls, html) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html != null) e.innerHTML = html
  return e
}

function fmtVal(v) {
  if (v === true)  return `<span class="v-true">true</span>`
  if (v === false) return `<span class="v-false">false</span>`
  if (v === null || v === undefined) return `<span class="v-null">null</span>`
  return String(v)
}

function kvTable(obj) {
  const rows = Object.entries(obj).map(([k, v]) => {
    let vHtml
    if (Array.isArray(v)) {
      vHtml = v.map(x => fmtVal(x)).join(', ')
    } else {
      vHtml = fmtVal(v)
    }
    return `<tr><td class="k">${k}</td><td class="v">${vHtml}</td></tr>`
  })
  return `<table class="kv-table"><tbody>${rows.join('')}</tbody></table>`
}

function renderPermissions(perms) {
  const pills = Object.entries(perms).map(([k, v]) =>
    `<div class="perm-pill perm-${v}"><div class="perm-dot"></div>${k}</div>`
  ).join('')
  return `<div class="perm-grid">${pills}</div>`
}

function renderFeatures(feats) {
  const pills = Object.entries(feats).map(([k, v]) =>
    `<div class="feat-pill ${v ? 'feat-yes' : 'feat-no'}">${k}</div>`
  ).join('')
  return `<div class="feat-grid">${pills}</div>`
}

function renderMediaDevices(devices) {
  if (!Array.isArray(devices)) return `<div style="font-size:11px;color:var(--text-faint)">${devices}</div>`
  const rows = devices.map(d => {
    const label = d.label || (d.deviceId === 'default' ? 'default' : d.deviceId ? d.deviceId.slice(0, 12) + '…' : '—')
    return `<div class="dev-item"><span class="dev-kind">${d.kind}</span><span class="dev-label">${label}</span></div>`
  })
  return `<div class="dev-list">${rows.join('')}</div>`
}

function renderAudio(data) {
  if (!Array.isArray(data)) return `<div style="font-size:11px;color:var(--text-faint)">${data}</div>`
  // Normalize dB values (-Infinity ~ 0) to heights
  const finite = data.map(v => isFinite(v) ? v : -160)
  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const range = max - min || 1
  const bars = finite.map(v => {
    const h = Math.max(2, Math.round(((v - min) / range) * 40))
    return `<div class="audio-bar" style="height:${h}px"></div>`
  }).join('')
  return `<div class="audio-wrap">
    <div class="audio-bars">${bars}</div>
    <div class="audio-note">frequency data · ${data.length} bins</div>
  </div>`
}

function renderCanvas(dataUrl) {
  return `<img class="canvas-img" src="${dataUrl}" alt="canvas fingerprint">`
}

function renderBattery(bat) {
  if (typeof bat === 'string') return `<div style="font-size:11px;color:var(--text-faint)">${bat}</div>`
  const pct = Math.round(bat.level * 100)
  return kvTable({ level: pct + '%', charging: bat.charging })
}

function renderPerformance(perf) {
  if (typeof perf === 'string') return `<div style="font-size:11px;color:var(--text-faint)">${perf}</div>`
  const fmt = b => (b / 1024 / 1024).toFixed(1) + ' MB'
  return kvTable({
    'heap limit':  fmt(perf.jsHeapSizeLimit),
    'heap total':  fmt(perf.totalJSHeapSize),
    'heap used':   fmt(perf.usedJSHeapSize),
  })
}

function renderNavigator(nav) {
  const langs = Array.isArray(nav.languages) ? nav.languages.join(', ') : nav.languages
  return kvTable({
    userAgent:           nav.userAgent,
    platform:            nav.platform,
    language:            nav.language,
    languages:           langs,
    cookieEnabled:       nav.cookieEnabled,
    onLine:              nav.onLine,
    hardwareConcurrency: nav.hardwareConcurrency ? nav.hardwareConcurrency + ' cores' : '—',
    deviceMemory:        nav.deviceMemory ? nav.deviceMemory + ' GB' : '—',
    maxTouchPoints:      nav.maxTouchPoints,
    vendor:              nav.vendor || '—',
  })
}

function renderScreen(scr) {
  return kvTable({
    resolution:  scr.width + ' × ' + scr.height,
    available:   scr.availWidth + ' × ' + scr.availHeight,
    colorDepth:  scr.colorDepth + ' bit',
    pixelDepth:  scr.pixelDepth + ' bit',
  })
}

function renderWindow(win) {
  return kvTable({
    inner:           win.innerWidth + ' × ' + win.innerHeight,
    outer:           win.outerWidth + ' × ' + win.outerHeight,
    devicePixelRatio: win.devicePixelRatio,
  })
}

function renderConnection(conn) {
  return kvTable({
    type:          conn.type || '—',
    effectiveType: conn.effectiveType || '—',
    downlink:      conn.downlink != null ? conn.downlink + ' Mbps' : '—',
    rtt:           conn.rtt     != null ? conn.rtt     + ' ms'    : '—',
    saveData:      conn.saveData,
  })
}

function renderTime(t) {
  const offsetH = Math.abs(Math.floor(t.offset / 60))
  const offsetM = Math.abs(t.offset % 60)
  const sign    = t.offset <= 0 ? '+' : '−'
  return kvTable({
    timezone: t.timezone,
    utcOffset: `UTC${sign}${String(offsetH).padStart(2,'0')}:${String(offsetM).padStart(2,'0')}`,
    localTime: new Date().toLocaleTimeString(),
  })
}

function buildSectionBody(key, value) {
  switch (key) {
    case 'navigator':    return renderNavigator(value)
    case 'screen':       return renderScreen(value)
    case 'window':       return renderWindow(value)
    case 'storage':      return kvTable(value)
    case 'cookies':      return kvTable(value)
    case 'permissions':  return renderPermissions(value)
    case 'connection':   return renderConnection(value)
    case 'battery':      return renderBattery(value)
    case 'webgl':        return value ? kvTable(value) : `<div style="font-size:11px;color:var(--text-faint)">not available</div>`
    case 'canvas':       return renderCanvas(value)
    case 'audio':        return renderAudio(value)
    case 'mediaDevices': return renderMediaDevices(value)
    case 'webrtcBasic':  return kvTable({ 'local IP': value })
    case 'features':     return renderFeatures(value)
    case 'protocols':    return renderFeatures(value)
    case 'time':         return renderTime(value)
    case 'context':      return kvTable(value)
    case 'performance':  return renderPerformance(value)
    default: {
      const pre = document.createElement('pre')
      pre.textContent = JSON.stringify(value, null, 2)
      const wrap = document.createElement('div')
      wrap.appendChild(pre)
      return wrap.innerHTML
    }
  }
}

const LABELS = {
  navigator:    'Navigator',
  screen:       'Screen',
  window:       'Viewport',
  storage:      'Storage',
  cookies:      'Cookies',
  permissions:  'Permissions',
  connection:   'Connection',
  battery:      'Battery',
  webgl:        'WebGL',
  canvas:       'Canvas fingerprint',
  audio:        'Audio fingerprint',
  mediaDevices: 'Media devices',
  webrtcBasic:  'WebRTC — basic',
  features:     'Browser features',
  protocols:    'Protocols',
  time:         'Time & timezone',
  context:      'Page context',
  performance:  'Performance memory',
}

const FULL_WIDTH = new Set(['navigator', 'mediaDevices', 'audio', 'canvas'])
const OPEN_BY_DEFAULT = new Set(['navigator', 'screen', 'time', 'features', 'protocols', 'storage'])

function makeSection(key, value) {
  const open = OPEN_BY_DEFAULT.has(key)
  const sec  = document.createElement('div')
  sec.className = 'section' + (FULL_WIDTH.has(key) ? ' full' : '')

  const head = el('div', 'section-head')
  head.appendChild(el('span', 'section-name', LABELS[key] || key))
  const chev = el('span', 'section-chevron' + (open ? ' open' : ''), '▾')
  head.appendChild(chev)

  const body = el('div', 'section-body' + (open ? ' open' : ''))
  body.innerHTML = buildSectionBody(key, value)

  head.addEventListener('click', () => {
    const isOpen = body.classList.contains('open')
    body.classList.toggle('open', !isOpen)
    chev.classList.toggle('open', !isOpen)
  })

  sec.append(head, body)
  return sec
}

// ─── BOOT ────────────────────────────────────────────────────────────────────

document.getElementById('ts').textContent =
  new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const t0 = performance.now()

collect().then(data => {
  document.getElementById('loader').style.display = 'none'
  const output = document.getElementById('output')
  output.classList.add('visible')

  // Network hero first
  renderNetHero(data.network)

  // All other sections in order, skip 'network' (already shown)
  const grid = document.getElementById('grid')
  const order = ['navigator','screen','window','time','features','protocols',
                 'storage','cookies','permissions','connection','battery',
                 'webgl','webrtcBasic','context','performance','canvas','audio','mediaDevices']

  for (const key of order) {
    if (data[key] !== undefined) grid.appendChild(makeSection(key, data[key]))
  }
  // Any leftover keys
  for (const key of Object.keys(data)) {
    if (!order.includes(key) && key !== 'network') grid.appendChild(makeSection(key, data[key]))
  }

  document.getElementById('footer').textContent =
    `собрано за ${((performance.now() - t0) / 1000).toFixed(2)} с`
})