const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const binanceRoutes = require('./routes/binanceRoutes');
const { startBotScheduler, testBuyThenSell, runBotForUser } = require('./worker/botEngine');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/binance', binanceRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 5000, () => {
      console.log('Server running...');
      runBotForUser()
      
    });
  })
  .catch(err => console.error(err));
