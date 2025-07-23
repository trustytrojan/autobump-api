import express from 'express';
import process from 'node:process';
import * as util from './util.ts';

let port = parseInt(process.env.PORT!);
if (isNaN(port)) {
	util.log('PORT env var not provided, using port 80');
	port = 80;
}

export const app = express();

app.listen(
	port,
	() => util.log(`Express server listening on port ${port}`),
);
