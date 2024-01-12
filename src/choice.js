const {ipcRenderer} = require('electron');

document.getElementById('fullScreenBtn').addEventListener('click', () => {
    ipcRenderer.send('choice-made', 'full-screen');
});

document.getElementById('windowedBtn').addEventListener('click', () => {
    ipcRenderer.send('choice-made', 'not-full-screen');
});
