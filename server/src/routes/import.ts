import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/connection.js';
import { dailyIntake } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import { importMacroFactor } from '../services/macrofactorImport.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/import/macrofactor — upload .xlsx file
router.post('/macrofactor', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No file uploaded. Send as multipart form with field name "file"');
    }

    if (!req.file.originalname.endsWith('.xlsx')) {
      throw new AppError(400, 'Only .xlsx files are supported');
    }

    // Validate file magic bytes (XLSX is a ZIP file: PK signature)
    if (req.file.buffer.length < 4 ||
        req.file.buffer[0] !== 0x50 || req.file.buffer[1] !== 0x4B) {
      throw new AppError(400, 'Invalid file format — not a valid .xlsx file');
    }

    const summary = await importMacroFactor(req.file.buffer, req.userId);
    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/import/status — check if import has been done
router.get('/status', async (req, res, next) => {
  try {
    const [imported] = await db
      .select({ id: dailyIntake.id })
      .from(dailyIntake)
      .where(eq(dailyIntake.userId, req.userId))
      .limit(1);

    res.json({ hasImportedData: !!imported });
  } catch (err) {
    next(err);
  }
});

export default router;
