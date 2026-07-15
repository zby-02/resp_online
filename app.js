const API_BASE = 'https://sound.flying-bread.top';
const state = {
  files: [],
  regions: {},
  activeFileName: null,
  wavesurfer: null,
  regionsPlugin: null,
  objectUrls: {},
}

const fileInput = document.getElementById('fileInput')
const fileHint = document.getElementById('fileHint')
const fileList = document.getElementById('fileList')
const processBtn = document.getElementById('processBtn')
const clearBtn = document.getElementById('clearBtn')
const statusBox = document.getElementById('statusBox')
const resultsSection = document.getElementById('resultsSection')
const resultsList = document.getElementById('resultsList')
const zipLink = document.getElementById('zipLink')

const modal = document.getElementById('modal')
const modalTitle = document.getElementById('modalTitle')
const closeModalBtn = document.getElementById('closeModalBtn')
const saveRegionBtn = document.getElementById('saveRegionBtn')
const clearRegionBtn = document.getElementById('clearRegionBtn')
const selectionInfo = document.getElementById('selectionInfo')
const playbackInfo = document.getElementById('playbackInfo')
const playFullBtn = document.getElementById('playFullBtn')
const stopAudioBtn = document.getElementById('stopAudioBtn')
const playSelectionBtn = document.getElementById('playSelectionBtn')

function setStatus(text, isError = false) {
  statusBox.textContent = text
  statusBox.style.borderColor = isError ? '#fecaca' : '#dbe2ea'
  statusBox.style.background = isError ? '#fef2f2' : '#f8fafc'
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value < 10 && index > 0 ? 1 : 0)} ${units[index]}`
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) return '0.00'
  return seconds.toFixed(2)
}

function getObjectUrl(file) {
  const existing = state.objectUrls[file.name]
  if (existing) return existing
  const url = URL.createObjectURL(file)
  state.objectUrls[file.name] = url
  return url
}

function revokeObjectUrl(fileName) {
  const url = state.objectUrls[fileName]
  if (url) {
    URL.revokeObjectURL(url)
    delete state.objectUrls[fileName]
  }
}

function revokeAllObjectUrls() {
  Object.keys(state.objectUrls).forEach(revokeObjectUrl)
}

function clearResults() {
  resultsSection.classList.add('hidden')
  resultsList.innerHTML = ''
  zipLink.href = '#'
}

function updatePlaySelectionButton() {
  if (!state.regionsPlugin) {
    playSelectionBtn.disabled = true
    return
  }
  const regions = state.regionsPlugin.getRegions()
  playSelectionBtn.disabled = !regions.length
}

function updatePlaybackInfo() {
  if (!state.wavesurfer) {
    playbackInfo.textContent = '音频尚未开始播放'
    return
  }
  const current = state.wavesurfer.getCurrentTime?.() ?? 0
  const total = state.wavesurfer.getDuration?.() ?? 0
  playbackInfo.textContent = `当前播放：${formatSeconds(current)}s / ${formatSeconds(total)}s`
}

function renderFileList() {
  fileList.innerHTML = ''
  if (!state.files.length) {
    fileHint.textContent = '尚未选择文件'
    return
  }

  fileHint.textContent = `已选择 ${state.files.length} 个文件`

  state.files.forEach(file => {
    const region = state.regions[file.name]
    const url = getObjectUrl(file)
    const div = document.createElement('div')
    div.className = 'file-item'
    div.innerHTML = `
      <h3>${file.name}</h3>
      <div class="file-meta">
        大小：${formatBytes(file.size)}<br>
        类型：${file.type || '未知'}<br>
        背景噪声区间：${region ? `${region.start.toFixed(2)}s ~ ${region.end.toFixed(2)}s` : '未选择'}
      </div>
      <audio class="audio-preview" controls preload="metadata" src="${url}"></audio>
      <div class="actions">
        <button class="primary small-btn" data-action="region" data-name="${encodeURIComponent(file.name)}">框选环境噪声</button>
        <button class="secondary small-btn" data-action="remove" data-name="${encodeURIComponent(file.name)}">移除文件</button>
      </div>
    `
    fileList.appendChild(div)
  })
}

function getSettings() {
  return {
    gain_db: Number(document.getElementById('gainDb').value || 0),
    apply_noise_reduction: document.getElementById('noiseReduction').checked,
    apply_friction_suppression: document.getElementById('frictionSuppression').checked,
    apply_heart_suppression: document.getElementById('heartSuppression').checked,
    estimate_rr: document.getElementById('estimateRR').checked,
    estimate_hr: document.getElementById('estimateHR').checked,
    detect_wheeze: document.getElementById('detectWheeze').checked,
    detect_crackle: document.getElementById('detectCrackle').checked,
  }
}

function openModalForFile(fileName) {
  const file = state.files.find(f => f.name === fileName)
  if (!file) return

  state.activeFileName = fileName
  modal.classList.remove('hidden')
  modalTitle.textContent = `选择环境噪声区间：${fileName}`
  selectionInfo.textContent = state.regions[fileName]
    ? `当前已选：${state.regions[fileName].start.toFixed(2)}s ~ ${state.regions[fileName].end.toFixed(2)}s`
    : '尚未选择区间'
  playbackInfo.textContent = '音频加载中...'
  playSelectionBtn.disabled = true

  if (state.wavesurfer) {
    state.wavesurfer.destroy()
    state.wavesurfer = null
    state.regionsPlugin = null
  }

  const url = getObjectUrl(file)
  state.regionsPlugin = WaveSurfer.Regions.create()
  state.wavesurfer = WaveSurfer.create({
    container: '#waveform',
    url,
    height: 180,
    waveColor: '#93c5fd',
    progressColor: '#2563eb',
    cursorColor: '#1d4ed8',
    barWidth: 2,
    barGap: 1,
    plugins: [state.regionsPlugin],
  })

  state.wavesurfer.on('decode', () => {
    state.regionsPlugin.clearRegions()
    const existing = state.regions[fileName]
    if (existing) {
      state.regionsPlugin.addRegion({
        start: existing.start,
        end: existing.end,
        color: 'rgba(37, 99, 235, 0.2)',
        resize: true,
        drag: true,
      })
    }
    state.regionsPlugin.enableDragSelection({
      color: 'rgba(37, 99, 235, 0.18)',
      resize: true,
      drag: true,
    })
    updatePlaySelectionButton()
    updatePlaybackInfo()
  })

  state.regionsPlugin.on('region-created', region => {
    const regions = state.regionsPlugin.getRegions()
    regions.forEach(r => {
      if (r.id !== region.id) r.remove()
    })
    selectionInfo.textContent = `当前选择：${region.start.toFixed(2)}s ~ ${region.end.toFixed(2)}s`
    updatePlaySelectionButton()
  })

  state.regionsPlugin.on('region-updated', region => {
    selectionInfo.textContent = `当前选择：${region.start.toFixed(2)}s ~ ${region.end.toFixed(2)}s`
    updatePlaySelectionButton()
  })

  state.wavesurfer.on('timeupdate', updatePlaybackInfo)
  state.wavesurfer.on('pause', updatePlaybackInfo)
  state.wavesurfer.on('finish', updatePlaybackInfo)
  state.wavesurfer.on('error', e => {
    selectionInfo.textContent = `波形加载失败：${e}`
    playbackInfo.textContent = '音频加载失败'
  })
}

function closeModal() {
  modal.classList.add('hidden')
  if (state.wavesurfer) {
    state.wavesurfer.destroy()
    state.wavesurfer = null
    state.regionsPlugin = null
  }
  state.activeFileName = null
  playbackInfo.textContent = '音频尚未开始播放'
  playSelectionBtn.disabled = true
}

function saveCurrentRegion() {
  if (!state.activeFileName || !state.regionsPlugin) return
  const regions = state.regionsPlugin.getRegions()
  if (!regions.length) {
    alert('你还没有框选任何区间。')
    return
  }
  const region = regions[0]
  state.regions[state.activeFileName] = {
    start: Number(region.start.toFixed(3)),
    end: Number(region.end.toFixed(3)),
  }
  renderFileList()
  closeModal()
}

function clearCurrentRegion() {
  if (!state.activeFileName) return
  delete state.regions[state.activeFileName]
  renderFileList()
  closeModal()
}

function buildResultTags(item) {
  const tags = []
  tags.push(`<span class="tag ${item.respiratory_rate_bpm?.value ? 'good' : 'warn'}">呼吸频率：${item.respiratory_rate_bpm?.value ?? '未得出'}</span>`)
  tags.push(`<span class="tag ${item.heart_rate_bpm?.value ? 'good' : 'warn'}">心率：${item.heart_rate_bpm?.value ?? '未得出'}</span>`)
  tags.push(`<span class="tag ${item.suspected_wheeze?.present ? 'bad' : 'good'}">干啰音：${item.suspected_wheeze?.present ? '疑似存在' : '未提示'}</span>`)
  tags.push(`<span class="tag ${item.suspected_crackle?.present ? 'bad' : 'good'}">湿啰音：${item.suspected_crackle?.present ? '疑似存在' : '未提示'}</span>`)
  tags.push(`<span class="tag ${(item.respiratory_phases?.confidence ?? 0) >= 0.45 ? 'good' : 'warn'}">相位置信度：${item.respiratory_phases?.confidence ?? '0.0'}</span>`)
  tags.push(`<span class="tag ${(item.artifact_summary?.count ?? 0) > 0 ? 'warn' : 'good'}">机械伪差候选：${item.artifact_summary?.count ?? 0}</span>`)
  return tags.join('')
}

function renderResults(data) {
  resultsSection.classList.remove('hidden')
  resultsList.innerHTML = ''
  zipLink.href = API_BASE + data.zip_download_url

  data.results.forEach(item => {
    const div = document.createElement('div')
    div.className = 'result-item'
    div.innerHTML = `
      <h3>${item.original_name}</h3>
      <div>${buildResultTags(item)}</div>
      <div class="metric-grid">
        <div class="metric"><strong>时长</strong><br>${item.duration_seconds} 秒</div>
        <div class="metric"><strong>采样率</strong><br>${item.sampling_rate_hz} Hz</div>
        <div class="metric"><strong>RMS 处理前</strong><br>${item.rms_before}</div>
        <div class="metric"><strong>RMS 处理后</strong><br>${item.rms_after}</div>
        <div class="metric"><strong>呼吸频率置信度</strong><br>${item.respiratory_rate_bpm?.confidence ?? '-'}</div>
        <div class="metric"><strong>心率置信度</strong><br>${item.heart_rate_bpm?.confidence ?? '-'}</div>
      </div>
      <div class="result-links">
        <a href="${API_BASE}${item.download_url}" target="_blank" rel="noopener">下载处理后 mp3</a>
        <a href="${API_BASE}${item.original_spectrogram_url}" target="_blank" rel="noopener">查看处理前频谱图</a>
        <a href="${API_BASE}${item.processed_spectrogram_url}" target="_blank" rel="noopener">查看处理后频谱图</a>
      </div>
      <audio class="audio-preview result-audio" controls preload="none" src="${API_BASE}${item.download_url}"></audio>
      <div class="phase-summary ${(item.respiratory_phases?.confidence ?? 0) >= 0.45 ? 'phase-good' : 'phase-warn'}">
        <strong>呼吸相位可视化：</strong>
        ${item.respiratory_phases?.message || '未生成相位说明'}
      </div>
      <div class="result-image-grid">
        <div>
          <div class="image-caption">处理前频谱图</div>
          <img class="result-image" src="${API_BASE}${item.original_spectrogram_url}" alt="${item.original_name} 处理前频谱图" />
        </div>
        <div>
          <div class="image-caption">处理后频谱图（含吸?/呼?可视化）</div>
          <img class="result-image" src="${API_BASE}${item.processed_spectrogram_url}" alt="${item.original_name} 处理后频谱图" />
        </div>
      </div>
      <ul class="note-list">
        ${(item.caution || []).map(text => `<li>${text}</li>`).join('')}
      </ul>
    `
    resultsList.appendChild(div)
  })
}

async function processFiles() {
  if (!state.files.length) {
    alert('请先上传音频文件。')
    return
  }

  clearResults()
  setStatus('正在上传并批量处理，请不要关闭页面。')
  processBtn.disabled = true

  const formData = new FormData()
  state.files.forEach(file => formData.append('files', file, file.name))
  formData.append('manifest_json', JSON.stringify({
    settings: getSettings(),
    regions: state.regions,
  }))

  try {
	const resp = await fetch(`${API_BASE}/api/process`, {
	  method: 'POST',
      body: formData,
    })

    const rawText = await resp.text()
    let data = null
    try {
      data = rawText ? JSON.parse(rawText) : null
    } catch (e) {
      data = null
    }

    if (!resp.ok) {
      throw new Error((data && data.detail) || rawText || `服务器处理失败（HTTP ${resp.status}）`)
    }
    if (!data) {
      throw new Error('服务器返回为空，无法解析处理结果。')
    }

    renderResults(data)
    setStatus(`处理完成：共 ${data.count} 个文件。你现在可以下载单个 mp3，或下载全部压缩包。`)
  } catch (error) {
    console.error(error)
    setStatus(`处理失败：${error.message}`, true)
  } finally {
    processBtn.disabled = false
  }
}

fileInput.addEventListener('change', event => {
  const selected = Array.from(event.target.files || [])
  if (selected.length > 8) {
    alert('一次最多只能上传 8 个文件。')
    fileInput.value = ''
    return
  }
  revokeAllObjectUrls()
  state.files = selected
  state.regions = {}
  renderFileList()
  clearResults()
  setStatus('文件已载入。你现在可以先试听原始音频，再逐个框选环境噪声区间。')
})

fileList.addEventListener('click', event => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  const action = target.dataset.action
  const encodedName = target.dataset.name
  if (!action || !encodedName) return
  const fileName = decodeURIComponent(encodedName)

  if (action === 'region') {
    openModalForFile(fileName)
  } else if (action === 'remove') {
    state.files = state.files.filter(file => file.name !== fileName)
    delete state.regions[fileName]
    revokeObjectUrl(fileName)
    renderFileList()
    if (!state.files.length) fileInput.value = ''
  }
})

playFullBtn.addEventListener('click', () => {
  if (!state.wavesurfer) return
  state.wavesurfer.playPause()
  updatePlaybackInfo()
})

stopAudioBtn.addEventListener('click', () => {
  if (!state.wavesurfer) return
  state.wavesurfer.stop()
  updatePlaybackInfo()
})

playSelectionBtn.addEventListener('click', () => {
  if (!state.wavesurfer || !state.regionsPlugin) return
  const regions = state.regionsPlugin.getRegions()
  if (!regions.length) {
    alert('请先框选一段噪声区间。')
    return
  }
  const region = regions[0]
  state.wavesurfer.stop()
  state.wavesurfer.play(region.start, region.end)
  playbackInfo.textContent = `正在试听框选区间：${formatSeconds(region.start)}s ~ ${formatSeconds(region.end)}s`
})

processBtn.addEventListener('click', processFiles)
clearBtn.addEventListener('click', () => {
  revokeAllObjectUrls()
  state.files = []
  state.regions = {}
  fileInput.value = ''
  renderFileList()
  clearResults()
  setStatus('已清空当前文件列表。')
})
closeModalBtn.addEventListener('click', closeModal)
saveRegionBtn.addEventListener('click', saveCurrentRegion)
clearRegionBtn.addEventListener('click', clearCurrentRegion)
modal.addEventListener('click', event => {
  if (event.target === modal) closeModal()
})
window.addEventListener('beforeunload', revokeAllObjectUrls)

renderFileList()
setStatus('等待处理')
