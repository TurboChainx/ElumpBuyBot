const Web3 = require("web3");
const axios = require("axios");
const cron = require("node-cron");
const botToken = "8027732957:AAGUOVFgvxfof9UpG_kNLgTj7bM0ZF2b4YM"; //TODO: Replace with our telegram bot Or Rename Bot
const chatID = ["@ilum_memeX_business"];
const preSaleContractAbi = require("./abi/ElumphantPresale.json");
//Need address
const presaleContractAddress = "0x4c0455510a3c7CDd0936754E01DfE9c9E216A33b";
const web3 = new Web3(
  new Web3.providers.HttpProvider(
    `https://bnb-testnet.g.alchemy.com/v2/V_rCYalxtyjmaLkG93spQeBcXHqWvtOI`
  )
);

const emojis = ["🦣", "🦁", "🐻", "🦄", "🦒", "🦘", "🦙", "🐍", "🐕", "🐸"];

const presaleContract = new web3.eth.Contract(
  preSaleContractAbi,
  presaleContractAddress
);

let fromBlock = 0;
let toBlock = 0;
let totalSupply = 9999999999999; //TODO: Replace with our Token Supply
let currenSupply = 9999999999999; //TODO: Initiate the value as same as the TOTAL SUPPLY

cron.schedule("* * * * *", async () => {
  const latestBlock = await web3.eth.getBlockNumber();

  if (toBlock == 0) {
    fromBlock = latestBlock;
  } else {
    fromBlock = toBlock + 1;
  }

  toBlock = latestBlock;

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
        console.log("=====Event data : ", events);

        for (let i in events) {
          var buyerAddress = events[i].returnValues.buyer;
          var amount = (events[i].returnValues.amount * 1.0) / 1e18;
          var value = events[i].returnValues.cost / 1e18; // TODO: Calculate the value from the current token price.
          var ticker = events[i].returnValues.paymentMethod;
          currenSupply = currenSupply - amount;
          // Debug `value` type and content
          console.log("Value received:", value, "Type:", typeof value);

          // Ensure `value` is a number
          if (typeof value !== "number") {
            value = parseFloat(value) || 0; // Convert to number; fallback to 0 if invalid
          }
          const accounts = await getTokenHolders(presaleContractAddress);
          let holders = "";
          /*holders += `\n<a href="https://scan.mypinata.cloud/ipfs/bafybeih3olry3is4e4lzm7rus5l3h6zrphcal5a7ayfkhzm5oivjro2cp4/#/address/${presaleContractAddress}">💰💰💰ELUMP - RICHLIST✅✅✅</a>\n\n`;
          accounts.map(
            (account, index) =>
              (holders += `${
                index + 1
              }.<a href="https://scan.mypinata.cloud/ipfs/bafybeih3olry3is4e4lzm7rus5l3h6zrphcal5a7ayfkhzm5oivjro2cp4/#/address/${
                account.address
              }">${account.address.slice(0, 10)}...${account.address.slice(
                -10
              )}</a>     ${emojis[index]} ${(
                parseInt(account.value) / parseInt(1000000000000000000)
              ).toFixed(2)} ELUMP\n`)
            //   console.log(account.value)
          );*/

          if (amount) {
            // Inside your main logic where you're generating the notification
            const notificationValue = amount * 0.1;
            const pairs = generateTrophyMirrorPairs(notificationValue);

            const notification = `\n${pairs} 
  <b>ELUMP New Buy -- ON ETHER CHAIN</b>
  <b>Buyer: </b> ${truncate(buyerAddress, 20)} 
  <b>Amount: </b>${amount.toFixed(2)} Elump 
  <b>Value: </b>${value.toFixed(2)} ${ticker} 
  <b>Circulating Supply: </b>$${currenSupply.toFixed(
    2
  )} / ${totalSupply.toFixed(2)} Elump\n
  ${holders}\n
            `;

            const url = `https://api.telegram.org/bot${botToken}/sendVideo`;
            chatID.forEach((eachChatID) => {
              setTimeout(async () => {
                try {
                  await axios.post(url, {
                    chat_id: eachChatID,
                    video: "https://growthdefi.com/assets/gallery/xGRO Buy.mp4", //TODO: Update the video URL
                    caption: notification,
                    parse_mode: "html",
                  });
                } catch (err) {
                  console.log("Bad ID: ", eachChatID);
                }
              }, 1000);
            });
            console.log("notification ::: ", notification);
          }
        }
      }
    }
  );
});

// Function to control the number of 🪙🐘 pairs and add a newline after every 5 pairs, with a max cap of 1000
function generateTrophyMirrorPairs(value) {
  let result = "";

  // Handle ranges and their prefixes
  if (value <= 100) {
    result += "❤️𝓜🌱";
    let pairStep = Math.floor(100 / 3);
    let pairCount = Math.max(Math.floor(value / pairStep), 1);
    for (let i = 0; i < pairCount; i++) {
      result += "💰🐘"; // Add one pair 🪙🐘 at a time
    }
    result += "💰";
  }

  if (value > 100 && value <= 300) {
    result += "❤️𝓜🌱🪙🐘🪙🐘🪙🐘🪙\n";
    result += "🌟𝓔🍀";

    let pairStep = Math.floor(200 / 3);
    let deltaValue = value - 100;
    let pairCount = Math.max(Math.floor(deltaValue / pairStep), 1);
    for (let i = 0; i < pairCount; i++) {
      result += "🪙🐘"; // Add one pair 🪙🐘 at a time
    }
    result += "🪙";
  }

  if (value > 300 && value <= 600) {
    result += "❤️𝓜🌱💰🐘💰🐘💰🐘💰\n🌟𝓔🍀🪙🐘🪙🐘🪙🐘🪙\n";
    result += "❤️𝓖☘️";
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
    result += "❤️𝓜🌱💰🐘💰🐘💰🐘💰\n🌟𝓔🍀🪙🐘🪙🐘🪙🐘🪙\n❤️𝓖☘️💰🦣💰🦣💰🦣💰\n";
    result += "🌟𝓐🎄";
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
        🌺🌺            🌺🌺
    🌺🌺🌺🌺🌺🌺🌺
    🌺🌺🌺🌺🌺🌺🌺
       🌺🌺🌺🌺🌺🌺
     Λ  🌺🌺🌺🌺🌺
    ( ˘ᵕ˘  🌺🌺🌺
     ヽ つ    ＼     ／
      U U   ／🎀＼`;

    result += "\n💎💫💫𝓔𝓛𝓐𝓜𝓟💫💫💎 \n";
    let pairStep = 300;
    let deltaValue = value - 1000;
    let pairCount = Math.max(Math.floor(deltaValue / pairStep), 1);
    for (let i = 0; i < pairCount; i++) {
      result += "🏅"; // Add one pair 🏅 at a time
    }
    result += ` : ${value}$`;
    result += "\n 🥰🥰🥰😉💐💐💐";
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

const getTokenHolders = async (tokenContractAddress) => {
  const url = `https://api.scan.pulsechain.com/api?module=token&action=getTokenHolders&contractaddress=${tokenContractAddress}&page=0&offset=30`;

  try {
    const response = await axios.get(url);
    const accounts = await response.data.result;

    const data = await findAccounts(accounts);
    const sortedData = accountSort(data);
    return sortedData.slice(0, 10);

    // return data; // Assuming response format includes result field
  } catch (error) {
    console.error("Error fetching token holders:", error);
    return [];
  }
};

const findAccounts = async (accounts) => {
  let data = [];
  await Promise.all(
    accounts.map(async (account) => {
      const isHolder = await checkAddressType(account.address);
      const isBurned = await checkBurnedAddress(account.address);
      if (isHolder && !isBurned) {
        data.push(account);
      }
    })
  );
  return data;
};

const accountSort = (accounts) => {
  accounts.sort((a, b) => b.value - a.value);
  return accounts;
};

const checkAddressType = async (address) => {
  try {
    const code = await web3.eth.getCode(address);

    // console.log(address, ": ", code);
    if (code.length > 2) {
      return false;
    } else {
      return true;
    }
  } catch (e) {
    return false;
  }
};
