import express, { Request, Response, NextFunction } from 'express';
import { getJobStatus, getQueueStats } from '../../services/jobQueue.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

// Get job status
router.get('/:jobId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    logger.info(`Fetching status for job: ${jobId}`);

    const status = await getJobStatus(jobId);

    res.json({
      jobId,
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get queue statistics
router.get('/stats/queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Fetching queue statistics');

    const stats = await getQueueStats();

    res.json({
      queueStats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Poll for job completion (websocket alternative)
router.post('/:jobId/poll', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const { maxWait = 30000 } = req.body; // Max wait in milliseconds

    logger.info(`Polling job: ${jobId}`);

    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    const pollJob = async (): Promise<any> => {
      const status = await getJobStatus(jobId);

      if (
        status.state === 'completed' ||
        status.state === 'failed' ||
        Date.now() - startTime >= maxWait
      ) {
        return status;
      }

      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      return pollJob();
    };

    const finalStatus = await pollJob();

    res.json({
      jobId,
      ...finalStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
