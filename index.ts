import express from 'express';
import cors from 'cors';
import { visionClient, analyzeImage } from './analyzeImage.ts';

const PORT = process.env.DEV_PORT || 3333;

const app = express();
app.use(cors('*'));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
	res.json({
		hello: 'ok!',
		visionClientAPIEndpoint: visionClient.apiEndpoint,
	});
});

app.post('/analyze-image', (req, res) => {
	analyzeImage(req, res);
});

app.listen(PORT, () => {
	console.log(`listening on PORT ${PORT} 😀`);
});
