import mongoose from 'mongoose';
const uri = "mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink";
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 }).then(() => {
    console.log("SUCCESS: Connected to MongoDB Atlas");
    process.exit(0);
}).catch(err => {
    console.error("FAILED to connect:", err.message);
    process.exit(1);
});
