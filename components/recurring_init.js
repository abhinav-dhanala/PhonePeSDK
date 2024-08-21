const axios = require("axios");
const sha256 = require("sha256");

// Environment details
const MERCHANT_ID = "PGTESTPAYUAT140";
const PHONE_PE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const SALT_INDEX = 1;
const SALT_KEY = "775765ff-824f-4cc4-9053-c3926e493514";


// Helper function to create checksum
function createChecksum(payload, endpoint) {
  const base64EncodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const string = base64EncodedPayload + endpoint + SALT_KEY;
  return sha256(string) + "###" + SALT_INDEX;
}

async function recurringInit(subscriptionId, transactionId, amount, userId) {
  const payload = {
    merchantId: MERCHANT_ID,
    merchantUserId: userId,
    subscriptionId: subscriptionId,
    transactionId: transactionId,
    autoDebit: true,
    amount: amount ,
  };

  const xVerifyChecksum = createChecksum(payload, "/v3/recurring/debit/init");

  try {
    const response = await axios.post(
      `${PHONE_PE_HOST_URL}/v3/recurring/debit/init`,
      { request: Buffer.from(JSON.stringify(payload), "utf8").toString("base64") },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerifyChecksum,
          accept: "application/json",
        },
      }
    );
    console.log("Recurring INIT response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in Recurring INIT:", error);
    throw error;
  }
}

module.exports = recurringInit;
