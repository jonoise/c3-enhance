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

    // Find the first span (property name)
    const nameSpan = anchor.querySelector('span[itemprop="name"]')
    if (!nameSpan) return

    // Create wrapper for the name span
    const wrapper = document.createElement('span')
    wrapper.style.position = 'relative'
    wrapper.style.display = 'inline-block'
    wrapper.style.marginRight = '8px'

    nameSpan.parentNode.insertBefore(wrapper, nameSpan)
    wrapper.appendChild(nameSpan)

    // Create copy button
    const btn = document.createElement('button')
    btn.className = 'copy-btn address-copy-btn'
    btn.style.marginLeft = '8px'
    btn.style.verticalAlign = 'middle'
    btn.innerHTML = `<span class="copy-icon">📋</span>`

    wrapper.appendChild(btn)

    btn.addEventListener('click', (e) => {
      e.preventDefault() // Prevent anchor navigation

      // Get property name
      const propertyName = nameSpan.textContent.trim()

      // Get address components
      const streetSpan = anchor.querySelector(
        'span[data-selenium-id="address_street"]'
      )
      const citySpan = anchor.querySelector(
        'span[data-selenium-id="address_city"]'
      )
      const stateSpan = anchor.querySelector(
        'span[data-selenium-id="address_state"]'
      )
      const zipSpan = anchor.querySelector(
        'span[data-selenium-id="address_zip"]'
      )

      // Build address string
      const addressParts = []

      if (propertyName) addressParts.push(propertyName)
      if (streetSpan)
        addressParts.push(streetSpan.textContent.trim().replace(/\s+/g, ' '))

      // Combine city, state, zip on one line
      const cityStateZip = []
      if (citySpan) cityStateZip.push(citySpan.textContent.trim())
      if (stateSpan) cityStateZip.push(stateSpan.textContent.trim())
      if (zipSpan) cityStateZip.push(zipSpan.textContent.trim())

      if (cityStateZip.length > 0) {
        addressParts.push(cityStateZip.join(' '))
      }

      const fullAddress = addressParts.join('\n')

      navigator.clipboard.writeText(fullAddress)

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
    // Check if already processed
    if (boldElement.dataset.unitProcessed === 'true') return
    boldElement.dataset.unitProcessed = 'true'

    let currentNode = boldElement.nextSibling
    let addressTexts = [] // Collect address lines
    let addressNodes = [] // Track nodes to remove later

    // Process all nodes until we hit another <b> tag
    while (currentNode) {
      const nextNode = currentNode.nextSibling

      // Stop if we hit another <b> tag
      if (currentNode.nodeName === 'B') {
        break
      }

      // If it's a text node with actual content
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const text = currentNode.textContent.trim()

        if (text) {
          // Check if it's a phone line
          const isPhoneLine = /^(Mobile|Home|Office|Fax):/i.test(text)

          if (isPhoneLine) {
            // First, wrap any accumulated address text
            if (addressTexts.length > 0) {
              wrapAddressGroup(boldElement, addressTexts, addressNodes)
              addressTexts = []
              addressNodes = []
            }

            // Then handle this phone line separately
            wrapPhoneLine(currentNode, text)
          } else {
            // Accumulate address text
            addressTexts.push(text)
            addressNodes.push(currentNode)
          }
        }
      }

      currentNode = nextNode
    }

    // Wrap any remaining address text
    if (addressTexts.length > 0) {
      wrapAddressGroup(boldElement, addressTexts, addressNodes)
    }
  }

  function wrapAddressGroup(boldElement, texts, nodes) {
    if (texts.length === 0 || nodes.length === 0) return

    const fullAddress = texts.join('\n')

    // Create span for the address group
    const span = document.createElement('span')
    span.className = 'unit-address-group'
    span.style.position = 'relative'
    span.style.display = 'inline'
    span.textContent = texts[0] // Start with first line

    // Replace the first text node with the span
    nodes[0].parentNode.insertBefore(span, nodes[0])

    // Add remaining lines with <br> inside the span
    for (let i = 1; i < texts.length; i++) {
      span.appendChild(document.createElement('br'))
      span.appendChild(document.createTextNode(texts[i]))
    }

    // Remove all original text nodes
    nodes.forEach((node) => {
      if (node.parentNode) {
        node.parentNode.removeChild(node)
      }
    })

    // Create copy button inside the span
    const btn = document.createElement('button')
    btn.className = 'copy-btn unit-address-copy-btn'
    btn.style.marginLeft = '8px'
    btn.style.verticalAlign = 'middle'
    btn.innerHTML = `<span class="copy-icon">📋</span>`

    span.appendChild(btn)

    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(fullAddress)
      btn.innerHTML = '✅'
      setTimeout(
        () => (btn.innerHTML = `<span class="copy-icon">📋</span>`),
        1000
      )
    })
  }

  function wrapPhoneLine(textNode, text) {
    // Create span for phone line
    const span = document.createElement('span')
    span.className = 'unit-phone-item'
    span.style.position = 'relative'
    span.style.display = 'inline'
    span.textContent = text

    // Replace text node with span
    textNode.parentNode.insertBefore(span, textNode)
    textNode.parentNode.removeChild(textNode)

    // Create copy button inside the span
    const btn = document.createElement('button')
    btn.className = 'copy-btn unit-phone-copy-btn'
    btn.style.marginLeft = '8px'
    btn.style.verticalAlign = 'middle'
    btn.innerHTML = `<span class="copy-icon">📋</span>`

    span.appendChild(btn)

    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(text)
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

      ta.parentNode.insertBefore(wrapper, ta)
      wrapper.appendChild(ta)

      // cog icon button
      const btn = document.createElement('button')
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
      btn.type = 'button'

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
