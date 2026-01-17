
import Models from '../models.js';
const { Job } = Models;

const RURAL_JOBS = [
    {
        id: 'JOB-001',
        title: 'Farm Labour (Harvesting)',
        location: 'Chenari, Rohtas',
        wage: '₹350/day + Meals',
        contact: '9876543210 (Ramesh Singh)',
        type: 'DAILY'
    },
    {
        id: 'JOB-002',
        title: 'Construction Mason',
        location: 'Sasaram City',
        wage: '₹600/day',
        contact: '8765432109 (L&T Substack)',
        type: 'CONTRACT'
    },
    {
        id: 'JOB-003',
        title: 'E-Rickshaw Driver',
        location: 'Bikramganj Market',
        wage: '₹12,000/month',
        contact: '7654321098 (VillageLink Fleet)',
        type: 'FULL_TIME'
    },
    {
        id: 'JOB-004',
        title: 'Warehouse Helper',
        location: 'Rohtas Cold Storage',
        wage: '₹400/day',
        contact: '6543210987 (Storage Manager)',
        type: 'DAILY'
    },
    {
        id: 'JOB-005',
        title: 'Anganwadi Assistant',
        location: 'Multi-location Rohtas',
        wage: 'Fixed Stipend',
        contact: 'Block Office',
        type: 'GOVT_SCHEME'
    }
];

export const initializeJobs = async () => {
    try {
        const count = await Job.countDocuments();
        if (count === 0) {
            console.log("💼 Initializing Real Job Board Data...");
            await Job.insertMany(RURAL_JOBS);
            console.log("✅ Job Board Seeded with Production-Ready Data");
        }
    } catch (e) {
        console.error("❌ Job Initialization Failed:", e);
    }
};

export default { initializeJobs };
