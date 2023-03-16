const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
// const request = require('request');
const fs = require('fs');
const excel4node = require('excel4node');

// const url = 'https://stillhiring.today/?ref=producthunt';

const httpPort = 4000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// app.all('*', function (req, res, next) {
//     res.header('Access-Control-Allow-Origin', req.headers.origin);
//     res.header(
//         'Access-Control-Allow-Headers',
//         'Origin, X-Requested-With, Content-Type, Accept, Authorization'
//     );
//     res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
//     next();
// });

app.use('/', function (req, res, next) {
	console.log(`req.path === ${req.path}.`);
	if (req.path.startsWith('/api')) {
		next();
	} else {
		let pathname = req.path;
		if (req.path === '/' || req.path.indexOf('.') < 0) {
			pathname = '/frame.html';
		}
		res.sendFile(path.join(__dirname, pathname));
	}
});

const asycUrl = async (firstUrl) => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(firstUrl, {
		waitUntil: 'domcontentloaded',
	});

	page.on('console', (msg) => console.log('console.log:', msg.text()));
	// page.on('request', function (req) {
	//     console.log(req.url());
	// });
	page.on('response', function (res) {
		let reqUrl = res.request().url();
		if (reqUrl.includes('readSharedViewData')) {
			browser.close();
			return res.json();
		}
	});

	// const str = await page.content();
	// if (str.includes('<iframe')) {
	//     let temp = str.substring(str.indexOf('<iframe'), str.indexOf('</iframe'));
	//     temp = temp.substring(temp.indexOf('src=') + 5);
	//     secUrl = temp.substring(0, temp.indexOf('"'));
	// }

	//注入脚本
	// const dimensions = await page.evaluate(async () => {
	//     let span = document.createElement('span');
	//     span.id = 'custom_res';
	//     document.body.append(span);
	//     let script = document.createElement('script');
	//     script.innerText = `
	//         const url = 'https://airtable.com/v0.3/view/viwpPe6EkDqbE7Q2o/readSharedViewData?stringifiedObjectParams=%7B%22shouldUseNestedResponseFormat%22%3Atrue%7D&requestId=reqhTRCFZLUfohaAa&accessPolicy=%7B%22allowedActions%22%3A%5B%7B%22modelClassName%22%3A%22view%22%2C%22modelIdSelector%22%3A%22viwpPe6EkDqbE7Q2o%22%2C%22action%22%3A%22readSharedViewData%22%7D%2C%7B%22modelClassName%22%3A%22view%22%2C%22modelIdSelector%22%3A%22viwpPe6EkDqbE7Q2o%22%2C%22action%22%3A%22getMetadataForPrinting%22%7D%2C%7B%22modelClassName%22%3A%22view%22%2C%22modelIdSelector%22%3A%22viwpPe6EkDqbE7Q2o%22%2C%22action%22%3A%22readSignedAttachmentUrls%22%7D%2C%7B%22modelClassName%22%3A%22row%22%2C%22modelIdSelector%22%3A%22rows%20*%5BdisplayedInView%3DviwpPe6EkDqbE7Q2o%5D%22%2C%22action%22%3A%22createBoxDocumentSession%22%7D%2C%7B%22modelClassName%22%3A%22row%22%2C%22modelIdSelector%22%3A%22rows%20*%5BdisplayedInView%3DviwpPe6EkDqbE7Q2o%5D%22%2C%22action%22%3A%22createDocumentPreviewSession%22%7D%5D%2C%22shareId%22%3A%22shrI8dno1rMGKZM8y%22%2C%22applicationId%22%3A%22appPGrJqA2zH65k5I%22%2C%22generationNumber%22%3A0%2C%22expires%22%3A%222023-04-13T00%3A00%3A00.000Z%22%2C%22signature%22%3A%22c4e5f15eff422c66eddae5e7b7544f29c4879a65f11fd26cb0f9f1e1bf9f6bdb%22%7D';
	//         const options = {
	//             cache: 'no-cache',
	//             credentials: 'same-origin',
	//             headers: {
	//                 'accept': '*/*'
	//                 'accept-encoding': 'gzip, deflate, br'
	//                 'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7'
	//             },
	//             method: 'get',
	//             mode: 'cors',
	//             redirect: 'follow',
	//             referrer: 'no-referrer',
	//         };
	//         fetch(url, options).then(res => res.json()).then(data => {console.log(data);document.getElementById('custom_res').innerText=JSON.stringify(data);});
	//     `;
	//     document.body.append(script);
	//     setTimeout(() => {
	//         return document.getElementById('custom_res').innerText;
	//     }, 20000);

	// });
	// fs.writeFileSync('./doc/temp2.html', dimensions);
	// console.log(dimensions);
};

let timer = null;
const clearTimer = function () {
	if (timer) {
		clearTimeout(timer);
	}
	timer = null;
};
app.post('/api/sendurl', async function (req, res) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(req.body.url, {
		waitUntil: 'domcontentloaded',
	});

	clearTimer();
	timer = setTimeout(() => {
		browser.close();
		res.end({}).end();
	}, 30000);

	page.on('console', (msg) => console.log('console.log:', msg.text()));
	// page.on('request', function (req) {
	//     console.log(req.url());
	// });
	page.on('response', function (response) {
		let reqUrl = response.request().url();
		if (reqUrl.includes('readSharedViewData')) {
			response.json().then((data) => {
				clearTimer();
				browser.close();
				res.end(JSON.stringify(data)).end();
			});
		}
	});
});

const asycFile = async (secUrl) => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(secUrl, {
		waitUntil: 'load',
	});

	page.on('console', (msg) => console.log('console.log:', msg.text()));
	page.on('request', function (req) {
		console.log('request url = ' + req.url());
	});
	// page.on('response', function (res) {
	//     console.log('response url = ' + res.request().url());
	// });
	//注入脚本
	// const dimensions = await page.evaluate(async () => {
	//     let headers = [];
	//     const headList = document.getElementsByClassName('header');
	//     for (let i = 0; i < headList.length; i++) {
	//         headers.push(headList[i].innerText);
	//     }
	//     return [headers];
	// });

	// fs.writeFileSync('./doc/temp2.html', dimensions);
	setTimeout(async () => {
		await browser.close();
		// return dimensions;
		return [];
	}, 30000);
};

app.post('/api/getFile', function (req, res) {
	asycFile(req.body.url).then((data) => {
		res.send({ data }).end();
	});
});

app.listen(httpPort, function () {
	console.log(`Running on port ${httpPort}!`);
});
