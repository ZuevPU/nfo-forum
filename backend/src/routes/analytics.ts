import { Router } from 'express';
import {
  buildReportWorkbook,
  fetchActivityMetrics,
  fetchAnalyticsOverview,
  fetchDiagnosticsMetrics,
  fetchEmotionMetrics,
  fetchEnergyMetrics,
  fetchFactorMetrics,
  fetchRankingMetrics,
  fetchReflectionDepthMetrics,
  fetchTaskMetrics,
  getReportFilename,
} from '../services/analytics/index.js';
import { debugLog } from '../utils/debugLog.js';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', async (_req, res) => {
  try {
    const overview = await fetchAnalyticsOverview();
    debugLog('analytics.ts:overview', 'overview ok', { registered: overview.registered }, 'A');
    res.json({ overview });
  } catch (e) {
    debugLog('analytics.ts:overview', 'overview failed', { error: String(e) }, 'A');
    throw e;
  }
});

analyticsRouter.get('/activity', async (_req, res) => {
  const activity = await fetchActivityMetrics();
  res.json({ activity });
});

analyticsRouter.get('/energy', async (_req, res) => {
  const energy = await fetchEnergyMetrics();
  res.json({ energy });
});

analyticsRouter.get('/emotions', async (_req, res) => {
  const emotions = await fetchEmotionMetrics();
  res.json({ emotions });
});

analyticsRouter.get('/factors', async (_req, res) => {
  const factors = await fetchFactorMetrics();
  res.json({ factors });
});

analyticsRouter.get('/tasks', async (_req, res) => {
  const tasks = await fetchTaskMetrics();
  res.json({ tasks });
});

analyticsRouter.get('/diagnostics', async (_req, res) => {
  const diagnostics = await fetchDiagnosticsMetrics();
  res.json({ diagnostics });
});

analyticsRouter.get('/ranking', async (_req, res) => {
  const ranking = await fetchRankingMetrics();
  res.json({ ranking });
});

analyticsRouter.get('/reflection-depth', async (_req, res) => {
  const reflectionDepth = await fetchReflectionDepthMetrics();
  res.json({ reflectionDepth });
});

analyticsRouter.get('/export/xlsx', async (_req, res) => {
  try {
    const workbook = await buildReportWorkbook();
    const filename = getReportFilename();
    const sheetNames = workbook.worksheets.map((w) => w.name);

    debugLog('analytics.ts:export', 'workbook built', {
      sheetCount: sheetNames.length,
      sheetNames,
      expectedSheets: 13,
    }, 'B');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    await workbook.xlsx.write(res);
    res.end();
    debugLog('analytics.ts:export', 'workbook streamed', { filename }, 'B');
  } catch (e) {
    debugLog('analytics.ts:export', 'export failed', { error: String(e) }, 'B');
    throw e;
  }
});
