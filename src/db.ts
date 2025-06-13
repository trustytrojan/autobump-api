import mdb from 'mongodb';
import * as util from './util.ts';
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

export const getUser = async (discordId: string) =>
	(await users.findOne({ discordUserId: discordId })) as
		| (mdb.WithId<mdb.Document> & User)
		| null;

export const addBumps = async (discordUserId: string, bumps: number) => {
	const user = await getUser(discordUserId);
	if (!user)
		throw 'not found';
	await users.updateOne({ discordUserId: discordUserId }, {
		$inc: { bumps },
	});
};

export const deductBump = async (discordUserId: string) => {
	const user = await getUser(discordUserId);
	if (!user)
		throw 'not found';
	if (user.bumps <= 0)
		throw 'no bumps';
	await users.updateOne({ discordUserId: discordUserId }, {
		$inc: { bumps: -1 },
	});
};

export const getChannel = async (userId: string, channelId: string) =>
	(await channels.findOne({
		discordUserId: userId,
		discordChannelId: channelId,
	})) as
		| (mdb.WithId<mdb.Document> & Channel)
		| null;

export const getChannelsForUser = (discordId: string) =>
	channels.find({ discordUserId: discordId }) as mdb.FindCursor<
		mdb.WithId<mdb.Document> & Channel
	>;

export const registerUser = async (discordId: string, bumps = 0) =>
	await users.insertOne({ discordUserId: discordId, bumps });

export const addChannel = async (c: Channel) => await channels.insertOne(c);
