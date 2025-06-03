import type { Request, Response } from 'express';
import { ImageAnnotatorClient } from '@google-cloud/vision';

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
			// You can add imageContext for language hints if needed:
			imageContext: {
				languageHints: ['en', 'pt-BR'], // Example language hints
			},
		};

		console.log('Sending request to Google Vision API...', request);
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
				// fullAnnotation: fullTextAnnotation
			};
			res.json(extractedData);
		} else {
			console.log('No text found in the image.');
			res.json({
				rawText: '',
				lines: [],
				message: 'No text found in the image.',
			});
		}
	} catch (error: any) {
		console.error('Error processing image with Google Vision:', error);
		res.status(500).json({
			error: 'Failed to process image',
			details: error.message || String(error),
		});
	}
};

export { visionClient, analyzeImage };
