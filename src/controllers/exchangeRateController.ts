import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Request, Response } from 'express';

export const getExchangeRate = async (req: Request, res: Response) => {
  const { from = 'USD', to = 'INR' } = req.query;
  const symbol = `${from}-${to}`;
  const url = `https://www.google.com/finance/quote/${symbol}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = cheerio.load(response.data);

    // This is the current price in the main banner
    const rate =
      $('div[data-last-price]').attr('data-last-price') ||
      $('div.YMlKec.fxKbKc').first().text();

    if (!rate) {
      res.status(500).json({ error: 'Exchange rate not found' });
      return;
    }

    res.json({ from, to, rate: parseFloat(rate.replace(/[^0-9.]/g, '')) });
  } catch (error: any) {
    console.error('Error fetching Google Finance:', error.message);
    res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
};
