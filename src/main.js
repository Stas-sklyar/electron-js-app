const {app, BrowserWindow, screen, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
import scrape from 'website-scraper' // only as ESM, no CommonJS
import config from '../config.js'

const downloadWebsite = async () => {
    try {
        await scrape({
            urls: [config.hostname],
            directory: './site'
        });

        console.log('Website successfully downloaded')
    } catch (err) {
        console.error('Error downloading website:', err)
        throw err
    }
};

const sendPing = async () => {
    try {
        await fetch(`https://sample.com`, {})
        console.log('ping!')
    } catch (err) {
        console.error('Error when sending a ping:', err)
    }
}

const currentSiteVersionIsActual = async () => {
    try {
        const response = await fetch(`https://sample.com`, {})
        return response.data.currentSiteVersionIsActual
    } catch (err) {
        console.error('Error when checking the current version of the site:', err)
        throw err
    }
}

const createChoiceWindow = async () => {
    const choiceWindow = new BrowserWindow({
        width: 400,
        height: 200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    await choiceWindow.loadFile('./src/choice.html')
    return choiceWindow
}

const createMainWindow = async (fullscreen) => {
    const displays = screen.getAllDisplays()
    const externalDisplay = displays.find(display => display.bounds.x !== 0 || display.bounds.y !== 0)

    // if (externalDisplay) {
    //   let win = new BrowserWindow({
    //     x: externalDisplay.bounds.x,
    //     y: externalDisplay.bounds.y,
    //     width: externalDisplay.bounds.width,
    //     height: externalDisplay.bounds.height,
    //     webPreferences: {
    //       preload: path.join(__dirname, 'preload.js')
    //     }
    //   })
    //
    //   win.loadURL(config.hostname)
    //   // win.setFullScreen(true)
    //   win.webContents.openDevTools()
    // }
    let win = new BrowserWindow({
        x: 0,
        y: 0,
        width: parseInt(config.non_full_screen_height),
        height: parseInt(config.non_full_screen_width),
        fullscreen,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    try {
        if (!fs.existsSync('./site/index.html')) {
            await downloadWebsite()
        }
        await win.loadFile('./site/index.html')
    } catch (err) {
        console.error('Error when opening a local copy of site:', err)
    }

    win.webContents.on('did-fail-load', () => {
        win.loadFile('./src/error.html')
    });

    win.webContents.on('did-finish-load', () => {
        if (win.webContents.getURL() === config.hostname) {
            win.webContents.executeJavaScript(`
                document.getElementById('username').value = '${config.http_username}';
                document.getElementById('password').value = '${config.http_password}';
                document.querySelector('form').submit();
            `)
        }
    })
}

if (require('electron-squirrel-startup')) {
    app.quit()
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('ready', async () => {
    let choiceWindow = await createChoiceWindow()

    ipcMain.on('choice-made', async (event, choice) => {
        choiceWindow.close()
        await createMainWindow(choice === 'full-screen')
    })

    await sendPing()
    setInterval(sendPing, 3600000)
})