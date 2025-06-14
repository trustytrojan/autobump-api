import sc from 'slash-create';
import sb from 'discord.js-selfbot-v13';
import process from 'node:process';
import readline from 'node:readline';
import express from 'express';
import { Buffer } from 'node:buffer';
import { once } from 'node:events';
(await import('dotenv')).config();
import node_util from 'node:util';

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

export const logInteraction = (ctx: sc.AutocompleteContext | sc.CommandContext) =>
	log(`user=${ctx.user.id} channel=${ctx.channelID} options=${node_util.inspect(ctx.options)}`);

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

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

export const askYesNo = (
	question: string,
	defaultYes: boolean,
): Promise<boolean> =>
	new Promise((resolve) => {
		const validateInput = (input: string) => {
			const answer = input.trim().toLowerCase();
			if (answer === '') {
				rl.close();
				resolve(defaultYes); // Return the default value if input is empty
			} else if (answer === 'y') {
				rl.close();
				resolve(true); // Return true for "yes"
			} else if (answer === 'n') {
				rl.close();
				resolve(false); // Return false for "no"
			} else {
				console.log('Please enter "y" or "n".');
				rl.question(question, validateInput);
			}
		};

		// Adjust the prompt based on the default value
		const defaultIndicator = defaultYes ? '[Y/n]' : '[y/N]';
		rl.question(`${question} ${defaultIndicator}: `, validateInput);
	});
