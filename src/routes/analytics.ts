import express from 'express';

const router = express.Router();

router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Get dashboard analytics endpoint - implementation coming soon'
  });
});

router.get('/time-saved', (req, res) => {
  res.json({
    success: true,
    message: 'Get time saved analytics endpoint - implementation coming soon'
  });
});

export { router as analyticsRoutes };