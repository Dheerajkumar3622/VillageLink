
import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/?appName=Villagelink';

console.log('Attempting to connect to MongoDB...');
console.log('URI:', MONGO_URI);

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connection Successful!');
    console.log('Database Name:', mongoose.connection.name);

    // Check for collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections found:', collections.map(c => c.name));

    // Sample Tickets
    const ticketCount = await mongoose.connection.db.collection('tickets').countDocuments();
    const tickets = await mongoose.connection.db.collection('tickets').find({}).limit(5).toArray();
    console.log(`Total Tickets: ${ticketCount}`);
    console.log('Sample Tickets:', tickets);

    // Sample Users
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    const users = await mongoose.connection.db.collection('users').find({}).limit(5).toArray();
    console.log(`Total Users: ${userCount}`);
    console.log('Sample Users:', users.map(u => ({ id: u.id, email: u.email, name: u.name })));

    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  });
