const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const request = require('request');
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

let timer = null;
const clearTimer = function () {
	if (timer) {
		clearTimeout(timer);
	}
	timer = null;
};
app.post('/api/sendurl', async function (req, res) {
	// let imgPath = path.join(__dirname, 'images/2img0.jpeg');
	// request('https://dl.airtable.com/.attachments/15497b643c8079bfaac55f0a0e3b4998/88bd26c5/1656687038505e1683158400vbetatlvgc9AK_kEHuzbXb9wCuW-NFHsgzpE_ta0ysieJkctw', {
	//     accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
	// }).pipe(fs.createWriteStream(imgPath));
	// request('https://dl.airtable.com/.attachments/15497b643c8079bfaac55f0a0e3b4998/88bd26c5/1656687038505e1683158400vbetatlvgc9AK_kEHuzbXb9wCuW-NFHsgzpE_ta0ysieJkctw', {
	//     accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
	//     encoding: 'binary'
	// }, function (error, response, body) {
	//     if (!error) {
	//         fs.writeFileSync(imgPath, body, 'binary');
	//     }
	// })
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
				if (data.msg === 'SUCCESS') {
					const path = generateXlsx(data.data);
					res.send({ url: path }).end();
				} else {
					res.send({ url: '' }).end();
				}
			});
		}
	});
});

const generateXlsx = (data) => {
	if (!data || !data.table || !data.table.columns || !data.table.rows) {
		return '';
	}
	const wb = new excel4node.Workbook();
	const ws = wb.addWorksheet('Sheet', {
		sheetFormat: {
			defaultRowHeight: 56,
		},
	});
	const cellStyle = wb.createStyle({
		alignment: {
			horizontal: 'center',
			vertical: 'center',
			wrapText: true,
		},
	});
	ws.row(1).setHeight(20).freeze();
	const colWidths = [
		120, 60, 85, 115, 365, 200, 312, 190, 136, 107, 135, 297, 526, 454, 179,
	];
	for (let c = 0; c < colWidths.length; c++) {
		const wcol = colWidths[c] / 8;
		ws.column(c + 1).setWidth(wcol);
	}
	const oriColumns = [].concat(data.table.columns);
	const columns = [],
		mapColumns = [],
		colMap = {};
	oriColumns.forEach((col, i) => {
		columns.push(col.id);
		if (
			col.typeOptions &&
			col.typeOptions.choices &&
			Object.keys(col.typeOptions.choices).length > 0
		) {
			mapColumns.push(col.id);
			for (const key in col.typeOptions.choices) {
				colMap[key] = col.typeOptions.choices[key].name;
			}
		}
		ws.cell(1, i + 1)
			.string(col.name)
			.style(cellStyle);
	});
	let imgColIndex = 0;
	data.table.rows.forEach((row, k) => {
		for (let m = 0; m < columns.length; m++) {
			const id = columns[m];
			const cell = row.cellValuesByColumnId[id];
			let str = '';
			if (mapColumns.includes(id)) {
				if (Array.isArray(cell)) {
					let arr = [];
					for (let n = 0; n < cell.length; n++) {
						arr.push(colMap[cell[n]]);
					}
					str = arr.join(', ');
					ws.cell(k + 2, m + 1)
						.string(str)
						.style(cellStyle);
				} else if (oriColumns[m].type === 'lookup') {
					if (cell && cell.foreignRowIdOrder) {
						let tempKeys = cell.foreignRowIdOrder;
						let tempArr = [];
						for (let aa = 0; aa < tempKeys.length; aa++) {
							tempArr.push(
								colMap[
									cell.valuesByForeignRowId[tempKeys[aa]][0]
								]
							);
						}
						ws.cell(k + 2, m + 1)
							.string(tempArr.join(', '))
							.style(cellStyle);
					}
				}
			} else if (typeof cell === 'string') {
				str = cell;
				ws.cell(k + 2, m + 1)
					.string(str)
					.style(cellStyle);
			} else if (
				oriColumns[m].type === 'multipleAttachment' &&
				Array.isArray(cell)
			) {
				// let imgPath = './images/img' + k + '.jpeg';
				// // const imgRes = request(cell[0].url, {
				// //     accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
				// //     encoding: 'binary'
				// // });
				// // fs.writeFileSync(imgPath, imgRes.body, 'binary');
				// request(cell[0].url, {
				//     accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
				// }).pipe(fs.createWriteStream(imgPath));
				imgColIndex = m;
				ws.cell(k + 2, m + 1)
					.link(cell[0].url, 'Logo')
					.style(cellStyle);
			} else if (typeof cell === 'number') {
				if (oriColumns[m].typeOptions.format.includes('percent')) {
					str = parseInt(cell * 100, 10) + '%';
					ws.cell(k + 2, m + 1)
						.string(str)
						.style(cellStyle);
				} else {
					ws.cell(k + 2, m + 1)
						.number(cell)
						.style(cellStyle);
				}
			} else if (oriColumns[m].type === 'button') {
				ws.cell(k + 2, m + 1)
					.link(cell.url, cell.label)
					.style(cellStyle);
			} else {
				ws.cell(k + 2, m + 1)
					.string(id)
					.style(cellStyle);
			}
		}
	});

	// console.log('add images!');
	// data.table.rows.forEach((row, k) => {
	//     let imgPath = './images/img' + k + '.jpeg';
	//     const imgFile = fs.readFileSync(imgPath);
	//     if (imgFile) {
	//         ws.addImage({
	//             image: fs.readFileSync(imgPath),
	//             type: 'picture',
	//             position: {
	//                 type: 'oneCellAnchor',
	//                 from: {
	//                     col: imgColIndex + 1,
	//                     colOff: 0,
	//                     row: k + 2,
	//                     rowOff: 0
	//                 }
	//             }
	//         });
	//     }
	// });
	const downPath = path.join(__dirname, 'doc/output.xlsx');
	wb.write(downPath);
	return '/doc/output.xlsx';
};

app.listen(httpPort, function () {
	console.log(`Running on port ${httpPort}!`);
});
