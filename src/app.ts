import 'express-async-errors';

import express, { json } from 'express';
import helmet from 'helmet';

import sequelize from './config/database';
import User from './models/User';

const app = express();
app.use(json());
app.use(helmet());

// Initialize database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch((error: Error) => {
    console.error('Unable to connect to the database:', error);
  });

app.get('/', (_, res) => {
  res.json({
    msg: 'Hello World',
  });
});

app.get('/sequelize', async (_, res) => {
  await User.create({
    email: 'random@example.com',
  });

  res.json({
    msg: 'Add a new unique user without duplicate',
  });
});

app.use((_, res, _2) => {
  res.status(404).json({ error: 'NOT FOUND' });
});

export { app };
