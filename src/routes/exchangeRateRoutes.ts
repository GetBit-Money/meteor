import { Router } from 'express';

import { getExchangeRate } from '../controllers/exchangeRateController';

const router = Router();

router.get('/', getExchangeRate);

export default router;
