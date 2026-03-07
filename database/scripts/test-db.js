import mongoose from 'mongoose';

// Nodes found via nslookup
const nodes = [
    'ac-klokthx-shard-00-00.j9op0nf.mongodb.net:27017',
    'ac-klokthx-shard-00-01.j9op0nf.mongodb.net:27017',
    'ac-klokthx-shard-00-02.j9op0nf.mongodb.net:27017'
];

const MONGO_URI = `mongodb://dheerakumar3622:Dheeraj123@${nodes.join(',')}/test?ssl=true&replicaSet=atlas-2yklok-shard-0&authSource=admin&retryWrites=true&w=majority`;

console.log('Testing connection to standard URI...');

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
    .then(() => {
        console.log('✅ Connection Successful!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection Failed:', err.message);
        process.exit(1);
    });
