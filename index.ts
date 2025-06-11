import express from 'express';
import cors from 'cors';
import { visionClient, analyzeImage } from './analyzeImage.ts';

const PORT = process.env.PORT || 10666;

const app = express();
app.use(cors('*'));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
	res.json({
		env: process.env.NODE_ENV,
		hello: 'ok!',
		visionClientAPIEndpoint: visionClient.apiEndpoint,
	});
});

let pong = 0;
app.get('/ping', (req, res) => {
	console.log({ ping: pong });
	res.json({ pong });
	pong++;
});

app.get('/error-test', (req, res) => {
	throw Error('Error!!!!');
});

app.get('/say-hello', (req, res) => {
	console.log('hello in the server!');
	res.json({ message: 'ok' });
});

app.post('/analyze-image', (req, res) => {
	console.log('=======================');
	console.log(new Date().toLocaleString('pt-BR'));

	analyzeImage(req, res);
});

app.listen(PORT, () => {
	const apiKey = process.env.GOOGLE_API_KEY;
	console.log(apiKey ? apiKey.replace(/./g, '*') : 'no api key');
	console.log(`listening on PORT ${PORT} 😀`);
});
