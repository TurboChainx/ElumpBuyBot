const Web3 = require("web3");
const mongoose = require("mongoose");
const axios = require("axios");
const cron = require("node-cron");
const chatID = ["@elumphant_public"];
const preSaleContractAbi = require("./abi/ElumphantPresale.json");

const Wallet = require("./walletModel"); // Your Wallet schema
const dotenv = require("dotenv");
// Load environment variables
dotenv.config();

const botToken = "7580575032:AAFquDCGRagrXaBn6GJYnV20TjdFJX6Iesw"; //TODO: Replace with our telegram bot Or Rename Bot
//Need address
const presaleETHContractAddress = "0xDA46431C574Fa076b6ca51450C1e858f74b0BfC3";
const presaleBNBContractAddress = "0xDA46431C574Fa076b6ca51450C1e858f74b0BfC3";
const ALCHEMY_API_KEY = "Xv6ujzF75VoLFfJhXV4KDt_J65f6nfuv";
const web3_ETH = new Web3(
  new Web3.providers.HttpProvider(
    `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  )
);
const web3_BNB = new Web3(
  new Web3.providers.HttpProvider(
    `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  )
);

const emojis = ["🦣", "🦁", "🐻", "🦄", "🦒", "🦘", "🦙", "🐍", "🐕", "🐸"];

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

// Define a Mongoose Schema for event data
const EventElumpSchema = new mongoose.Schema({
  buyer: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  cost: { type: Number, required: true },
  totalPurchased: { type: Number, required: true },
  costInUSD: { type: Number, required: true },
  // chainType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Create a Mongoose model
const Event = mongoose.model("Event_Elump", EventElumpSchema);

const aggregateRichListFromBothCollections = async () => {
  try {
    const eventElumpsAggregate = mongoose.connection
      .collection("event_elumps")
      .aggregate([
        { $group: { _id: "$buyer", totalAmount: { $sum: "$amount" } } },
      ]);

    const walletsAggregate = mongoose.connection
      .collection("wallets")
      .aggregate([
        { $group: { _id: "$buyer", totalAmount: { $sum: "$amount" } } },
      ]);

    // Use toArray to fetch data
    const eventElumpsResults = await eventElumpsAggregate.toArray();
    const walletsResults = await walletsAggregate.toArray();

    // Combine results
    const combinedResults = [...eventElumpsResults, ...walletsResults];

    // Merge totals for the same buyer
    const mergedResults = combinedResults.reduce((acc, curr) => {
      const existing = acc.find((item) => item._id === curr._id);
      if (existing) {
        existing.totalAmount += curr.totalAmount;
      } else {
        acc.push(curr);
      }
      return acc;
    }, []);

    // Sort by totalAmount in descending order
    const sortedResults = mergedResults.sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    // Top 10 buyers
    const top10RichList = sortedResults.slice(0, 10);

    return { top10RichList };
  } catch (error) {
    console.error("Error fetching rich list:", error);
    throw error;
  }
};

const presaleETHContract = new web3_ETH.eth.Contract(
  preSaleContractAbi,
  presaleETHContractAddress
);

const presaleBNBContract = new web3_BNB.eth.Contract(
  preSaleContractAbi,
  presaleBNBContractAddress
);

let fromETHBlock = 0;
let toETHBlock = 0;
let fromBNBBlock = 0;
let toBNBBlock = 0;
let totalSupply = 0;
let currentSupply = 0;
let ETH_$ElumpPrice = 0;
let BNB_$ElumpPrice = 0;
let LatestETHPrice = 0;
let LatestBNBPrice = 0;
let soldETHTokens = 0;
let soldBNBTokens = 0;

totalSupply = 35000000000;

cron.schedule("* * * * *", async () => {
  try {
    ETH_$ElumpPrice = await presaleETHContract.methods.tokenPriceInUSD().call();
    BNB_$ElumpPrice = await presaleBNBContract.methods.tokenPriceInUSD().call();

    LatestETHPrice = await presaleETHContract.methods
      .getLatestETHPrice()
      .call();
    LatestBNBPrice = await presaleBNBContract.methods
      .getLatestETHPrice()
      .call();

    soldETHTokens = await presaleETHContract.methods
      .totalTokensPurchased()
      .call();
    soldBNBTokens = await presaleBNBContract.methods
      .totalTokensPurchased()
      .call();
  } catch (error) {
    console.error("Error fetching tokenPriceInUSD:", error.message);
  }
  console.log("ETH_$ElumpPrice ========= \n", ETH_$ElumpPrice);
  const latestETHBlock = await web3_ETH.eth.getBlockNumber();
  const latestBNBBlock = await web3_BNB.eth.getBlockNumber();
  if (toETHBlock == 0) {
    fromETHBlock = latestETHBlock;
  } else {
    fromETHBlock = toETHBlock + 1;
  }
  toETHBlock = latestETHBlock;

  if (toBNBBlock == 0) {
    fromBNBBlock = latestBNBBlock;
  } else {
    fromBNBBlock = toBNBBlock + 1;
  }
  toBNBBlock = latestBNBBlock;

  await claimTokenContract(fromETHBlock, toETHBlock, presaleETHContract, "ETH");
  await claimTokenContract(fromBNBBlock, toBNBBlock, presaleBNBContract, "BNB");
});

const claimTokenContract = async (
  fromBlock,
  toBlock,
  presaleContract,
  chainType
) => {
  await presaleContract.getPastEvents(
    "TokensPurchased",
    {
      filter: {},
      fromBlock: fromBlock,
      toBlock: toBlock,
    },
    async function (error, events) {
      if (error) {
        console.log({ error });
      } else {
        for (let i in events) {
          var newNotificationInfo = generatenewNotificationInfo(
            events[i],
            chainType
          );
          await sendTelegramNotification(newNotificationInfo);
          const eventData = new Event(newNotificationInfo);
          await eventData.save();
          console.log("New Buyer:::::::::::::::::::\n", newNotificationInfo);
        }
      }
    }
  );
};

function generatenewNotificationInfo(event, chainType) {
  var buyer = event.returnValues.buyer;
  var amount = (event.returnValues.amount * 1.0) / 1e18;
  let paymentMethod;
  if (chainType == "BNB" && event.returnValues.paymentMethod == "ETH") {
    paymentMethod = "BNB";
  } else {
    paymentMethod = event.returnValues.paymentMethod;
  }
  var totalPurchased = event.returnValues.totalPurchased / 1e18;

  let costInUSD;
  if (
    (chainType == "BNB" && event.returnValues.paymentMethod == "ETH") ||
    (chainType == "BNB" && event.returnValues.paymentMethod == "USDT")
  ) {
    costInUSD = event.returnValues.costInUSD / 1e18;
  } else if (
    chainType == "BNB" &&
    event.returnValues.paymentMethod == "Airdrop"
  ) {
    costInUSD = event.returnValues.costInUSD / 1e36;
  } else if (
    (chainType == "ETH" && event.returnValues.paymentMethod == "ETH") ||
    (chainType == "ETH" && event.returnValues.paymentMethod == "USDT")
  ) {
    costInUSD = event.returnValues.costInUSD / 1e6;
  } else if (
    chainType == "ETH" &&
    event.returnValues.paymentMethod == "Airdrop"
  ) {
    costInUSD = event.returnValues.costInUSD / 1e24;
  }

  let cost;
  if (paymentMethod == "ETH") {
    cost = event.returnValues.cost / 1e18;
  } else if (paymentMethod == "BNB") {
    cost = event.returnValues.cost / 1e18;
  }
  // Ensure `value` is a number
  if (typeof cost !== "number") {
    cost = parseFloat(cost) || 0; // Convert to number; fallback to 0 if invalid
  }
  const result = {
    buyer: buyer,
    amount: amount,
    paymentMethod: paymentMethod,
    cost: cost,
    totalPurchased: totalPurchased,
    costInUSD: costInUSD,
    chainType: chainType,
  };
  console.log(
    "Result Added:=====================================================\n",
    result
  );
  return result;
}

// Function to send notifications via Telegram
const sendTelegramNotification = async (walletData) => {
  let {
    buyer,
    paymentMethod,
    amount,
    cost,
    totalPurchased,
    costInUSD,
    chainType,
  } = walletData;
  costInUSD =
    typeof costInUSD === "number" ? costInUSD : parseFloat(costInUSD) || 0;
  // Inside your main logic where you're generating the notification
  const pairs = generateTrophyMirrorPairs(costInUSD);
  // Ensure `value` is a number
  if (typeof cost !== "number") {
    cost = parseFloat(cost) || 0; // Convert to number; fallback to 0 if invalid
  }
  if (chainType == "ETH") {
    currentSupply = totalSupply - totalPurchased - soldBNBTokens / 1e18;
  } else {
    currentSupply = totalSupply - totalPurchased - soldETHTokens / 1e18;
  }
  const percent = ((currentSupply / totalSupply) * 100).toFixed(2);

  // Safely truncate buyerAddress
  const truncatedBuyer = truncate(buyer, 20);
  if (!truncatedBuyer) {
    console.error("Invalid buyer address:", buyer);
    return; // Exit early if invalid
  }
  let presaleContractAddress = "";
  if (chainType == "ETH") {
    presaleContractAddress = "0xDA46431C574Fa076b6ca51450C1e858f74b0BfC3";
  } else {
    presaleContractAddress = "0xDA46431C574Fa076b6ca51450C1e858f74b0BfC3";
  }
  const accounts = await aggregateRichListFromBothCollections();
  const richList = accounts.top10RichList;
  if (!Array.isArray(richList)) {
    console.error("Expected accounts to be an array, but got:", richList);
    return; // Exit function if accounts is not an array
  }
  let holders = "";
  holders += `\n<a href="">🌎🌎🌎 🦣$ELUMP🦣 - TOP 10 RICHLIST 🕵️‍♂️</a>\n\n`;
  richList.forEach((account, index) => {
    const buyer = account._id || "Unknown";
    const truncatedBuyer = truncate(buyer, 20);

    const formattedTotalAmount = account.totalAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    holders += `${index + 1}.<a href="">${truncatedBuyer}</a>     ${
      emojis[index]
    } ${formattedTotalAmount} $ELUMP\n`;
  });
  const formattedCost = costInUSD.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const notification = `\n${pairs}\n
<b>🥳🎉🎉 NEW BUY - 🐘$ELUMP🐘</b>\n
🤑 <a href="">${truncatedBuyer}</a>
💵 ${
    paymentMethod.toLowerCase() === "airdrop" ||
    paymentMethod.toLowerCase() === "usdt"
      ? `$${formattedCost}`
      : `${cost.toFixed(6)} ${paymentMethod} ( $${formattedCost} )`
  }
🐘 ${formattedAmount} $ELUMP 
${holders}    `;
  const url = `https://api.telegram.org/bot${botToken}/sendVideo`;
  for (const eachChatID of chatID) {
    try {
      const response = await axios.post(url, {
        chat_id: eachChatID,
        video: "https://elumphant.com/static/media/buybotmp4.mp4", //TODO: Update the video URL
        caption: notification,
        parse_mode: "html",
      });
    } catch (err) {
      console.error(
        `Error sending notification to ${eachChatID}:`,
        err.response?.data || err.message
      );
    }
  }
};

// Function to control the number of 🪙🐘 pairs and add a newline after every 5 pairs, with a max cap of 1000
function generateTrophyMirrorPairs(value) {
  let result = "";

  // Handle ranges and their prefixes
  if (value <= 100) {
    result += "💫𝓜💫 ";
    let pairStep = Math.floor(100 / 3);
    let pairCount = Math.max(Math.floor(value / pairStep), 1);
    for (let i = 0; i < pairCount; i++) {
      result += "💰🐘"; // Add one pair 🪙🐘 at a time
    }
    result += "💰";
  }

  if (value > 100 && value <= 300) {
    result += "💫𝓜💫 💰🐘💰🐘💰🐘💰\n";
    result += "🌟𝓐🌟 ";

    let pairStep = Math.floor(200 / 3);
    let deltaValue = value - 100;
    let pairCount = Math.max(Math.floor(deltaValue / pairStep), 1);
    for (let i = 0; i < pairCount; i++) {
      result += "🪙🐘"; // Add one pair 🪙🐘 at a time
    }
    result += "🪙";
  }

  if (value > 300 && value <= 600) {
    result += "💫𝓜💫 💰🐘💰🐘💰🐘💰\n🌟𝓐🌟 🪙🐘🪙🐘🪙🐘🪙\n";
    result += "💎𝓖💎 ";
    let pairStep = Math.floor(300 / 3);
    let deltaValue = value - 300;
    let pairCount = Math.max(Math.floor(deltaValue / pairStep), 1);
    for (let i = 0; i < pairCount; i++) {
      result += "💰🦣"; // Add one pair 🪙🐘 at a time
    }
    result += "💰";
  }

  // For values above 600
  if (value > 600 && value <= 1000) {
    result +=
      "💫𝓜💫 💰🐘💰🐘💰🐘💰\n🌟𝓐🌟 🪙🐘🪙🐘🪙🐘🪙\n💎𝓖💎 💰🦣💰🦣💰🦣💰\n";
    result += "💫𝓐💫 ";
    let pairStep = Math.floor(400 / 3);
    let deltaValue = value - 600;
    let pairCount = Math.max(Math.floor(deltaValue / pairStep), 1);
    for (let i = 0; i < pairCount; i++) {
      result += "🪙🦣"; // Add one pair 🪙🐘 at a time
    }
    result += "🪙";
  }
  // For values above 600
  if (value > 1000) {
    result += `
      —̳͟͞͞💗🌺🌺            🌺🌺
      🌺🌺🌺🌺🌺🌺🌺
      🌺🌺🌺🌺🌺🌺🌺
        🌺🌺🌺🌺🌺🌺
       Λ  🌺🌺🌺🌺🌺
      ( ˘ᵕ˘  🌺🌺🌺
      ヽ * つ    ＼     ／
        U U - ／🎀＼
        
        `;

    result += "\n💎💫🦣$𝓔𝓛𝓤𝓜𝓟🦣💫💎 \n\n";
    let pairStep = 100;
    let deltaValue = value - 1000;
    let pairCount = Math.max(Math.floor(deltaValue / pairStep), 1);
    for (let i = 0; i < pairCount; i++) {
      result += "🏅"; // Add one pair 🏅 at a time
    }
    const formattedValue = value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    result += `$${formattedValue}`;
    result += "\n\n 🥰🥰🥰😉😉💐💐💐";
  }
  return result;
}

var truncate = function (fullStr, strLen, separator) {
  if (fullStr.length <= strLen) return fullStr;

  separator = separator || "...";

  var sepLen = separator.length,
    charsToShow = strLen - sepLen,
    frontChars = Math.ceil(charsToShow / 2),
    backChars = Math.floor(charsToShow / 2);

  return (
    fullStr.substr(0, frontChars) +
    separator +
    fullStr.substr(fullStr.length - backChars)
  );
};

// Listen for changes in the Wallet collection
const monitorWalletCollection = () => {
  const changeStream = Wallet.watch();

  changeStream.on("change", async (change) => {
    if (change.operationType === "insert") {
      const newWallet = change.fullDocument;

      const { paymentMethod, amount } = newWallet;
      if (paymentMethod == "ETH") {
        newWallet.totalPurchased = soldETHTokens / 1e18;
        console.log(
          "ETH RANDOM ======================\n",
          amount,
          ETH_$ElumpPrice / 1e6,
          LatestETHPrice / 1e8
        );
        newWallet.cost =
          (amount * ETH_$ElumpPrice) / (1e6 * (LatestETHPrice / 1e8));
        newWallet.costInUSD = (amount * ETH_$ElumpPrice) / 1e6;
        newWallet.chainType = paymentMethod;
      } else {
        newWallet.totalPurchased = soldBNBTokens / 1e18;
        console.log(
          "BNB RANDOM ======================\n",
          amount,
          BNB_$ElumpPrice / 1e18,
          LatestBNBPrice / 1e8
        );
        newWallet.cost =
          (amount * BNB_$ElumpPrice) / (1e18 * (LatestBNBPrice / 1e8));
        newWallet.costInUSD = (amount * BNB_$ElumpPrice) / 1e18;
        newWallet.chainType = paymentMethod;
      }
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
