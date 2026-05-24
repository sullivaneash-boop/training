import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/betterAuth.js';

export const config = { api: { bodyParser: false } };

export default toNodeHandler(auth.handler);
