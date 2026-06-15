import 'dotenv/config';
import { createApp } from './server.js';
import { ensureSeed } from './seed.js';

const PORT = process.env.PORT || 4000;

const app = await createApp();
await ensureSeed(); // make sure the admin account + config row exist

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
