
import { BugReport } from '../models.js';

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
        console.error(`🐞 Bug Reported: ${message}`); // Log to server console
        
        res.status(201).json({ success: true });
    } catch (e) {
        console.error("Failed to save bug report:", e);
        res.status(500).json({ error: "Failed to report bug" });
    }
};
