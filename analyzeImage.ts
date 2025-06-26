import type { Request, Response } from 'express';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { GoogleGenAI } from '@google/genai';
import { createWorker } from 'tesseract.js';

// model: 'llama3.1', // 4.9 GB
// model: 'llama3.2', // 2.0 GB

import ollama from 'ollama';
ollama.list().then(console.log);

// const response = await ollama.chat({
// 	model: 'gemma3:1b', // 815 MB
// 	messages: [{ role: 'user', content: 'Why is the sky blue?' }],
// });
// console.log(response.message.content);

// Google Cloud Vision Client --- This will automatically use the GOOGLE_APPLICATION_CREDENTIALS environment variable
let visionClient: ImageAnnotatorClient;
try {
	visionClient = new ImageAnnotatorClient();
	console.log('Google Cloud Vision client initialized successfully.');
} catch (error) {
	console.error('Failed to initialize Google Cloud Vision client:', error);
	process.exit(1);
}

const analyzeImage = async (req: Request, res: Response) => {
	console.log('running analyzeImage...');
	if (!visionClient) {
		return res
			.status(500)
			.json({ error: 'Vision client not initialized.' });
	}

	const { base64 } = req.body;

	if (!base64) {
		return res
			.status(400)
			.json({ error: 'Missing field "base64" in request body.' });
	}

	try {
		const request = {
			image: {
				content: base64, // The base64 encoded image string
			},
			// features: [{ type: 'DOCUMENT_TEXT_DETECTION' as const }], // 'as const' helps TypeScript infer the literal type
			imageContext: {
				languageHints: ['en', 'pt-BR'], // Example language hints
			},
		};

		console.log('Sending request to Google Vision API...');
		// Performs text detection on the image file
		// const [result] = await visionClient.annotateImage(request);
		const [result] = await visionClient.documentTextDetection(request);
		// const [result] = await visionClient.textDetection(request); // for less structured text

		if (result.error) {
			console.error('Google Vision API Error:', result.error);
			return res.status(500).json({
				error: 'Google Vision API processing error',
				details: result.error.message,
			});
		}

		const fullTextAnnotation = result.fullTextAnnotation;

		if (fullTextAnnotation && fullTextAnnotation.text) {
			console.log('Text detection successful.');

			const extractedOCR = fullTextAnnotation.text;
			console.log({ extractedOCR });

			console.log('now prompting AI...');
			const genAI = new GoogleGenAI({
				apiKey: process.env.GOOGLE_API_KEY,
			});

			const aiResponse = await genAI.models.generateContent({
				model: 'gemini-2.0-flash-001',
				contents: `you are an expert in translating ocr text obtained from restaurant bills from all countries into json structures.
                you can read ocr texts and understand what products were bought and how much they cost. 
                your goal is to transform this piece of ocr text
                \`\`\`
                ${extractedOCR}
                \`\`\`
                into a json structure representing the bill according to the following contracts:
                \`\`\`
                export enum Category {
					MEAL = 'MEAL',
					FAST_FOOD = 'FAST_FOOD',
					PIZZA_PASTA = 'PIZZA_PASTA',
					ORIENTAL_CUISINE = 'ORIENTAL_CUISINE',
					DESSERT = 'DESSERT',
					TAX = 'TAX',
					SERVICE = 'SERVICE',
					SOFT_DRINK = 'SOFT_DRINK',
					ALCOHOLIC_DRINK = 'ALCOHOLIC_DRINK',
					GROCERIES_SUPERMARKET = 'GROCERIES_SUPERMARKET',
					RETAIL_SHOPPING = 'RETAIL_SHOPPING',
					ONLINE_PURCHASE = 'ONLINE_PURCHASE',
					GIFT = 'GIFT',
					FLIGHT = 'FLIGHT',
					TRANSPORT = 'TRANSPORT', // (Car, Train, Bus, Boat)
					ACCOMMODATION = 'ACCOMMODATION',
					UTILITIES_HOME = 'UTILITIES_HOME',
					TECH = 'TECH', // (PC, Smartphone, Video game)
					HEALTH_MEDICAL = 'HEALTH_MEDICAL',
					ENTERTAINMENT_LEISURE = 'ENTERTAINMENT_LEISURE',
					EDUCATION = 'EDUCATION',
					MISCELLANEOUS = 'MISCELLANEOUS',
					UNKNOWN = 'UNKNOWN',
                }
				interface Product {
					name: string;
					unitPrice?: number; // Optional, as it might be calculated or not explicitly present
					quantity?: number; // Optional, as it might be calculated or not explicitly present
					totalPrice: number;
					category: Category;
				}

				interface Bill {
					establishment?: string;
					address?: string;
					date?: string; // Format: YYYY-MM-DD
					time?: string; // Format: HH:MM:SS
					products: Product[];
					totalBill?: number;
					vatAmount?: number;
				}
                \`\`\`
				create a tax/service product entry if you identify tax/service charge.
                ensure only the raw json is returned, nothing more. no comments. no fluff. 
                only json, ready to be consumed by a javascript application.
                `,
			});
			console.log('ai prompt successful!');

			let responseJSONText = (aiResponse.text || '')
				?.replace(/^```json/, '')
				?.replace(/```$/, '');

			const jsonData = JSON.parse(responseJSONText);

			console.log('sending response back :::', jsonData);
			res.json(jsonData);
		} else {
			console.log('No text found in the image.');
			res.json({
				rawText: '',
				lines: [],
				message: 'No text found in the image.',
			});
		}
	} catch (error: any) {
		console.error(
			'Error processing image. either Google Vision or Google GenAI failed ::',
			error
		);
		res.status(500).json({
			error: 'Failed to process image',
			details: error.message || String(error),
		});
	}
};

const tessearctImage = async (req: Request, res: Response) => {
	try {
		const { base64, mimeType } = req.body;

		const worker = await createWorker(['por', 'eng']);

		// console.log(worker);

		const ret = await worker.recognize(
			// import.meta.dirname + '/assets/conta-de-bar.jpeg',
			`data:${mimeType};base64,${base64}`,
			{},
			{ debug: true }
		);

		console.log('jobId >>>\n\n', ret.jobId);
		console.log('text >>>\n\n', ret.data.text);
		// console.log('blocks >>>\n\n', ret.data.blocks);
		// console.log('paragraphs >>>\n\n', ret.data.paragraphs[0].lines);
		// console.log('box >>>', ret.data.box);
		// console.log('blocks >>>', ret.data.blocks);
		// console.log('lines >>>', ret.data.lines);

		await worker.terminate();

		const prompt = `you are an expert in translating ocr text obtained from restaurant bills from all countries into json structures.
                you can read ocr texts and understand what products were bought and how much they cost. 
                your goal is to transform this piece of ocr text
                \`\`\`
                ${ret.data.text}
                \`\`\`
                into a json structure representing the bill according to the following contracts:
                \`\`\`
                export enum Category {
					MEAL = 'MEAL',
					FAST_FOOD = 'FAST_FOOD',
					PIZZA_PASTA = 'PIZZA_PASTA',
					ORIENTAL_CUISINE = 'ORIENTAL_CUISINE',
					DESSERT = 'DESSERT',
					TAX = 'TAX',
					SERVICE = 'SERVICE',
					SOFT_DRINK = 'SOFT_DRINK',
					ALCOHOLIC_DRINK = 'ALCOHOLIC_DRINK',
					GROCERIES_SUPERMARKET = 'GROCERIES_SUPERMARKET',
					RETAIL_SHOPPING = 'RETAIL_SHOPPING',
					ONLINE_PURCHASE = 'ONLINE_PURCHASE',
					GIFT = 'GIFT',
					FLIGHT = 'FLIGHT',
					TRANSPORT = 'TRANSPORT', // (Car, Train, Bus, Boat)
					ACCOMMODATION = 'ACCOMMODATION',
					UTILITIES_HOME = 'UTILITIES_HOME',
					TECH = 'TECH', // (PC, Smartphone, Video game)
					HEALTH_MEDICAL = 'HEALTH_MEDICAL',
					ENTERTAINMENT_LEISURE = 'ENTERTAINMENT_LEISURE',
					EDUCATION = 'EDUCATION',
					MISCELLANEOUS = 'MISCELLANEOUS',
					UNKNOWN = 'UNKNOWN',
                }
				interface Product {
					name: string;
					unitPrice?: number; // Optional, as it might be calculated or not explicitly present
					quantity?: number; // Optional, as it might be calculated or not explicitly present
					totalPrice: number;
					category: Category;
				}

				interface Bill {
					establishment?: string;
					address?: string;
					date?: string; // Format: YYYY-MM-DD
					time?: string; // Format: HH:MM:SS
					products: Product[];
					totalBill?: number;
					vatAmount?: number;
				}
                \`\`\`
				create a tax/service product entry if you identify tax/service charge.
                ensure only the raw json is returned, nothing more. no comments. no fluff. 
                only json, ready to be consumed by a javascript application.
               `;
		const aiResponse = await ollama.chat({
			model: 'gemma3:1b', // 815 MB
			// messages: [{ role: 'user', content: 'Why is the sky blue?' }],
			messages: [{ role: 'user', content: prompt }],
		});

		// console.log(aiResponse.message.content);
		console.log('ai prompt successful!');

		let responseJSONText = (aiResponse.message.content || '')
			?.replace(/^```json/, '')
			?.replace(/```$/, '');

		const jsonData = JSON.parse(responseJSONText);

		console.log('sending response back :::', jsonData);
		res.json(jsonData);
	} catch (err) {
		console.error('tesseract error :::', String(err).slice(0, 1000));
		res.json({ err });
	}
};

const tessearctLangs = {
	afr: 'Afrikaans',
	amh: 'Amharic',
	ara: 'Arabic',
	asm: 'Assamese',
	aze: 'Azerbaijani',
	aze_cyrl: 'Azerbaijani - Cyrillic',
	bel: 'Belarusian',
	ben: 'Bengali',
	bod: 'Tibetan',
	bos: 'Bosnian',
	bul: 'Bulgarian',
	cat: 'Catalan Valencian',
	ceb: 'Cebuano',
	ces: 'Czech',
	chi_sim: 'Chinese - Simplified',
	chi_tra: 'Chinese - Traditional',
	chr: 'Cherokee',
	cym: 'Welsh',
	dan: 'Danish',
	deu: 'German',
	dzo: 'Dzongkha',
	ell: 'Greek, Modern (1453-)',
	eng: 'English',
	enm: 'English, Middle (1100-1500)',
	epo: 'Esperanto',
	est: 'Estonian',
	eus: 'Basque',
	fas: 'Persian',
	fin: 'Finnish',
	fra: 'French',
	frk: 'German Fraktur',
	frm: 'French, Middle (ca. 1400-1600)',
	gle: 'Irish',
	glg: 'Galician',
	grc: 'Greek, Ancient (-1453)',
	guj: 'Gujarati',
	hat: 'Haitian Haitian Creole',
	heb: 'Hebrew',
	hin: 'Hindi',
	hrv: 'Croatian',
	hun: 'Hungarian',
	iku: 'Inuktitut',
	ind: 'Indonesian',
	isl: 'Icelandic',
	ita: 'Italian',
	ita_old: 'Italian - Old',
	jav: 'Javanese',
	jpn: 'Japanese',
	kan: 'Kannada',
	kat: 'Georgian',
	kat_old: 'Georgian - Old',
	kaz: 'Kazakh',
	khm: 'Central Khmer',
	kir: 'Kirghiz Kyrgyz',
	kor: 'Korean',
	kur: 'Kurdish',
	lao: 'Lao',
	lat: 'Latin',
	lav: 'Latvian',
	lit: 'Lithuanian',
	mal: 'Malayalam',
	mar: 'Marathi',
	mkd: 'Macedonian',
	mlt: 'Maltese',
	msa: 'Malay',
	mya: 'Burmese',
	nep: 'Nepali',
	nld: 'Dutch Flemish',
	nor: 'Norwegian',
	ori: 'Oriya',
	pan: 'Panjabi Punjabi',
	pol: 'Polish',
	por: 'Portuguese',
	pus: 'Pushto Pashto',
	ron: 'Romanian Moldavian; Moldovan',
	rus: 'Russian',
	san: 'Sanskrit',
	sin: 'Sinhala Sinhalese',
	slk: 'Slovak',
	slv: 'Slovenian',
	spa: 'Spanish Castilian',
	spa_old: 'Spanish Castilian - Old',
	sqi: 'Albanian',
	srp: 'Serbian',
	srp_latn: 'Serbian - Latin',
	swa: 'Swahili',
	swe: 'Swedish',
	syr: 'Syriac',
	tam: 'Tamil',
	tel: 'Telugu',
	tgk: 'Tajik',
	tgl: 'Tagalog',
	tha: 'Thai',
	tir: 'Tigrinya',
	tur: 'Turkish',
	uig: 'Uighur Uyghur',
	ukr: 'Ukrainian',
	urd: 'Urdu',
	uzb: 'Uzbek',
	uzb_cyrl: 'Uzbek - Cyrillic',
	vie: 'Vietnamese',
	yid: 'Yiddish',
};

export { visionClient, analyzeImage, tessearctImage };
