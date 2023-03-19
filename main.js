const { app, BrowserWindow } = require('electron');
const server = require('./worm');
console.log(server.settings);

const createWindow = () => {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
	});

	// win.loadFile('index.html');
	win.loadURL('http://localhost:4000');
};

app.whenReady().then(() => {
	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});
