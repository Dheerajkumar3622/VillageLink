
import { BugReport } from '../models.js';
import fs from 'fs';
import path from 'path';

// @desc    Report a bug/glitch
// @route   POST /api/bugs/report
export const reportBug = async (req, res) => {
    try {
        const { message, stackTrace, componentStack, userId } = req.body;
        
        const report = new BugReport({
            userId: userId || 'ANONYMOUS',
            message,
            stackTrace,
            componentStack,
            userAgent: req.headers['user-agent']
        });

        await report.save();
        
        // Log to local file for easy backend inspection
        const logLine = `[${new Date().toISOString()}] User: ${userId || 'ANONYMOUS'}\nError: ${message}\nStack: ${stackTrace}\nComponentStack: ${componentStack || ''}\n\n`;
        fs.appendFileSync(path.resolve('client_errors.log'), logLine);
        
        console.error(`🐞 Bug Reported: ${message}`); // Log to server console
        
        res.status(201).json({ success: true });
    } catch (e) {
        console.error("Failed to save bug report:", e);
        res.status(500).json({ error: "Failed to report bug" });
    }
};

