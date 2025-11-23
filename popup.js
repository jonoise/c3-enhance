chrome.storage.sync.get(['enabled'], ({ enabled }) => {
  const btn = document.getElementById('toggleBtn')
  enabled = enabled ?? true

  updateButton(enabled)

  btn.addEventListener('click', () => {
    enabled = !enabled
    chrome.storage.sync.set({ enabled })
    updateButton(enabled)
  })

  function updateButton(state) {
    btn.textContent = state ? 'Extension ON' : 'Extension OFF'
    btn.classList.toggle('active', state)
  }
})
