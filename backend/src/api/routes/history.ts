import { logger } from '../../utils/logger.js';

export interface HistoryItem {
    id: string;
    type: 'image' | 'script' | 'video';
    url: string;
    metadata: Record<string, any>;
    createdAt: string;
}

// In-memory history store (persists for the life of the server process)
const historyStore: HistoryItem[] = [];

export const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'createdAt'>) => {
    const entry: HistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        ...item,
    };
    historyStore.unshift(entry); // newest first
    if (historyStore.length > 100) historyStore.pop(); // cap at 100 entries
    logger.info(`History: added ${entry.type} item (${entry.id})`);
    return entry;
};

export const getHistory = (type?: string): HistoryItem[] => {
    if (type) return historyStore.filter((item) => item.type === type);
    return historyStore;
};

import express, { Request, Response } from 'express';
const router = express.Router();

// GET /api/history — return all history items
router.get('/', (_req: Request, res: Response) => {
    const items = getHistory();
    res.json({ success: true, items, total: items.length });
});

// GET /api/history/:type — filter by type (image | script | video)
router.get('/:type', (req: Request, res: Response) => {
    const type = req.params.type as string;
    const valid = ['image', 'script', 'video'];
    if (!valid.includes(type)) {
        res.status(400).json({ error: { message: 'Invalid type', code: 'INVALID_TYPE' } });
        return;
    }
    const items = getHistory(type);
    res.json({ success: true, items, total: items.length });
});

export default router;
