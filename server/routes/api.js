import { Router } from 'express';
import { ADMIN_PASSWORD, EVENT_STATES } from '../constants.js';
import { getEventState, updateEventState, store } from '../db.js';
import {
  getAllVolunteers,
  getVolunteerById,
  findVolunteersByNameCentre,
  addVolunteer,
  updateVolunteer,
  deleteVolunteer,
  setVolunteerJoined,
  regenerateCode,
  generateAllBoards,
  generateBoardForVolunteer,
  resetVolunteerProgress,
  resetAllProgress,
  assignColorsEvenly,
  getVolunteerPublic,
  getJoinedCount,
  getCentres,
} from '../services/volunteers.js';
import { validateCellEntry, saveCellEntry } from '../services/validation.js';
import {
  runPreEventValidation,
  exportResults,
  exportBackup,
} from '../services/health.js';

const router = Router();

function requireAdmin(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function isEventLocked() {
  const event = getEventState();
  return [EVENT_STATES.ACTIVE, EVENT_STATES.PAUSED, EVENT_STATES.REVEALED].includes(
    event.status
  );
}

function getIo(req) {
  return req.app.get('io');
}

// Public routes
router.get('/event', (req, res) => {
  const event = getEventState();
  res.json({
    status: event.status,
    timerEnabled: !!event.timer_enabled,
    timerSeconds: event.timer_seconds,
    joinedCount: getJoinedCount(),
    centres: getCentres(),
  });
});

router.post('/volunteer/login', (req, res) => {
  const { name, centre } = req.body;
  if (!name?.trim() || !centre) {
    return res.status(400).json({ error: 'Name and centre are required.' });
  }

  const matches = findVolunteersByNameCentre(name, centre);
  if (matches.length === 0) {
    return res.status(404).json({
      error: 'Volunteer not found. Please contact the moderator.',
    });
  }

  if (matches.length > 1) {
    return res.json({
      multiple: true,
      volunteers: matches.map((v) => ({
        id: v.id,
        name: v.name,
        centre: v.centre,
        code: v.code,
      })),
    });
  }

  const volunteer = setVolunteerJoined(matches[0].id);
  if (!volunteer.board) {
    try {
      generateBoardForVolunteer(volunteer.id);
    } catch {
      /* board may fail if not enough letters */
    }
  }

  const updated = getVolunteerPublic(volunteer.id);
  const io = getIo(req);
  io?.emit('joined:update', { joinedCount: getJoinedCount() });

  res.json({ volunteer: updated, event: getEventState() });
});

router.post('/volunteer/select', (req, res) => {
  const { id } = req.body;
  const volunteer = getVolunteerById(id);
  if (!volunteer) {
    return res.status(404).json({ error: 'Volunteer not found.' });
  }

  setVolunteerJoined(id);
  if (!volunteer.board) {
    try {
      generateBoardForVolunteer(id);
    } catch {
      /* ignore */
    }
  }

  const updated = getVolunteerPublic(id);
  const io = getIo(req);
  io?.emit('joined:update', { joinedCount: getJoinedCount() });

  res.json({ volunteer: updated, event: getEventState() });
});

router.get('/volunteer/:id', (req, res) => {
  const volunteer = getVolunteerPublic(parseInt(req.params.id, 10));
  if (!volunteer) {
    return res.status(404).json({ error: 'Volunteer not found.' });
  }
  res.json({ volunteer, event: getEventState() });
});

router.post('/volunteer/:id/cell', (req, res) => {
  const playerId = parseInt(req.params.id, 10);
  const { cellIndex, name, centre, code } = req.body;
  const event = getEventState();

  if (event.status !== EVENT_STATES.ACTIVE) {
    return res.status(403).json({ error: 'Game is not active.' });
  }

  const result = validateCellEntry(playerId, cellIndex, { name, centre, code });
  if (!result.ok) {
    return res.status(400).json({ error: result.message });
  }

  const updated = saveCellEntry(playerId, cellIndex, result.partner);
  const publicData = getVolunteerPublic(playerId);

  const io = getIo(req);
  io?.emit('progress:update', {
    volunteerId: playerId,
    progress: publicData.progress,
    status: publicData.status,
    completionPosition: publicData.completionPosition,
  });

  res.json({ volunteer: publicData });
});

// Admin routes
router.post('/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid password' });
});

router.get('/admin/volunteers', requireAdmin, (req, res) => {
  const { search, centre } = req.query;
  let volunteers = getAllVolunteers();

  if (search) {
    const q = search.toLowerCase();
    volunteers = volunteers.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.code.includes(q)
    );
  }
  if (centre) {
    volunteers = volunteers.filter((v) => v.centre === centre);
  }

  res.json({ volunteers, event: getEventState(), joinedCount: getJoinedCount() });
});

router.post('/admin/volunteers', requireAdmin, (req, res) => {
  try {
    const volunteer = addVolunteer(req.body.name, req.body.centre);
    getIo(req)?.emit('admin:update', { type: 'volunteer_added' });
    res.json({ volunteer });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/admin/volunteers/:id', requireAdmin, (req, res) => {
  try {
    const volunteer = updateVolunteer(parseInt(req.params.id, 10), req.body);
    getIo(req)?.emit('admin:update', { type: 'volunteer_updated' });
    res.json({ volunteer });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/admin/volunteers/:id', requireAdmin, (req, res) => {
  deleteVolunteer(parseInt(req.params.id, 10));
  getIo(req)?.emit('admin:update', { type: 'volunteer_deleted' });
  res.json({ ok: true });
});

router.post('/admin/volunteers/:id/regenerate-code', requireAdmin, (req, res) => {
  try {
    const volunteer = regenerateCode(parseInt(req.params.id, 10));
    res.json({ volunteer });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/admin/volunteers/:id/generate-board', requireAdmin, (req, res) => {
  try {
    const cells = generateBoardForVolunteer(parseInt(req.params.id, 10));
    res.json({ cells, volunteer: getVolunteerById(parseInt(req.params.id, 10)) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/admin/volunteers/:id/reset-progress', requireAdmin, (req, res) => {
  const volunteer = resetVolunteerProgress(parseInt(req.params.id, 10));
  getIo(req)?.emit('progress:update', {
    volunteerId: volunteer.id,
    progress: volunteer.progress,
    status: volunteer.status,
  });
  res.json({ volunteer });
});

router.post('/admin/generate-boards', requireAdmin, (req, res) => {
  if (isEventLocked()) {
    return res.status(403).json({ error: 'Board generation is locked during active event.' });
  }
  try {
    const results = generateAllBoards();
    res.json({ results, count: results.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/admin/start-event', requireAdmin, (req, res) => {
  const validation = runPreEventValidation();
  if (!validation.ready) {
    return res.status(400).json({
      error: 'Pre-event validation failed. Run validation and fix issues first.',
      validation,
    });
  }
  const event = updateEventState({
    status: EVENT_STATES.ACTIVE,
    started_at: new Date().toISOString(),
  });
  getIo(req)?.emit('event:update', { status: event.status });
  res.json({ event });
});

router.post('/admin/pause-event', requireAdmin, (req, res) => {
  const event = updateEventState({ status: EVENT_STATES.PAUSED });
  getIo(req)?.emit('event:update', { status: event.status });
  res.json({ event });
});

router.post('/admin/resume-event', requireAdmin, (req, res) => {
  const event = updateEventState({ status: EVENT_STATES.ACTIVE });
  getIo(req)?.emit('event:update', { status: event.status });
  res.json({ event });
});

router.post('/admin/reveal-teams', requireAdmin, (req, res) => {
  const assignments = assignColorsEvenly();
  const event = updateEventState({
    status: EVENT_STATES.REVEALED,
    revealed_at: new Date().toISOString(),
  });
  getIo(req)?.emit('teams:revealed', { assignments });
  getIo(req)?.emit('event:update', { status: event.status });
  res.json({ event, assignments });
});

router.post('/admin/reset-event', requireAdmin, (req, res) => {
  resetAllProgress();
  store.clearAllBoards();
  const event = updateEventState({
    status: EVENT_STATES.SETUP,
    started_at: null,
    revealed_at: null,
  });
  getIo(req)?.emit('event:update', { status: event.status });
  getIo(req)?.emit('admin:update', { type: 'event_reset' });
  res.json({ event });
});

router.get('/admin/health', requireAdmin, (req, res) => {
  res.json(runPreEventValidation());
});

router.get('/admin/export/:format', requireAdmin, (req, res) => {
  const format = req.params.format === 'csv' ? 'csv' : 'json';
  const result = exportResults(format);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.content);
});

router.get('/admin/backup', requireAdmin, (req, res) => {
  const result = exportBackup();
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.content);
});

router.get('/admin/overview', requireAdmin, (req, res) => {
  const volunteers = getAllVolunteers();
  const event = getEventState();
  
  const joinedLetters = volunteers
    .filter((v) => v.joined)
    .map((v) => v.name.trim()[0]?.toUpperCase())
    .filter(Boolean)
    .sort();

  res.json({
    event,
    joinedCount: getJoinedCount(),
    totalVolunteers: volunteers.length,
    playing: volunteers.filter((v) => v.status === 'playing').length,
    completed: volunteers.filter((v) => v.status === 'completed').length,
    waiting: volunteers.filter((v) => v.status === 'waiting').length,
    joinedLetters,
  });
});

export default router;
