import type { Request, Response } from 'express';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { GoogleGenAI } from '@google/genai';

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
			// For structured data, you'd need to parse fullTextAnnotation.pages, blocks, paragraphs, words, symbols
			// This example just returns the full raw text and a simplified structure
			const extractedData = {
				rawText: fullTextAnnotation.text,
				// Basic line extraction example (you'll need more sophisticated parsing for bills)
				lines:
					fullTextAnnotation.pages?.[0]?.blocks?.flatMap(
						block =>
							block.paragraphs?.flatMap(para =>
								para.words
									?.map(word =>
										word.symbols
											?.map(symbol => symbol.text)
											.join('')
									)
									.join(' ')
							) || []
					) || [],
				// You can return the full annotation if your client wants to parse it
			};

			console.log('prompting AI...');

			const genAI = new GoogleGenAI({
				apiKey: process.env.GOOGLE_API_KEY,
			});

			const aiResponse = await genAI.models.generateContent({
				model: 'gemini-2.0-flash-001',
				contents: `you are an expert in translating ocr text obtained from restaurant bills from all countries into json structures.
                you can read ocr texts and understand what products were bought and how much they cost. 
                your goal is to transform this piece of ocr text
                \`\`\`
                ${extractedData.rawText}
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

export { visionClient, analyzeImage };
