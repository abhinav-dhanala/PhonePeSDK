const axios = require("axios");
const sha256 = require("sha256");

// Environment details
const MERCHANT_ID = "PGTESTPAYUAT140";
const PHONE_PE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const SALT_INDEX = 1;
const SALT_KEY = "775765ff-824f-4cc4-9053-c3926e493514";

// Helper function to create checksum
function createChecksum(endpoint) {
  const string = endpoint + SALT_KEY;
  return sha256(string) + "###" + SALT_INDEX;
}

async function recurringDebitStatus(merchantTransactionId) {
  const endpoint = `/v3/recurring/debit/status/${MERCHANT_ID}/${merchantTransactionId}`;

  const xVerifyChecksum = createChecksum(endpoint);

  try {
    const response = await axios.get(`${PHONE_PE_HOST_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerifyChecksum,
        accept: "application/json",
      },
    });
    console.log("Recurring Debit Status response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in Recurring Debit Status:", error);
    throw error;
  }
}

module.exports = recurringDebitStatus;
