import type { Request, Response, NextFunction } from "express";
import type { IncomingMessage } from "http";
import { slidingWindow } from "@arcjet/node";
import aj from "../config/arcjet.js";

// Pre-auth middleware: run early to block bots/shields and apply guest-level rate limits.
export const preAuthSecurityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test') return next();

    try {
        // Use guest limits for unauthenticated/pre-auth checks
        const limit = 5;
        const message = 'Guest request limit exceeded (5 per minute). Please sign up for higher limits';

        const client = aj.withRule(
            slidingWindow({
                mode: 'LIVE',
                interval: '1m',
                max: limit,
            })
        );

        // Pass the full Express request to Arcjet so it can inspect headers, socket, etc.
        const decision = await client.protect(req as unknown as IncomingMessage);

        if (decision.isDenied() && decision.reason.isBot()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Automated requests are not allowed' });
        }

        if (decision.isDenied() && decision.reason.isShield()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Request blocked by security policy' });
        }

        if (decision.isDenied() && decision.reason.isRateLimit()) {
            return res.status(403).json({ error: 'Too many requests.', message });
        }

        next();
    } catch (e) {
        console.error('Arcjet Pre-auth Middleware Error: ', e);
        res.status(500).json({ error: 'Internal Error', message: 'Something went wrong with Pre-auth Security Middleware' });
    }
};

// Post-auth middleware: should be registered after authentication so `req.user` is populated.
export const postAuthRateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test') return next();

    try {
        // If there's no authenticated user, skip post-auth rate limiting (pre-auth already applied)
        if (!req.user) return next();

        const role: RateLimitRole = (req.user as any).role ?? 'guest';

        let limit: number;
        let message: string;

        switch (role) {
            case 'admin':
                limit = 20;
                message = 'Admin request limit exceeded (20 per minute). Slow Down';
                break;

            case 'teacher':
            case 'student':
                limit = 10;
                message = 'User request limit exceeded (10 per minute). Please Wait';
                break;

            default:
                limit = 5;
                message = 'Guest request limit exceeded (5 per minute). Please sign up for higher limits';
                break;
        }

        const client = aj.withRule(
            slidingWindow({
                mode: 'LIVE',
                interval: '1m',
                max: limit,
            })
        );

        // Pass the full Express request to Arcjet so it can inspect headers, socket, etc.
        const decision = await client.protect(req as unknown as IncomingMessage);

        if (decision.isDenied() && decision.reason.isBot()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Automated requests are not allowed' });
        }

        if (decision.isDenied() && decision.reason.isShield()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Request blocked by security policy' });
        }

        if (decision.isDenied() && decision.reason.isRateLimit()) {
            return res.status(429).json({error: 'Too many requests.', message});
        }

        next();
    } catch (e) {
        console.error('Arcjet Post-auth Middleware Error: ', e);
        res.status(500).json({ error: 'Internal Error', message: 'Something went wrong with Post-auth Security Middleware' });
    }
};

// Default export kept for backward compatibility: pre-auth middleware
export default preAuthSecurityMiddleware;