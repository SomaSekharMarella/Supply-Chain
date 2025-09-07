require("dotenv").config();

console.log("-----------------------------------------");
console.log("Testing environment variables...");
console.log("SEPOLIA_URL:", process.env.SEPOLIA_URL ? "Loaded" : "Not Loaded");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "Loaded" : "Not Loaded");
console.log("-----------------------------------------");

