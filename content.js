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

  function addTextareaFormatter() {
    const textareas = document.querySelectorAll('textarea')
    if (!textareas.length) return

    textareas.forEach((ta) => {
      // prevent duplication
      if (ta.dataset.hasFormatter === 'true') return
      ta.dataset.hasFormatter = 'true'

      // wrapper to position icon
      const wrapper = document.createElement('div')
      wrapper.style.position = 'relative'
      wrapper.style.display = 'inline-block'
      wrapper.style.width = '100%'

      ta.parentNode.insertBefore(wrapper, ta)
      wrapper.appendChild(ta)

      // cog icon button
      const btn = document.createElement('button')
      btn.className = 'textarea-cog-btn'
      btn.innerHTML = '⚙️'
      btn.style.position = 'absolute'
      btn.style.top = '-26px'
      btn.style.right = '0'
      btn.style.fontSize = '14px'
      btn.style.padding = '2px 4px'
      btn.style.cursor = 'pointer'
      btn.style.background = '#fff'
      btn.style.border = '1px solid #ccc'
      btn.style.borderRadius = '4px'

      wrapper.appendChild(btn)

      // popup menu (hidden initially)
      const menu = document.createElement('div')
      menu.className = 'textarea-format-menu'
      menu.style.position = 'absolute'
      menu.style.top = '-2px'
      menu.style.right = '32px'
      menu.style.background = '#fff'
      menu.style.border = '1px solid #ccc'
      menu.style.borderRadius = '4px'
      menu.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)'
      menu.style.fontSize = '12px'
      menu.style.display = 'none'
      menu.style.zIndex = '9999'

      menu.innerHTML = `
      <div class="fmt-opt" data-action="lower" style="padding:4px 8px; cursor:pointer;">lowercase</div>
      <div class="fmt-opt" data-action="upper" style="padding:4px 8px; cursor:pointer;">UPPERCASE</div>
      <div class="fmt-opt" data-action="capitalize" style="padding:4px 8px; cursor:pointer;">Capitalize Each Word</div>
    `

      wrapper.appendChild(menu)

      // toggle menu with cog
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none'
      })

      // apply formatting on menu click
      menu.querySelectorAll('.fmt-opt').forEach((opt) => {
        opt.addEventListener('click', (e) => {
          const action = opt.dataset.action
          applyFormatting(ta, action)
          menu.style.display = 'none'
        })
      })

      // close menu when clicking outside
      document.addEventListener('click', () => {
        menu.style.display = 'none'
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
})()
