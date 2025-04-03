import express from 'express';
import process from 'node:process';
import * as util from './util.ts';

const port = parseInt(process.argv[2]);
if (isNaN(port)) {
	util.log('port required');
	process.exit(1);
}

export const app = express();
app.use(express.json());

const server = app.listen(port, () => util.log(`Express server listening on port ${port}`));
util.closeBeforeExit(server);
