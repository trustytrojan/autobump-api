import mdb from 'mongodb';
import sc from 'slash-create';
import sb from 'discord.js-selfbot-v13';
import * as util from './util.ts';
import * as autobump from './autobump.ts';
import process from 'node:process';
(await import('dotenv')).config();

const uri = process.env.MONGODB_URI;
if (!uri) {
	util.logError('MONGODB_URI env var required!');
	process.exit(1);
}

const client = new mdb.MongoClient(uri, {
	serverApi: {
		version: mdb.ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});
util.log('Connecting to MongoDB server...');
await client.connect();
util.log('MongoDB client connected');
util.closeables.push(client);

const autobumpDb = client.db('autobump');
export const users = autobumpDb.collection('users');
export const channels = autobumpDb.collection('channels');

export const bumperTypes = ['disboard', 'discordhome', 'discodus'];
export type BumperType = 'disboard' | 'discordhome' | 'discodus';

export type User = mdb.WithId<mdb.Document> & {
	discordUserId: string;
	bumps: number;
};

export type Channel = {
	discordUserId: string;
	discordChannelId: string;
	bumper: BumperType;
};

export const getUserByDiscordId = async (
	discordId: string,
): Promise<mdb.WithId<mdb.Document> & User> => {
	let user = await users.findOne({ discordUserId: discordId });
	if (!user) {
		const result = await registerUser(discordId);
		if (!result.acknowledged)
			throw new Error('failed to register user');
		user = await users.findOne({ _id: result.insertedId });
	}
	return user as mdb.WithId<mdb.Document> & User;
};

export const addBumps = async (discordUserId: string, bumps: number) => {
	const user = await getUserByDiscordId(discordUserId);
	if (!user)
		throw new Error('user not found');
	await users.updateOne({ discordUserId: discordUserId }, {
		$inc: { bumps },
	});
};

export const deductBump = async (discordUserId: string) => {
	const user = await getUserByDiscordId(discordUserId);
	if (!user)
		throw new Error('user not found');
	if (user.bumps <= 0)
		throw new Error('user has no bumps');
	await users.updateOne({ discordUserId: discordUserId }, {
		$inc: { bumps: -1 },
	});
};

export const getChannelById = async (_id: string) =>
	(await channels.findOne({ _id: new mdb.ObjectId(_id) })) as
		| mdb.WithId<mdb.Document> & Channel
		| null;

export const getChannelsForUser = (discordId: string) =>
	channels.find({ discordUserId: discordId }) as mdb.FindCursor<
		mdb.WithId<mdb.Document> & Channel
	>;

export const registerUser = async (discordId: string, bumps = 0) =>
	await users.insertOne({ discordUserId: discordId, bumps });

export const addChannel = async (c: Channel) => await channels.insertOne(c);

export const autocompleteChannels = async (discordUserId: string) => {
	const channels = getChannelsForUser(discordUserId);
	const results: sc.AutocompleteChoice[] = [];
	for await (const c of channels) {
		util.log(`processing channel ${c._id}`);
		const channel = await autobump.selfbot.channels.fetch(
			c.discordChannelId,
		);
		if (!channel) {
			util.log(
				`WARNING: channel ${c.discordChannelId} no longer exists, you should delete`,
			);
			continue;
		}
		if (!(channel instanceof sb.GuildChannel)) {
			util.log(
				`WARNING: non guild channel found in channels collection: ${channel.id}`,
			);
			continue;
		}
		results.push({
			name:
				`${channel.guild.name} ⮞ ${channel.name}, bumping ${c.bumper}`,
			value: c._id.toString(),
		});
	}
	return results;
};
