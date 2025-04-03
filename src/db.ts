import mdb from 'mongodb';
import * as util from './util.ts';
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
		deprecationErrors: true
	}
});
util.log('Connecting to MongoDB server...');
await client.connect();
util.log('MongoDB client connected');
util.closeBeforeExit(client);

const autobumpDb = client.db('autobump');
const users = autobumpDb.collection('users');
const channels = autobumpDb.collection('channels');

export type BumperType = 'disboard' | 'discordhome';

export type User = mdb.WithId<mdb.Document> & {
	discordUserId: string;
	bumps: number;
};

export type Channel = mdb.WithId<mdb.Document> & {
	discordUserId: string;
	discordChannelId: string;
	enabled: boolean;
	bumpers: BumperType[];
	selfbotToken: string | null;
};

export const getUser = async (id: string) => (await users.findOne({ discordUserId: id })) as User | null;
export const getChannel = async (id: string) => (await channels.findOne({ discordChannelId: id })) as Channel | null;
export const getChannelsForUser = async (id: string) =>
	channels.find({ discordUserId: id }) as mdb.FindCursor<Channel | null>;

export const registerUser = async (id: string) => await users.insertOne({ discordUserId: id, bumps: 0 });
export const addChannel = async (c: Channel) => await channels.insertOne(c);
