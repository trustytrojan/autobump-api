import { TextBasedChannel } from 'discord.js-selfbot-v13';
import assert from 'assert';
import { log } from '../util.ts';

export default abstract class Autobumper {
	protected readonly channel: TextBasedChannel;
	private timeoutHandle: NodeJS.Timeout;

	constructor(channel: TextBasedChannel) {
		this.channel = channel;
	}

	abstract bump(): Promise<number>;

	start(): void {
		const loop = (bumpDelayMs: number) => {
			assert(bumpDelayMs > 0);
			log(`Next bump: ${new Date(Date.now() + bumpDelayMs).toLocaleTimeString()}`);
			this.timeoutHandle = setTimeout(() => this.bump().then(loop), bumpDelayMs);
		};
		this.bump().then(loop);
	}

	stop(): void {
		clearTimeout(this.timeoutHandle);
	}
}
