import mongoose from "mongoose";

export async function connectDB() {
  mongoose.connection.on("connected", () => {
    console.log("MongoDB Connected");
  });
  await mongoose.connect(process.env.MONGODB_URI);
}
