import sc from 'slash-create';
(await import('dotenv')).config();

export const log = (msg: unknown) => {
	_log('log', msg);
};

export const logError = (msg: unknown) => {
	_log('error', msg);
};

const _log = (logType: 'error' | 'log', msg: unknown) => {
	const obj = {} as { stack: string };
	Error.captureStackTrace(obj, _log); // Capture the stack trace, excluding `log` itself
	const stackLines = obj.stack.split('\n');
	// The first line is the error message itself, which we don't need, and the second line should now be the caller
	const callerLine = stackLines[2]?.trim().replace('at ', '') || ''; // Adjust based on your environment
	console[logType](`[${new Date().toLocaleString()}; ${callerLine}] ${msg}`);
};

export const millis = Object.freeze({
	fromHours: (hours: number) => 3.6e6 * hours,
	fromMinutes: (minutes: number) => 6e4 * minutes
});

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const closeableEvents = ['beforeExit', 'exit', 'uncaughtException', 'unhandledRejection', 'SIGINT', 'SIGTERM'];
export const closeBeforeExit = (closeable: { close(): any }) => {
	const close = closeable.close.bind(closeable);
	for (const event of closeableEvents) process.on(event, close);
};

export const defaultSlashCommandOptions: Partial<sc.SlashCommandOptions> = {
	guildIDs: process.env.TEST_GUILD, // if not in env, turns this into a global command
	contexts: [
		sc.InteractionContextType.GUILD,
		sc.InteractionContextType.BOT_DM,
		sc.InteractionContextType.PRIVATE_CHANNEL
	]
};
