import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import { createSocketServer } from './lib/socket';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/v1', routes);

const server = http.createServer(app);
createSocketServer(server);

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Axios Pay backend running on port ${port}`);
});
