import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/connection.js';
import { dailyIntake } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import { importMacroFactor } from '../services/macrofactorImport.js';
import { importCsvFoods } from '../services/csvImport.js';
import { exportData } from '../services/dataExport.js';
import { importData } from '../services/dataImport.js';

const router = Router();

const ALLOWED_XLSX_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',              // some clients send xlsx as zip
  'application/octet-stream',     // fallback for unrecognized types
];
const ALLOWED_CSV_MIMES = ['text/csv', 'text/plain', 'application/octet-stream'];
const ALLOWED_JSON_MIMES = ['application/json', 'text/plain', 'application/octet-stream'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allAllowed = [...ALLOWED_XLSX_MIMES, ...ALLOWED_CSV_MIMES, ...ALLOWED_JSON_MIMES];
    if (allAllowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

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

// POST /api/import/csv — upload .csv file of foods
router.post('/csv', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No file uploaded. Send as multipart form with field name "file"');
    }

    if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
      throw new AppError(400, 'Only .csv files are supported');
    }

    const result = await importCsvFoods(req.file.buffer, req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/import/export — download all user data as JSON
router.get('/export', async (req, res, next) => {
  try {
    const data = await exportData(req.userId);
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename="food-tracker-export-${dateStr}.json"`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/import/data — import from a food-tracker JSON export
router.post('/data', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No file uploaded. Send as multipart form with field name "file"');
    }

    if (!req.file.originalname.toLowerCase().endsWith('.json')) {
      throw new AppError(400, 'Only .json files are supported');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(req.file.buffer.toString('utf8'));
    } catch {
      throw new AppError(400, 'Invalid JSON file');
    }

    const summary = await importData(parsed, req.userId);
    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
});

export default router;
