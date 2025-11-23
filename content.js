;(function () {
  let enabled = true

  chrome.storage.sync.get(['enabled'], ({ enabled: stored }) => {
    enabled = stored ?? true
    if (enabled) runExtension()
  })

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      enabled = changes.enabled.newValue
      location.reload()
    }
  })

  function runExtension() {
    const target = document.getElementById('resinfodiv')
    if (!target) return

    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent
        const regex = /"([^\"]+)"/g

        let match
        let fragments = []
        let lastIndex = 0

        while ((match = regex.exec(text)) !== null) {
          const quoted = match[1]

          if (match.index > lastIndex) {
            fragments.push(
              document.createTextNode(text.slice(lastIndex, match.index))
            )
          }

          const wrapper = document.createElement('span')
          wrapper.className = 'quote-wrapper'

          const quoteSpan = document.createElement('span')
          quoteSpan.textContent = `"${quoted}"`

          const btn = document.createElement('button')
          btn.className = 'copy-btn'
          btn.innerHTML = `<span class="copy-icon">📋</span>`

          btn.addEventListener('click', () => {
            navigator.clipboard.writeText(quoted)
            btn.innerHTML = '✅'
            setTimeout(
              () => (btn.innerHTML = `<span class="copy-icon">📋</span>`),
              1000
            )
          })

          wrapper.appendChild(quoteSpan)
          wrapper.appendChild(btn)

          fragments.push(wrapper)

          lastIndex = regex.lastIndex
        }

        if (lastIndex < text.length) {
          fragments.push(document.createTextNode(text.slice(lastIndex)))
        }

        if (fragments.length > 0) {
          const parent = node.parentNode
          fragments.forEach((f) => parent.insertBefore(f, node))
          parent.removeChild(node)
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        ;[...node.childNodes].forEach(processNode)
      }
    }
    processNode(target)
  }
})()
