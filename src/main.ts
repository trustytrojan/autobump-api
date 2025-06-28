import process from 'node:process';
import path from 'node:path';
import * as util from './util.ts';
import sc from 'slash-create';
(await import('dotenv')).config();
import { app } from './express.ts';

const creator = new sc.SlashCreator({
	applicationID: '1355988571261112521',
	publicKey: process.env.DISCORD_PUBLIC_KEY,
	token: process.env.DISCORD_TOKEN,
	endpointPath: '/autobump/interactions',
});

creator.on('debug', console.debug);
creator.on('error', console.error);

await creator.registerCommandsIn(path.join(import.meta.dirname!, 'commands'), [
	'.ts',
]);

if (process.env.TEST_GUILD) {
	await creator
		.syncCommandsIn(process.env.TEST_GUILD)
		.catch(() => util.log('app not added to test guild!'));
} else {
	await creator.syncGlobalCommands();
}

await creator
	.withServer(new sc.ExpressServer(app, { alreadyListening: true }))
	.startServer();
