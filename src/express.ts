import express from 'express';
import process from 'node:process';
import * as util from './util.ts';

const port = parseInt(process.env.PORT!);
if (isNaN(port))
	throw new Error('PORT env var required');

export const app = express();

app.listen(
	port,
	() => util.log(`Express server listening on port ${port}`),
);
