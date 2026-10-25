import { clone } from '../core/state.js';
import { validateState } from '../core/validate.js';

/** Copy a conflicting snapshot into its own ID space; names, months and RNG stay intact. */
export function forkState(source, id) {
  validateState(source);
  if (!/^life-[a-z0-9]+-[a-z0-9]+$/u.test(id) || id === source.id) throw new Error('副本人生 ID 无效。');
  const state = clone(source), old = source.id;
  const reference = value => typeof value === 'string' && (value === old || value.startsWith(old + ':')) ? id + value.slice(old.length) : value;
  state.id = id; state.player.id = reference(state.player.id);
  for (const key of ['mentorId', 'partnerId']) state.player[key] = reference(state.player[key]);
  if (state.player.travel?.task?.actorId) state.player.travel.task.actorId = reference(state.player.travel.task.actorId);
  for (const person of state.people) person.id = reference(person.id);
  for (const faction of state.world.factions) faction.leaderId = reference(faction.leaderId);
  for (const item of state.player.mourning) item.actorId = reference(item.actorId);
  for (const item of state.world.activeEvents) item.id = reference(item.id);
  for (const item of state.world.history) if (item.eventId) item.eventId = reference(item.eventId);
  for (const entry of state.log) { entry.id = reference(entry.id); if (entry.actorId) entry.actorId = reference(entry.actorId); }
  for (const entry of state.choices) entry.actorId = reference(entry.actorId);
  for (const queued of state.queue) { queued.id = reference(queued.id); if (queued.payload.actorId) queued.payload.actorId = reference(queued.payload.actorId); if (queued.payload.worldEventId) queued.payload.worldEventId = reference(queued.payload.worldEventId); }
  if (state.pending) { state.pending.id = reference(state.pending.id); if (state.pending.payload.actorId) state.pending.payload.actorId = reference(state.pending.payload.actorId); if (state.pending.payload.worldEventId) state.pending.payload.worldEventId = reference(state.pending.payload.worldEventId); }
  if (state.migration?.previousPending) { const previous = state.migration.previousPending; previous.id = reference(previous.id); if (previous.payload.actorId) previous.payload.actorId = reference(previous.payload.actorId); }
  state.flags = Object.fromEntries(Object.entries(state.flags).map(([key, value]) => [key.replaceAll(old, id), value]));
  state.forkOf = { originalId: source.forkOf?.originalId || old, sourceId: old, revision: source.revision };
  return validateState(state);
}
