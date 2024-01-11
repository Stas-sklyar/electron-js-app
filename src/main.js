const {app, BrowserWindow, screen} = require('electron');
const path = require('path');
const fs = require('fs');
import scrape from 'website-scraper'; // only as ESM, no CommonJS

const config = {
    "hostname": "https://samplelib.com/sample-mp4.html",
    "customer_id": 123,
    "device_id": 100600,
    "use_https": true,
    "http_username": "AnyString",
    "http_password": "AnyPassword",
    "always_show_webview": true,
    "webview_height": 800,
    "webview_width": 1280,
    "second_display_height": 800,
    "second_display_width": 1280,
    "run_on_single_display": false,
    "non_full_screen_height": 800,
    "non_full_screen_width": 640,
    "load_debug_page": false,
    "save_logs": true,
    "send_ping": true,
    "api_endpoint": "[endpoint].domain.com",
    "api_key": "SecretPassword",
    "app_version": 123
}

const downloadWebsite = async () => {
    try {
        await scrape({
            urls: [config.hostname],
            directory: './site',
        });
        console.log('Website successfully downloaded');
    } catch (err) {
        console.error('Error downloading website:', err);
        throw err; // Перебрасываем ошибку дальше
    }
};

const sendPing = () => {
    fetch(`https://sample.com`, {})
        .then(() => console.log('ping!'))
        .catch(error => console.error('Ошибка при отправке пинга:', error));
}

if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = async () => {
    const displays = screen.getAllDisplays();
    const externalDisplay = displays.find((display) => display.bounds.x !== 0 || display.bounds.y !== 0);

    // if (externalDisplay) {
    //   let win = new BrowserWindow({
    //     x: externalDisplay.bounds.x,
    //     y: externalDisplay.bounds.y,
    //     width: externalDisplay.bounds.width,
    //     height: externalDisplay.bounds.height,
    //     webPreferences: {
    //       preload: path.join(__dirname, 'preload.js'),
    //     },
    //   });
    //
    //   win.loadURL(config.hostname);
    //   // win.setFullScreen(true);
    //   win.webContents.openDevTools();
    // }
    let win = new BrowserWindow({
        x: 0,
        y: 0,
        width: displays[0].bounds.width,
        height: displays[0].bounds.height,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });


    // SAVE HTML


    try {
        if (!fs.existsSync('./site/index.html')) {
            await downloadWebsite();
        }
        await win.loadFile('./site/index.html');
    } catch (err) {
        console.error('Error:', err);
    }


    // win.setFullScreen(true);
    // win.webContents.openDevTools();

    win.webContents.on('did-fail-load', () => {
        console.log(path.join(__dirname))
        win.loadFile('error.html');
    });
    win.webContents.on('did-finish-load', () => {
        if (win.webContents.getURL() === config.hostname) {
            win.webContents.executeJavaScript(`
                document.getElementById('username').value = '${config.http_username}';
                document.getElementById('password').value = '${config.http_password}';
                document.querySelector('form').submit();
            `);
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('ready', () => {
    sendPing();
    setInterval(sendPing, 3600000);
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
