const {app, BrowserWindow, screen, ipcMain} = require('electron')
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

const openFirstScreenWindow = async (fullscreen) => {
    let firstDisplayWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width: config.webview_width,
        height: config.webview_height,
        fullscreen,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    if (!fs.existsSync('./site/index.html')) {
        await downloadWebsite()
    }

    await firstDisplayWindow.loadFile('./site/index.html')
}

const openSecondScreenWindow = async (externalDisplay, fullscreen) => {
    let secondDisplayWindow = new BrowserWindow({
        x: externalDisplay.bounds.x,
        y: externalDisplay.bounds.y,
        width: externalDisplay.bounds.width,
        height: externalDisplay.bounds.height,
        fullscreen,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    await secondDisplayWindow.loadFile('./site/index.html')

    secondDisplayWindow.webContents.on('did-fail-load', () => {
        secondDisplayWindow.loadFile('./src/error.html')
    });

    secondDisplayWindow.webContents.on('did-finish-load', () => {
        if (secondDisplayWindow.webContents.getURL() === config.hostname) {
            secondDisplayWindow.webContents.executeJavaScript(`
                document.getElementById('username').value = '${config.http_username}';
                document.getElementById('password').value = '${config.http_password}';
                document.querySelector('form').submit();
            `)
        }
    })
}

const localVersionOfSiteWasDownloaded = () => {
    return fs.existsSync('./site/index.html')
}

const createMainWindow = async (fullscreen) => {
    const displays = screen.getAllDisplays()
    const secondScreensParams = displays.find(display => display.bounds.x !== 0 || display.bounds.y !== 0)
    const secondScreenIsAvailable = secondScreensParams || false

    if (secondScreenIsAvailable) {
        try {
            if (!localVersionOfSiteWasDownloaded()) await downloadWebsite()
            await openSecondScreenWindow(secondScreensParams, fullscreen)
            if (!config.run_on_single_display) await openFirstScreenWindow(fullscreen)
        } catch (err) {
            console.error('Error when opening a local copy of site:', err)
        }
    } else {
        await openFirstScreenWindow(fullscreen)
    }
}

const openChoiceWindow = async () => {
    let choiceWindow = await createChoiceWindow()

    ipcMain.on('choice-made', async (event, choice) => {
        choiceWindow.close()
        await createMainWindow(choice === 'full-screen')
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
    if (config.always_show_webview === false) return

    config.load_debug_page ? await openChoiceWindow() : await createMainWindow('full-screen')

    await sendPing()
    setInterval(sendPing, 3600000)
})