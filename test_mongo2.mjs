import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['8.8.8.8']);
const uri = "mongodb://dheerakumar3622:Dheeraj123@ac-klokthx-shard-00-00.j9op0nf.mongodb.net:27017,ac-klokthx-shard-00-01.j9op0nf.mongodb.net:27017,ac-klokthx-shard-00-02.j9op0nf.mongodb.net:27017/test?ssl=true&replicaSet=atlas-2yklok-shard-0&authSource=admin&retryWrites=true&w=majority";
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 }).then(() => {
    console.log("SUCCESS: Connected to MongoDB Standard");
    process.exit(0);
}).catch(err => {
    console.error("FAILED to connect:", err.message);
    process.exit(1);
});
