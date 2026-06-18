import { Router } from 'express';
import { contentDispositionAttachment, getMainReportFilename } from '../constants/exportMeta.js';
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
} from '../services/analytics/index.js';
export const analyticsRouter = Router();

analyticsRouter.get('/overview', async (_req, res) => {
  const overview = await fetchAnalyticsOverview();
  res.json({ overview });
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
  const workbook = await buildReportWorkbook();
  const filename = getMainReportFilename();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', contentDispositionAttachment(filename));

  await workbook.xlsx.write(res);
  res.end();
});
