class SceneItem {
  constructor (opts) {
    if (!opts) opts = {}
    this.customCtx = opts.customContextMenu
    this.element = null
    this.activeMode = 0
    this.startX = 0
    this.startY = 0

    this.interactive = opts.interactive || false
    this.action = opts.action
    this.src = opts.src
    this.parentSelector = opts.container || 'body'
    this.parent = document.querySelector(this.parentSelector)
    const css = {
      position: 'fixed',
      left: 10,
      top: 10,
      zIndex: 1,
      width: 20,
      height: 'auto',
      maxHeight: '80vh',
      rotate: 0
    }
    this.style = { ...css, ...opts.css }
  }

  getData () {
    return {
      action: this.action,
      src: this.src,
      container: this.parentSelector,
      css: this.style
    }
  }

  render (opts) {
    if (this.interactive) {
      const err = 'SceneItem: when "interative", the render() method'
      if (!opts) {
        return console.error(err + ' requires an object with { all, update } properties')
      } else if (!opts.all) {
        return console.error(err + '\'s argument requires { all } property, an array which collects all other scene items')
      } else if (!opts.update) {
        return console.error(err + '\'s argument requires { update } property, an callback function for handleing updates')
      }
    }

    const img = document.createElement('img')
    img.src = this.src
    this.parent.appendChild(img)
    this.element = img
    this.updateStyles()

    if (this.interactive) {
      this.addInteractiveListeners(opts)
    } else {
      if (this.action != null) {
        img.classList.add('interactable')
        // ---------------------------------------------
        // TODO: Attach event listeners for each action
        // ---------------------------------------------
      }
    }
  }

  remove () {
    this.element.remove()
  }

  deactivateMode () {
    if (this.activeMode !== 0) {
      this.activeMode = 0
      this.element.style.opacity = '1'
    }
  }

  activeModeMouseMove (e) {
    const vw = window.innerWidth / 100
    const vh = window.innerHeight / 100
    const dx = (e.clientX - this.startX) / vw
    const dy = (e.clientY - this.startY) / vh
    const width = this.element.offsetWidth / vw
    const height = this.element.offsetHeight / vh
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const top = this.initialY + dy
    const right = 100 - width - (this.initialX + dx)
    const bottom = 100 - height - (this.initialY + dy)
    const left = this.initialX + dx

    switch (this.activeMode) {
      case 1:
        // Move
        if (e.clientX < centerX && e.clientY < centerY) {
          this.updatePosition({ top, left })
        } else if (e.clientX >= centerX && e.clientY < centerY) {
          this.updatePosition({ top, right })
        } else if (e.clientX >= centerX && e.clientY >= centerY) {
          this.updatePosition({ bottom, right })
        } else if (e.clientX < centerX && e.clientY >= centerY) {
          this.updatePosition({ bottom, left })
        }
        break
      case 2:
        // Resize
        this.updatePosition({ width: this.startWidth + dx })
        break
      case 3:
        // Rotate
        this.updatePosition({ rotate: this.startRotate + dx })
        break
    }
  }

  updatePosition (newPosition) {
    if (newPosition.left) this.style.right = null
    else if (newPosition.right) this.style.left = null
    if (newPosition.top) this.style.bottom = null
    else if (newPosition.bottom) this.style.top = null

    this.style = { ...this.style, ...newPosition }
    this.updateStyles()
    // Update the scene data json object with the new position
    // const item = SCENE.items.find(item => item.data === this.src)
    // if (item) item.css = this.getData().css
  }

  updateStyles () {
    const ele = this.element
    const css = this.style

    ele.style.position = css.position
    ele.style.left = css.left ? `${css.left}vw` : null
    ele.style.right = css.right ? `${css.right}vw` : null
    ele.style.top = css.top ? `${css.top}vh` : null
    ele.style.bottom = css.bottom ? `${css.bottom}vh` : null
    ele.style.zIndex = css.zIndex

    ele.style.width = css.width ? `${css.width}vw` : null
    ele.style.height = css.height
    ele.style.maxHeight = css.maxHeight

    ele.style.transform = css.rotate ? `rotate(${css.rotate}deg)` : null
  }

  addInteractiveListeners (opts) {
    const img = this.element
    const vw = window.innerWidth / 100
    const vh = window.innerHeight / 100

    // create context menu
    const createContextMenu = (e) => {
      e.preventDefault()
      const cm = document.querySelector('#context-menu')
      if (cm) {
        cm.style.top = `${e.clientY}px`
        cm.style.left = `${e.clientX}px`
        cm.style.display = 'block'
        cm.src = e.target.src
        return // only create contextMenu once
      }

      const contextMenu = document.createElement('div')
      contextMenu.id = 'context-menu'
      contextMenu.src = e.target.src
      contextMenu.style.position = 'fixed'
      contextMenu.style.top = `${e.clientY}px`
      contextMenu.style.left = `${e.clientX}px`
      contextMenu.style.zIndex = 1000
      if (!this.customCtx) {
        contextMenu.style.backgroundColor = '#fff'
        contextMenu.style.border = '1px solid #ccc'
        contextMenu.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)'
      }
      contextMenu.innerHTML = `
        <div id="move-mode" style="${this.customCtx ? '' : 'padding: 8px; cursor: pointer;'}">Move</div>
        <div id="resize-mode" style="${this.customCtx ? '' : 'padding: 8px; cursor: pointer;'}">Resize</div>
        <div id="rotate-mode" style="${this.customCtx ? '' : 'padding: 8px; cursor: pointer;'}">Rotate</div>
      `
      document.body.appendChild(contextMenu)

      contextMenu.querySelectorAll('div').forEach(o => {
        if (!this.customCtx) {
          o.addEventListener('mouseover', () => { o.style.backgroundColor = '#eee' })
          o.addEventListener('mouseout', () => { o.style.backgroundColor = '#fff' })
        }
        o.addEventListener('click', (event) => {
          const src = contextMenu.src
          const item = opts.all.find(item => item.src === src)
          const img = document.querySelector(`img[src="${src}"]`)
          img.style.opacity = '0.7'
          if (event.target.id === 'move-mode') {
            item.activeMode = 1
          } else if (event.target.id === 'resize-mode') {
            item.activeMode = 2
          } else if (event.target.id === 'rotate-mode') {
            item.activeMode = 3
          }
          contextMenu.style.display = 'none'
        })
      })

      document.addEventListener('click', () => { contextMenu.style.display = 'none' })
    }

    // setup event listeners
    img.addEventListener('contextmenu', createContextMenu)
    document.addEventListener('click', (e) => {
      if (e.target.parentNode.id === 'context-menu') return
      this.deactivateMode()
    })
    document.addEventListener('mousemove', (e) => {
      if (this.activeMode !== 0) {
        this.activeModeMouseMove(e)
        opts.update(this)
      }
    })
    img.addEventListener('mousedown', (e) => {
      this.startX = e.clientX
      this.startY = e.clientY
      this.initialX = e.clientX / vw
      this.initialY = e.clientY / vh
      this.startWidth = img.clientWidth / vw
      this.startHeight = img.clientHeight / vh
      this.startRotate = this.style.rotate || 0
    })
  }
}

window.SceneItem = SceneItem
