import dotenv from 'dotenv'
import connectDB from './db/db.js';
import { app } from './app.js';

dotenv.config({
    path: './env'
})

const PORT = process.env.PORT || 4000

connectDB()
.then(() => {
    app.listen(PORT, () => {
        console.log("Server listening at ",PORT) // Server Started.
    })
})
.catch((err)=>{
    console.log("MongoDB connection failed after connected to DB !!",err)
})