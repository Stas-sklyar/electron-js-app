const {ipcRenderer} = require('electron')
ipcRenderer.on('display-error', (event, errorMessage) => {
    console.log(errorMessage)
    document.getElementById('error-message').innerText = errorMessage
})