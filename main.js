/* global SceneItem */
const ITEMS = []
const SCENE = { island: null, scene: null, background: null, backgroundCSS: {}, items: [] }
window.currentBGImageURL = ''
const PATHS = [
  'artificial-island',
  'oceanic-island',
  'tidal-island',
  'coral-island'
]

// .............................................................................
// UTIL FUNCTIONS

function formattedFilename (filename) {
  const lowerCaseFilename = filename.toLowerCase()
  return lowerCaseFilename.replace(/\s+/g, '_')
}

function validateImageName (filename) {
  const formatted = formattedFilename(filename)
  if (!/\.(jpeg|jpg|png)$/.test(formatted)) {
    window.alert('Invalid file extension. Only jpg and png files are allowed.')
    return null
  }
  return formatted
}

function createSelection (opts) {
  const sel = (opts.select)
    ? document.querySelector(opts.select)
    : document.createElement('select')
  sel.innerHTML = ''

  if (opts.onChange) {
    sel.onchange = opts.onChange
  }

  opts.list.forEach(item => {
    const opt = document.createElement('option')
    opt.textContent = item
    opt.value = item
    sel.appendChild(opt)
  })

  if (!opts.select && opts.parent) {
    if (typeof opts.parent === 'string') {
      document.querySelector(opts.parent).appendChild(sel)
    } else {
      opts.parent.appendChild(sel)
    }
  }
}

// .............................................................................
// BACKGROUND FUNCTION
function updateBackground (opts) {
  const bgEle = document.querySelector('#background-container')

  if (opts.delete) {
    window.currentBGImageURL = null
    SCENE.background = null
    SCENE.backgroundCSS = {}
    // update bg-related DOM
    bgEle.style.backgroundImage = null
    document.querySelectorAll('.css-row').forEach(e => { e.style.display = 'none' })
    document.querySelectorAll('#background-settings input[type="range"]')
      .forEach(e => { e.style.display = 'none' })
  }

  const update = (obj) => {
    const imageUrl = obj.blob ? URL.createObjectURL(obj.blob) : obj.dataURL
    window.currentBGImageURL = imageUrl
    SCENE.background = obj.name
    SCENE.backgroundCSS = obj.css || {
      'background-attachment': 'fixed',
      'background-size': 'cover',
      'background-position': 'center',
      'background-repeat': 'no-repeat'
    }
    // update bg-related DOM
    bgEle.style.backgroundImage = `url(${imageUrl})`
    for (const prop in SCENE.backgroundCSS) {
      bgEle.style[prop] = SCENE.backgroundCSS[prop]
    }
    document.querySelectorAll('.css-row').forEach(e => { e.style.display = 'flex' })
    document.querySelectorAll('#background-settings input[type="range"]')
      .forEach(e => {
        const prop = e.name.substring(0, e.name.length - 2)
        const val = SCENE.backgroundCSS[prop]
        if (!val || val === 'custom') e.style.display = 'block'
      })
  }

  if (!opts.eve) return update(opts)

  const file = opts.eve.target.files[0]
  if (file) {
    const name = validateImageName(file.name)
    if (!name) return
    const reader = new window.FileReader()
    reader.onload = e => update({ dataURL: e.target.result, name })
    reader.readAsDataURL(file)
  }
}

// .............................................................................
// SCENE ITEM FUNCTIONS

function addItem (itemData, name, b64) { // add item data to SCENE json data
  itemData.src = name
  itemData.data = b64
  SCENE.items.push(itemData)
  const list = SCENE.items.map(i => i.src)
  createSelection({ select: '#scene-items', list })
}

function deleteItem () {
  const sel = document.querySelector('#scene-items')
  const obj = SCENE.items.find(i => i.src === sel.value)
  if (!obj) return
  const idx = SCENE.items.indexOf(obj)
  const sio = ITEMS.find(i => i.src === obj.data)
  const sii = ITEMS.indexOf(sio)
  sio.remove()
  ITEMS.splice(sii, 1)
  SCENE.items.splice(idx, 1)
  const list = SCENE.items.map(i => i.src)
  createSelection({ select: '#scene-items', list })
}

function updateItem (item) { // update existing SCENE item data in json
  const obj = SCENE.items.find(obj => obj.data === item.src)
  const idx = SCENE.items.indexOf(obj)
  const itemData = item.getData()
  itemData.data = itemData.src
  itemData.src = SCENE.items[idx].src
  SCENE.items[idx] = itemData
}

function addItems (event) { // create SceneItem instances and add data to SCENE
  const files = event.target.files
  if (!files.length) return

  Array.from(files).forEach(file => {
    const name = validateImageName(file.name)
    if (!name) return
    const reader = new window.FileReader()
    reader.onload = function (e) {
      // create a new SceneItem instance
      const newItem = new SceneItem({
        interactive: true,
        customContextMenu: true,
        src: e.target.result
      })
      // add item to list with all other items
      ITEMS.push(newItem)
      // add item data to list of item data in the SCENE JSON data
      addItem(newItem.getData(), name, e.target.result)
      // render the item onto the page
      newItem.render({
        all: ITEMS,
        // update SCENE JSON data when item changes
        update: (item) => updateItem(item)
      })
    }
    reader.readAsDataURL(file)
  })
}

// .............................................................................
// SETUP

function setupNavToggle () {
  const navItems = document.querySelectorAll('nav > span')
  navItems.forEach(item => {
    item.addEventListener('click', function () {
      const menuArea = document.querySelector(`#${item.dataset.menu}`)
      if (menuArea.style.display === 'block') {
        menuArea.style.display = 'none'
        item.style.opacity = '0.5'
      } else {
        menuArea.style.display = 'block'
        item.style.opacity = '1'
      }
    })
  })
}

function setupSlider (prop, axis, ele) {
  const bgEle = document.querySelector('#background-container')
  const slider = document.createElement('input')
  slider.name = `${prop}-${axis}`
  slider.style.display = 'none'
  slider.type = 'range'
  slider.min = prop === 'background-size' ? 0 : 0 // for 'background-position'
  slider.max = prop === 'background-size' ? 200 : 100 // for 'background-position
  slider.value = SCENE.backgroundCSS[slider.name] || 50
  slider.addEventListener('input', (e) => {
    let value = e.target.value
    value = (prop === 'background-size' && value === '0') ? 'auto' : value
    SCENE.backgroundCSS[slider.name] = value
    const x = SCENE.backgroundCSS[`${prop}-x`]
    const y = SCENE.backgroundCSS[`${prop}-y`]
    bgEle.style[prop] = `${x === 'auto' ? x : x + '%'} ${y === 'auto' ? y : y + '%'}`
  })
  ele.appendChild(slider)
}

function setupBackgroundCSSMenu () {
  const ele = document.querySelector('#background-settings')
  const bgEle = document.querySelector('#background-container')
  const CSS = {
    // 'background-attachment': ['fixed', 'scroll'],
    'background-size': ['cover', 'contain', 'custom'],
    'background-position': ['center', 'custom'],
    'background-repeat': ['no-repeat', 'repeat', 'repeat-x', 'repeat-y', 'space', 'round']
  }

  for (const prop in CSS) {
    const row = document.createElement('div')
    row.className = 'css-row'
    ele.appendChild(row)
    // create CSS property label
    const label = document.createElement('span')
    label.textContent = prop + ': '
    row.appendChild(label)
    // create selection drop-down
    createSelection({
      parent: row,
      list: CSS[prop],
      onChange: (e) => {
        const value = e.target.value
        const xSlider = e.target.parentNode.nextSibling
        const ySlider = (xSlider) ? xSlider.nextSibling : {}
        if (value === 'custom') {
          xSlider.style.display = 'block'
          ySlider.style.display = 'block'
          const x = SCENE.backgroundCSS[`${prop}-x`] = xSlider.value
          const y = SCENE.backgroundCSS[`${prop}-y`] = ySlider.value
          bgEle.style[prop] = `${x}% ${y}%`
          SCENE.backgroundCSS[prop] = value
        } else {
          if (xSlider && xSlider.style) xSlider.style.display = 'none'
          if (ySlider && ySlider.style) ySlider.style.display = 'none'
          bgEle.style[prop] = value
          SCENE.backgroundCSS[prop] = value
        }
      }
    })
    // create sliders for custom values
    if (CSS[prop].includes('custom')) {
      setupSlider(prop, 'x', ele)
      setupSlider(prop, 'y', ele)
    }
  }
}

// ................................................................ MAIN .......

function setup () {
  // setup the navigation toggle
  setupNavToggle()
  // setup naming logic
  createSelection({ select: '#island', list: PATHS })
  const islandSel = document.querySelector('#island')
  const nameField = document.querySelector('#scene-name')
  islandSel.addEventListener('change', () => { SCENE.island = islandSel.value })
  nameField.addEventListener('input', () => { SCENE.scene = formattedFilename(nameField.value) })
  nameField.value = ''
  // setup background image logic
  const bgInput = document.getElementById('bg-input')
  bgInput.addEventListener('change', e => updateBackground({ eve: e }))
  document.getElementById('custom-bg-button')
    .addEventListener('click', () => bgInput.click())
  document.querySelector('#delete-background')
    .addEventListener('click', () => updateBackground({ delete: true }))
  bgInput.value = ''
  setupBackgroundCSSMenu()
  // setup additional items logic
  const itemsInput = document.getElementById('items-input')
  itemsInput.addEventListener('change', addItems)
  document.getElementById('custom-items-button')
    .addEventListener('click', () => itemsInput.click())
  document.querySelector('#delete-item').addEventListener('click', deleteItem)
  // setup save/download button
  const download = document.querySelector('#download')
  download.addEventListener('click', window.downloadData)
  // setup open/load zip button
  const zipInput = document.getElementById('zip-input')
  zipInput.addEventListener('change', window.loadData)
  const customZipButton = document.getElementById('custom-zip-button')
  customZipButton.addEventListener('click', () => zipInput.click())
}

window.addEventListener('load', setup)
