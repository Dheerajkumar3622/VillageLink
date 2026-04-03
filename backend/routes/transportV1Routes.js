/**
 * Transport API v1 — human apps + AI agents (same contracts).
 * Mount after `io` is created; pass { io, pushRealtimeEvent }.
 */
import Models, { OutboxEvent } from '../models.js';
import Auth from '../auth.js';
import {
    findMatchingVehiclesByStops,
    getActiveTrajectoryCount,
    getDriverRouteState
} from '../services/trajectoryMatcher.js';
import { rankSegmentVehicles, attachConfidence } from '../services/dispatchPolicyService.js';
import { ok, fail } from '../services/apiEnvelope.js';
import { toRoom, RT_EVENT } from '../services/realtimeContract.js';

const { Ticket } = Models;

function agentOrJwt(req, res, next) {
    const agentKey = process.env.AGENT_API_KEY;
    const key = req.headers['x-agent-api-key'];
    if (agentKey && key && key === agentKey) {
        req.isAgent = true;
        const uid = req.body?.userId || req.query?.userId || req.headers['x-user-id'];
        if (!uid || typeof uid !== 'string') {
            return fail(res, 400, 'USER_ID_REQUIRED', 'Agent calls require userId in body, query, or x-user-id header');
        }
        req.user = { id: uid.trim() };
        return next();
    }
    return Auth.authenticate(req, res, next);
}

export function registerTransportV1Routes(app, { io, pushRealtimeEvent } = {}) {
    app.get('/api/v1/transport/features', (req, res) => {
        return ok(res, {
            autonomyPhaseD: process.env.FEATURE_AUTONOMY_D === 'true',
            dispatchPolicy: 'rank_by_eta_v1',
            agentAuth: !!process.env.AGENT_API_KEY
        });
    });
    /** Public + agent: find vehicles on a stop segment (within 30 min default ETA). */
    app.post('/api/v1/transport/find-upcoming-vehicles', async (req, res) => {
        try {
            const { fromStop, toStop, maxEtaMinutes } = req.body || {};
            if (!fromStop || !toStop) {
                return fail(res, 400, 'INVALID_INPUT', 'fromStop and toStop required', { retryable: false });
            }
            const maxEta = Math.min(120, Math.max(5, parseInt(maxEtaMinutes, 10) || 30));
            let vehicles = findMatchingVehiclesByStops(String(fromStop).trim(), String(toStop).trim(), maxEta);
            vehicles = rankSegmentVehicles(vehicles).map(attachConfidence);
            return ok(res, {
                count: vehicles.length,
                activeDriversTotal: getActiveTrajectoryCount(),
                vehicles,
                fromStop: String(fromStop).trim(),
                toStop: String(toStop).trim(),
                maxEtaMinutes: maxEta
            }, { client: req.isAgent ? 'agent' : 'human' });
        } catch (e) {
            return fail(res, 500, 'FIND_UPCOMING_FAILED', e.message || 'Internal error', { retryable: true });
        }
    });

    /** Book a segment ride (creates ticket + realtime notify). */
    app.post('/api/v1/transport/book-segment-ride', agentOrJwt, async (req, res) => {
        try {
            const {
                fromStop,
                toStop,
                driverId,
                passengerCount = 1,
                totalPrice,
                paymentMethod = 'ONLINE'
            } = req.body || {};
            if (!fromStop || !toStop) {
                return fail(res, 400, 'INVALID_INPUT', 'fromStop and toStop required', { retryable: false });
            }
            const userId = req.user.id;
            const price = typeof totalPrice === 'number' && totalPrice >= 0 ? totalPrice : Math.max(10, passengerCount * 12);
            const ticketId = `TK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const ticket = new Ticket({
                id: ticketId,
                userId,
                from: String(fromStop).trim(),
                to: String(toStop).trim(),
                status: 'PENDING',
                paymentMethod,
                timestamp: Date.now(),
                passengerCount,
                totalPrice: price,
                routePath: [String(fromStop).trim(), String(toStop).trim()],
                driverId: driverId || undefined
            });
            await ticket.save();

            const payload = {
                ticketId: ticket.id,
                userId,
                providerId: driverId || null,
                fromStop: ticket.from,
                toStop: ticket.to,
                status: 'PENDING',
                totalPrice: price
            };

            if (typeof pushRealtimeEvent === 'function') {
                pushRealtimeEvent(toRoom.order(ticket.id), RT_EVENT.ORDER_CREATED, { data: payload });
            }
            if (io && driverId) {
                io.to(toRoom.provider(driverId)).emit('segment_booking', { version: 'v1', ...payload });
            }
            if (io) {
                io.to(toRoom.user(userId)).emit('segment_booking_confirmed', { version: 'v1', ...payload });
            }

            try {
                await OutboxEvent.create({
                    id: `obx_${ticketId}`,
                    eventType: RT_EVENT.ORDER_CREATED,
                    payload,
                    status: 'SENT'
                });
            } catch (obxErr) {
                console.warn('OutboxEvent persist:', obxErr.message);
            }

            return ok(res, { ticket: ticket.toObject ? ticket.toObject() : ticket, orderId: ticket.id }, { traceId: req.traceId });
        } catch (e) {
            return fail(res, 500, 'BOOK_SEGMENT_FAILED', e.message || 'Internal error', { retryable: true });
        }
    });

    /** Order status by ticket id (segment rides use ticket id as order id). */
    app.get('/api/v1/transport/order/:ticketId/status', agentOrJwt, async (req, res) => {
        try {
            const ticket = await Ticket.findOne({ id: { $regex: new RegExp(`^${req.params.ticketId}$`, 'i') } }).lean();
            if (!ticket) return fail(res, 404, 'NOT_FOUND', 'Order not found', { retryable: false });
            if (ticket.userId !== req.user.id) {
                return fail(res, 403, 'FORBIDDEN', 'Not your order', { retryable: false });
            }
            return ok(res, {
                orderId: ticket.id,
                status: ticket.status,
                from: ticket.from,
                to: ticket.to,
                driverId: ticket.driverId,
                timestamp: ticket.timestamp,
                totalPrice: ticket.totalPrice
            });
        } catch (e) {
            return fail(res, 500, 'ORDER_STATUS_FAILED', e.message, { retryable: true });
        }
    });

    /** Active driver trajectory + stops (for agents / ops). */
    app.get('/api/v1/transport/driver/:driverId/route-state', agentOrJwt, async (req, res) => {
        try {
            const driverId = req.params.driverId;
            const allowed = req.isAgent || req.user?.id === driverId || req.user?.role === 'ADMIN';
            if (!allowed) {
                return fail(res, 403, 'FORBIDDEN', 'Cannot read this driver route', { retryable: false });
            }
            const state = getDriverRouteState(driverId);
            if (!state) {
                return ok(res, { active: false, driverId }, { stale: true });
            }
            return ok(res, state);
        } catch (e) {
            return fail(res, 500, 'ROUTE_STATE_FAILED', e.message, { retryable: true });
        }
    });

    /** Pending passenger counts at stops (PENDING tickets boarding at `from`). */
    app.get('/api/v1/transport/stop-demand', async (req, res) => {
        try {
            const raw = req.query.stops || '';
            const stops = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
            if (stops.length === 0) {
                return fail(res, 400, 'INVALID_INPUT', 'Query stops=a,b,c required', { retryable: false });
            }
            const demand = {};
            await Promise.all(
                stops.map(async (stop) => {
                    const n = await Ticket.countDocuments({
                        status: 'PENDING',
                        from: { $regex: new RegExp(stop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
                    });
                    demand[stop] = n;
                })
            );
            return ok(res, { demand, staleAfterMs: 15000 });
        } catch (e) {
            return fail(res, 500, 'STOP_DEMAND_FAILED', e.message, { retryable: true });
        }
    });
}
