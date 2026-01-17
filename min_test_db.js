
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;
console.log('Testing URI:', uri);

mongoose.connect(uri)
    .then(() => {
        console.log('Connected!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Failed:', err.message);
        process.exit(1);
    });
