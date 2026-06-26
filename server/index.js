import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';
import { getDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.set('io', io);
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`);
    if (req.method === 'POST' || req.method === 'PUT') {
      console.log('  Body:', JSON.stringify(req.body));
    }
  });
  next();
});

getDb();
app.use('/api', apiRoutes);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client not built. Run npm run build in client folder.');
  });
});

io.on('connection', (socket) => {
  socket.on('join:admin', () => {
    socket.join('admin');
  });

  socket.on('join:volunteer', (volunteerId) => {
    socket.join(`volunteer:${volunteerId}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`U&I Icebreaker server running on http://localhost:${PORT}`);
});

export { io };
