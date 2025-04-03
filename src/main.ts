import process from 'node:process';
import path from 'node:path';
import * as util from './util.ts';
import sc from 'slash-create';
import { once } from 'node:events';
(await import('dotenv')).config();
import { app } from './express.ts';

const creator = new sc.SlashCreator({
	applicationID: '1355988571261112521',
	publicKey: process.env.DISCORD_PUBLIC_KEY,
	token: process.env.DISCORD_TOKEN
});

// creator.on('debug', util.log);
creator.on('error', console.error);

await creator.registerCommandsIn(path.join(import.meta.dirname, 'commands'), ['.ts']);

if (process.env.TEST_GUILD) {
	await creator.syncCommandsIn(process.env.TEST_GUILD).catch(() => util.log('app not added to test guild!'));
} else {
	console.log('about to sync global commands... press enter if ready');
	await once(process.stdin, 'data');
	await creator.syncGlobalCommands();
}

await creator.withServer(new sc.ExpressServer(app, { alreadyListening: true })).startServer();
