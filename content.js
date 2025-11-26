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
    copyResidentInfo()
    copyAddressLink()
    addTextareaFormatter()
  }

  function copyAddressLink() {
    const anchor = document.querySelector('a.address-link')
    if (!anchor) return

    // Avoid double injection
    if (anchor.dataset.hasCopyBtn === 'true') return
    anchor.dataset.hasCopyBtn = 'true'

    // Wrap the anchor so the button can be absolutely positioned
    const wrapper = document.createElement('span')
    wrapper.style.position = 'relative'
    wrapper.style.display = 'inline-block'

    anchor.parentNode.insertBefore(wrapper, anchor)
    wrapper.appendChild(anchor)

    // Create copy button
    const btn = document.createElement('button')
    btn.className = 'copy-btn address-copy-btn'
    btn.style.position = 'absolute'
    btn.style.right = '-30px'
    btn.style.top = '50%'
    btn.style.transform = 'translateY(-50%)'
    btn.innerHTML = `<span class="copy-icon">📋</span>`

    wrapper.appendChild(btn)

    btn.addEventListener('click', () => {
      const spans = anchor.querySelectorAll('span')
      const text = [...spans].map((s) => s.textContent.trim()).join(' ')

      navigator.clipboard.writeText(text)

      btn.innerHTML = '✅'
      setTimeout(
        () => (btn.innerHTML = `<span class="copy-icon">📋</span>`),
        1000
      )
    })
  }

  function copyResidentInfo() {
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
          quoteSpan.textContent = `${quoted}`

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
        // Prevent processing our own buttons if run multiple times
        if (node.classList.contains('copy-btn')) return
        ;[...node.childNodes].forEach(processNode)
      }
    }
    processNode(target)
  }
})()

function addTextareaFormatter() {
  const textareas = document.querySelectorAll('textarea')
  if (!textareas.length) return

  textareas.forEach((ta) => {
    // prevent double injection
    if (ta.dataset.hasFormatter === 'true') return
    ta.dataset.hasFormatter = 'true'

    // wrapper so the select positions nicely
    const wrapper = document.createElement('div')
    wrapper.style.position = 'relative'
    wrapper.style.display = 'inline-block'
    wrapper.style.width = '100%'

    ta.parentNode.insertBefore(wrapper, ta)
    wrapper.appendChild(ta)

    // create dropdown
    const select = document.createElement('select')
    select.className = 'text-formatter'
    select.style.position = 'absolute'
    select.style.right = '0'
    select.style.top = '-28px'
    select.style.fontSize = '12px'
    select.style.padding = '2px 4px'

    select.innerHTML = `
      <option value="">Format</option>
      <option value="lower">lowercase</option>
      <option value="upper">UPPERCASE</option>
      <option value="capitalize">Capitalize Each Word</option>
    `

    wrapper.appendChild(select)

    // listen for formatting change
    select.addEventListener('change', () => {
      applyFormatting(ta, select.value)
      // reset dropdown
      setTimeout(() => (select.value = ''), 300)
    })
  })
}

function applyFormatting(textarea, type) {
  let value = textarea.value

  switch (type) {
    case 'lower':
      textarea.value = value.toLowerCase()
      break

    case 'upper':
      textarea.value = value.toUpperCase()
      break

    case 'capitalize':
      textarea.value = value
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
      break
  }
}
