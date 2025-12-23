/* eslint-disable unicorn/prefer-module */
import path from 'node:path';
import process from 'node:process';
import {defineConfig} from 'drizzle-kit';
import dotenv from 'dotenv';

const CONFIG_PATH = process.env['CONFIG_PATH']
const DB_URI = process.env['DB_URI']

const dotenvPath = CONFIG_PATH
	? path.resolve(process.cwd(), CONFIG_PATH)
	: undefined;

dotenv.config(dotenvPath ? {path: dotenvPath} : undefined);

export default defineConfig({
	schema: path.resolve(__dirname, 'schema.ts'),
	dialect: 'sqlite',
	dbCredentials: {
		url: DB_URI!,
	},
});
