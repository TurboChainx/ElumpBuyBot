const mongoose = require("mongoose");
const axios = require("axios");
const Wallet = require("./walletModel"); // Your Wallet schema
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Telegram Bot Configuration
const botToken = "7859615154:AAEBQIWJ9qQEB2-uMAqbXNHmC93oWtScp6A"; // Telegram bot token
const chatID = ["@ilum_memeX_business"]; // Replace with your valid Telegram chat/group/channel ID

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected...");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// Function to send notifications via Telegram
const sendTelegramNotification = async (walletData) => {
  const { walletAddress, currency, amount } = walletData;
  const notification = `
<b>🎉 New Wallet Added 🎉</b>
<b>Address:</b> ${walletAddress}
<b>Currency:</b> ${currency}
<b>Amount:</b> ${amount}
`;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  for (const eachChatID of chatID) {
    try {
      const response = await axios.post(url, {
        chat_id: eachChatID,
        text: notification,
        parse_mode: "html",
      });
      console.log(`Notification sent to ${eachChatID}:`, response.data);
    } catch (err) {
      console.error(
        `Error sending notification to ${eachChatID}:`,
        err.response?.data || err.message
      );
    }
  }
};

// Listen for changes in the Wallet collection
const monitorWalletCollection = () => {
  const changeStream = Wallet.watch();

  changeStream.on("change", async (change) => {
    if (change.operationType === "insert") {
      const newWallet = change.fullDocument;
      console.log("New Wallet Added:", newWallet);

      // Send notification to Telegram
      await sendTelegramNotification(newWallet);
    }
  });

  console.log("Listening for wallet changes...");
};

// Start the bot
const startBot = async () => {
  await connectDB(); // Connect to the database
  monitorWalletCollection(); // Start monitoring the Wallet collection
};

startBot();
