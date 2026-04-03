import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';

const URI = 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink';

try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 15000, family: 4 });
    const users = await mongoose.connection.db.collection('users')
        .find({ role: 'DRIVER' }, { projection: { id: 1, name: 1, phone: 1, email: 1, role: 1 } })
        .limit(5).toArray();
    console.log(JSON.stringify(users, null, 2));
} catch(e) {
    console.error('Error:', e.message);
} finally {
    process.exit(0);
}
