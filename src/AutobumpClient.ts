import sb from 'discord.js-selfbot-v13';
import * as db from './db.ts';
import * as util from './util.ts';
import assert from 'node:assert';
import mdb from 'mongodb';

/**
 * A function that performs a bump on a bumper bot and returns
 * the time needed to wait until the next bump.
 */
export type AutobumpFunction = (channel: sb.TextChannel) => Promise<number>;

/**
 * A handle to a running autobumper.
 */
export class AutobumpHandle {
	// deno-lint-ignore no-explicit-any
	timeoutHandle?: any;
	channelId: string;
	bumperType: db.BumperType;
	recordId: mdb.ObjectId;
	client: AutobumpClient;
	index: number | undefined;

	constructor(
		channelId: string,
		bumperType: db.BumperType,
		recordId: mdb.ObjectId,
		client: AutobumpClient,
	) {
		this.channelId = channelId;
		this.bumperType = bumperType;
		this.recordId = recordId;
		this.client = client;
	}

	stop() {
		clearTimeout(this.timeoutHandle);
		this.client.handles.splice(this.index!, 1);
	}
}

export default class AutobumpClient extends sb.Client {
	readonly ownerId: string;
	owner?: sb.User;
	readonly handles: AutobumpHandle[] = [];

	constructor(ownerId: string) {
		super({ presence: { status: 'invisible' } });
		this.ownerId = ownerId;
	}

	override async login(token: string): Promise<string> {
		const loginResult = await super.login(token);
		this.owner = await this.users.fetch(this.ownerId);
		return loginResult;
	}

	async startBumper(
		recordId: mdb.ObjectId,
		type: db.BumperType,
		channelId: string,
	) {
		if (!this.isReady())
			throw 'this client is not logged in!';

		const channel = await this.channels.fetch(channelId);

		if (!channel)
			throw 'channel does not exist!';

		if (!(channel instanceof sb.TextChannel))
			throw 'channel is not a guild text channel!';

		if (
			this.handles.find((h) =>
				h.bumperType === type && h.channelId === channelId
			)
		) {
			throw `a ${type} bumper is already running in this channel!`;
		}

		const handle = new AutobumpHandle(channelId, type, recordId, this);

		const catchFunc = (err: Error) => {
			this.owner?.send(
				`**this is an error**\n\`\`\`js\n${err.stack ?? err}\`\`\``,
			);
			clearTimeout(handle.timeoutHandle);
			const handleIndex = this.handles.findIndex((h) => h === handle);
			if (handleIndex === -1)
				throw `handle not found in this.handles: ${handle}`;
			this.handles.splice(handleIndex, 1);
		};

		const bump = await util.importBumper(type);

		const deductBump = async (ms: number) => {
			try {
				await db.deductBump(this.ownerId);
			} catch (err) {
				clearTimeout(handle.timeoutHandle);
				this.owner?.send('you ran out of bumps!');
				throw err;
			}
			return ms;
		};

		const loop = (bumpDelayMs: number) => {
			assert(bumpDelayMs >= 1_000);
			handle.timeoutHandle = setTimeout(
				() =>
					bump(channel).then(deductBump).then(loop).catch(catchFunc),
				bumpDelayMs,
			);
		};

		loop(1_000);
		handle.index = this.handles.push(handle);
		return handle;
	}
}
