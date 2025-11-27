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

    // Prevent double processing
    if (target.dataset.processed === 'true') return
    target.dataset.processed = 'true'

    const boldElements = target.querySelectorAll('b')

    boldElements.forEach((bold) => {
      const fieldName = bold.textContent.trim()

      // Special handling for Unit field
      if (fieldName === 'Unit') {
        handleUnitField(bold)
      } else {
        handleStandardField(bold)
      }
    })
  }

  function handleStandardField(boldElement) {
    let currentNode = boldElement.nextSibling
    let textContent = ''

    // Collect text until we hit a <br>, another <b>, or end of content
    while (currentNode) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const text = currentNode.textContent.trim()
        if (text) {
          textContent += (textContent ? ' ' : '') + text
        }
      } else if (
        currentNode.nodeName === 'BR' ||
        currentNode.nodeName === 'B'
      ) {
        break
      }
      currentNode = currentNode.nextSibling
    }

    if (textContent) {
      addCopyButton(boldElement, textContent)
    }
  }

  function handleUnitField(boldElement) {
    let currentNode = boldElement.nextSibling
    let addressLines = []
    let currentLine = ''

    // Collect address content until we hit phone numbers or next <b> tag
    while (currentNode) {
      if (currentNode.nodeName === 'B') {
        break
      }

      if (currentNode.nodeType === Node.TEXT_NODE) {
        const text = currentNode.textContent.trim()

        // Check if this line contains a phone label (Mobile:, Office:, Home:)
        const phoneMatch = text.match(/^(Mobile|Office|Home):\s*(.+)/)
        if (phoneMatch) {
          // Stop collecting address lines
          if (currentLine) {
            addressLines.push(currentLine)
            currentLine = ''
          }

          // Add copy button for this phone number
          const phoneLabel = phoneMatch[1]
          const phoneNumber = phoneMatch[2].trim()
          addPhoneCopyButton(currentNode, phoneLabel, phoneNumber)

          // Continue to next node to process remaining phones
          currentNode = currentNode.nextSibling
          continue
        }

        if (text) {
          currentLine += (currentLine ? ' ' : '') + text
        }
      } else if (currentNode.nodeName === 'BR') {
        if (currentLine) {
          addressLines.push(currentLine)
          currentLine = ''
        }
      }

      currentNode = currentNode.nextSibling
    }

    // Don't forget the last address line if there's no trailing <br>
    if (currentLine && !currentLine.match(/^(Mobile|Office|Home):/)) {
      addressLines.push(currentLine)
    }

    const fullAddress = addressLines.join('\n')

    if (fullAddress) {
      addCopyButton(boldElement, fullAddress)
    }
  }

  function addPhoneCopyButton(textNode, label, phoneNumber) {
    // Create a wrapper span to hold the formatted content
    const wrapper = document.createElement('span')
    wrapper.style.position = 'relative'
    wrapper.style.display = 'inline-block'

    // Create label span
    const labelSpan = document.createElement('span')
    labelSpan.textContent = `${label}: ${phoneNumber}`

    // Create copy button
    const btn = document.createElement('button')
    btn.className = 'copy-btn phone-copy-btn'
    btn.style.marginLeft = '8px'
    btn.style.verticalAlign = 'middle'
    btn.innerHTML = `<span class="copy-icon">📋</span>`

    wrapper.appendChild(labelSpan)
    wrapper.appendChild(btn)

    // Replace the text node with our wrapper
    textNode.parentNode.insertBefore(wrapper, textNode)
    textNode.textContent = '' // Clear original text

    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(phoneNumber)
      btn.innerHTML = '✅'
      setTimeout(
        () => (btn.innerHTML = `<span class="copy-icon">📋</span>`),
        1000
      )
    })
  }

  function addCopyButton(element, textToCopy) {
    // Create wrapper for the bold element
    const wrapper = document.createElement('span')
    wrapper.className = 'field-wrapper'
    wrapper.style.position = 'relative'
    wrapper.style.display = 'inline-block'

    element.parentNode.insertBefore(wrapper, element)
    wrapper.appendChild(element)

    // Create copy button
    const btn = document.createElement('button')
    btn.className = 'copy-btn field-copy-btn'
    btn.style.marginLeft = '8px'
    btn.style.verticalAlign = 'middle'
    btn.innerHTML = `<span class="copy-icon">📋</span>`

    wrapper.appendChild(btn)

    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(textToCopy)
      btn.innerHTML = '✅'
      setTimeout(
        () => (btn.innerHTML = `<span class="copy-icon">📋</span>`),
        1000
      )
    })
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
