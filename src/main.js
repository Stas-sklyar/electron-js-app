const {app, BrowserWindow, screen, ipcMain} = require('electron')
const path = require('path')
const fs = require('fs')
import scrape from 'website-scraper' // only as ESM, no CommonJS
import config from '../config'

const downloadWebsite = async () => {
    try {
        await scrape({
            urls: [config.hostname],
            directory: './site'
        })
    } catch (err) {
        console.error('Error downloading website:', err)
        logMessage('Error', 'Error downloading website:', err)
    }
}

const sendPing = async () => {
    try {
        await fetch(`https://sample.com`, {})
    } catch (err) {
        console.error('Error when sending a ping:', err)
        logMessage('Error', 'Error when sending a ping:', err)
    }
}

const currentSiteVersionIsActual = async () => {
    try {
        const response = await fetch(`https://sample.com`, {})
        return response.data.currentSiteVersionIsActual
    } catch (err) {
        console.error('Error when checking the current version of the site:', err)
        logMessage('Error', 'Error when checking the current version of the site:', err)
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

    secondDisplayWindow.webContents.on('did-finish-load', () => {
        if (secondDisplayWindow.webContents.getURL() === config.hostname) {
            secondDisplayWindow.webContents.executeJavaScript(`
                document.getElementById('username').value = '${config.http_username}'
                document.getElementById('password').value = '${config.http_password}'
                document.querySelector('form').submit()
            `)
        }
    })
}

const localVersionOfSiteWasDownloaded = () => {
    return fs.existsSync('./site/index.html')
}

const logMessage = (messageType, message) => {
    const logsDir = './logs'

    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir)
    }

    const formatTimestampForFilename = () => {
        return new Date().toISOString().replace(/[:.]/g, '-')
    }

    const getLastLogFile = () => {
        const files = fs.readdirSync(logsDir)

        if (files.length === 0) {
            const newLogFilePath = `./logs/log-${formatTimestampForFilename()}.txt`
            fs.writeFileSync(newLogFilePath, '')
            return newLogFilePath
        } else {
            return path.join(logsDir, files.reduce((a, b) => {
                const aStat = fs.statSync(path.join(logsDir, a))
                const bStat = fs.statSync(path.join(logsDir, b))
                return aStat.mtime > bStat.mtime ? a : b
            }))
        }
    }

    const now = new Date()
    const timestamp = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
    const logMessage = `${messageType} ${timestamp}: ${message}\n`
    const logFilePath = getLastLogFile()

    fs.appendFileSync(logFilePath, logMessage)
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
            logMessage('Error', 'Error when opening a local copy of site:', err)
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
})

app.on('ready', async () => {
    if (config.always_show_webview === false) return

    logMessage('Info', 'The application was running')

    config.load_debug_page ? await openChoiceWindow() : await createMainWindow('full-screen')

    if (config.send_ping === true) {
        await sendPing()
        setInterval(sendPing, 3600000)
    }
})