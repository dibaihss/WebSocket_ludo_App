import express, { Application, Request, Response } from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Server } from 'socket.io';
import favicon from 'serve-favicon';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

import { DataClient } from './cosmos'
import { registerCreateItemHandler } from './create-item-handler';
import { registerMessageHandler } from './message-handler';
import { registerSessionWebSocketHandler } from './session-websocket-handler';

import 'dotenv/config'

const app: Application = express();
const server = createServer(app);
const io = new Server(server, {
  transports: ['websocket', 'polling'],
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
});

const limiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.get('/', limiter, (_: Request, res: Response) => {
  res.sendFile(join(__dirname, 'static', 'index.html'));
});

app.use(
  favicon(join(__dirname, 'static', 'favicon.ico'))
);

app.use(express.static('static'));

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on('start', async (_) => {
    console.log('Started');
    try {
      await new DataClient().start((message: string) => {
        console.log(message);
        io.emit('new_message', message);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const message = `Error:\t${errorMessage}`;
      console.error(error);
      io.emit('new_message', message);
    }
  });

  registerCreateItemHandler(socket, io);
  registerMessageHandler(socket, io);
  registerSessionWebSocketHandler(socket, io);
});

io.on('error', (_, error) => {
  console.log(`Error: ${error}`);
});

io.on('disconnect', (_, reason) => {
  console.log(`Disconnected: ${reason}`);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running: \\:${port}`);
});
