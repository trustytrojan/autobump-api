import sc from 'slash-create';
import sb from 'discord.js-selfbot-v13';
import process from 'node:process';
import express from 'express';
import { Buffer } from 'node:buffer';
import { once } from 'node:events';
(await import('dotenv')).config();

export const log = (...values: unknown[]) => _log('log', values);
export const logError = (...values: unknown[]) => _log('error', values);

const _log = (logType: 'error' | 'log', values: unknown[]) => {
	const obj = {} as { stack: string };
	Error.captureStackTrace(obj, _log); // Capture the stack trace, excluding `log` itself
	const stackLines = obj.stack.split('\n');
	// The first line is the error message itself, which we don't need, and the second line should now be the caller
	const callerLine = stackLines[2].trim().replace('at ', '') || ''; // Adjust based on your environment
	console[logType](
		`[${new Date().toLocaleString()}; ${callerLine}]`,
		...values,
	);
};

export const millisFrom = ({
	hours,
	minutes,
	seconds,
}: {
	hours?: number;
	minutes?: number;
	seconds?: number;
}) =>
	(hours ? 3.6e6 * hours : 0)
	+ (minutes ? 6e4 * minutes : 0)
	+ (seconds ? 1e3 * seconds : 0);

export const wait = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

const closeableEvents = [
	'beforeExit',
	'exit',
	'uncaughtException',
	'unhandledRejection',
	'SIGINT',
	'SIGTERM',
];

export const closeables: { close(): any }[] = [];

for (const event of closeableEvents) {
	process.on(event, () => {
		for (const closeable of closeables)
			closeable.close();
		process.exit();
	});
}

export const defaultSlashCommandOptions: Partial<sc.SlashCommandOptions> = {
	guildIDs: process.env.TEST_GUILD, // if not in env, turns this into a global command
	integrationTypes: [
		sc.ApplicationIntegrationType.USER_INSTALL,
	],
};

/**
 * A function that performs a bump on a bumper bot and returns
 * the time needed to wait until the next bump.
 */
export type AutobumpFunction = (channel: sb.TextChannel) => Promise<number>;

export const importBumper = async (
	type: import('./db.ts').BumperType,
): Promise<AutobumpFunction> => (await import(`./bumpers/${type}.ts`)).default;

export const readExpressRequest = async (req: express.Request) => {
	const chunks: Buffer[] = [];
	req.on('data', chunks.push.bind(chunks));
	await once(req, 'end');
	return Buffer.concat(chunks);
};
