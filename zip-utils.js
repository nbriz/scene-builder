/* global SceneItem, JSZip, SCENE, ITEMS, currentBGImageURL, updateBackground, addItem, updateItem */

window.downloadData = function () {
  if (!SCENE.scene) {
    return window.alert('You must name your scene before downloading data.')
  }

  if (!SCENE.island) {
    SCENE.island = document.querySelector('#island').value
  }

  SCENE.container = SCENE.items[0] ? SCENE.items[0].container : 'body'

  // Create a copy of the json object without the data fields for items
  const jsonCopy = JSON.parse(JSON.stringify(SCENE))
  jsonCopy.items.forEach(item => delete item.data)

  // Convert the json object to a JSON file
  const jsonData = JSON.stringify(jsonCopy, null, 2)
  const jsonBlob = new window.Blob([jsonData], { type: 'application/json' })

  // Convert the image URL to a Blob
  window.fetch(currentBGImageURL)
    .then(response => response.blob())
    .then(imageBlob => {
      // Create a zip file
      const zip = new JSZip()
      zip.file(SCENE.background, imageBlob)
      zip.file(`${SCENE.scene}.json`, jsonBlob)

      // Add additional images to the zip
      SCENE.items.forEach(item => {
        const base64Data = item.data.split(',')[1]
        zip.file(item.src, base64Data, { base64: true })
      })

      // Generate the zip file and trigger the download
      zip.generateAsync({ type: 'blob' })
        .then(zipBlob => {
          const link = document.createElement('a')
          link.href = URL.createObjectURL(zipBlob)
          link.download = `${SCENE.scene}.zip`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        })
    })
    .catch(error => {
      console.error('Error generating the zip file:', error)
    })
}

window.loadData = function (event) {
  const file = event.target.files[0]
  if (!file) {
    window.alert('Please select a zip file to load.')
    return
  }

  const reader = new window.FileReader()
  reader.onload = function (e) {
    JSZip.loadAsync(e.target.result)
      .then(zip => {
        // Dynamically find the JSON and image files in the zip
        const jsonFile = zip.file(/\.json$/)[0]
        if (!jsonFile) {
          throw new Error('JSON file not found in the zip.')
        }
        return jsonFile.async('string').then(jsonData => {
          const parsedJson = JSON.parse(jsonData)
          Object.assign(SCENE, parsedJson)

          const imageFile = zip.file(new RegExp(parsedJson.background, 'i'))[0]
          if (!imageFile) {
            throw new Error(`Background image file "${parsedJson.background}" not found in the zip.`)
          }

          return Promise.all([
            Promise.resolve(parsedJson),
            imageFile.async('blob'),
            zip
          ])
        })
      })
      .then(([parsedJson, imageBlob, zip]) => {
        // Update the JSON data
        Object.assign(SCENE, parsedJson)

        // Update the background image
        updateBackground({
          blob: imageBlob,
          name: parsedJson.background,
          css: parsedJson.backgroundCSS
        })

        // Update scene name and island selection from the loaded json (if they are part of json data)
        if (parsedJson.scene) {
          SCENE.scene = parsedJson.scene
          document.getElementById('scene-name').value = SCENE.scene
        }
        if (parsedJson.island) {
          SCENE.island = parsedJson.island
          document.getElementById('island').value = SCENE.island
        }

        if (parsedJson.container) {
          SCENE.container = parsedJson.container
        }

        // Load additional items
        if (Array.isArray(parsedJson.items)) {
          SCENE.items = []
          const imagePromises = parsedJson.items.map(item => {
            const file = zip.file(new RegExp(item.src, 'i'))[0]
            if (!file) {
              console.warn(`Image file "${item.src}" not found in the zip.`)
              return Promise.resolve() // Skip this item if the file is not found
            }
            return file.async('base64').then(data => {
              const b64 = `data:image/${file.name.split('.').pop()};base64,${data}`
              // create a new interactive item in the scene
              const newItem = new SceneItem({
                interactive: true,
                action: item.action,
                customContextMenu: true,
                src: b64,
                css: item.css,
                container: item.container
              })
              // add item to list with all other items
              ITEMS.push(newItem)
              // add item data to list of item data in the SCENE JSON data
              addItem(newItem.getData(), item.src, b64)
              newItem.render({ // render the item onto the page
                all: ITEMS,
                update: (item) => updateItem(newItem) // update SCENE JSON data when item changes
              })
            })
          })
          return Promise.all(imagePromises)
        } else {
          console.warn('No items array found in the JSON data.')
        }
      })
      .catch(error => {
        console.error('Error loading the zip file:', error)
        window.alert(`Failed to load the zip file: ${error.message}`)
      })
  }
  reader.readAsArrayBuffer(file)
}
