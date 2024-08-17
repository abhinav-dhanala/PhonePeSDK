const axios = require("axios");
const sha256 = require("sha256");

// UAT environment constants
const MERCHANT_ID = "PGTESTPAYUAT140";
const PHONE_PE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const SALT_INDEX = 1;
const SALT_KEY = "775765ff-824f-4cc4-9053-c3926e493514";

// Helper function to create checksum for the X-VERIFY header
function createChecksum(endpoint) {
  const stringToHash = endpoint + SALT_KEY;
  const hashedString = sha256(stringToHash);
  return `${hashedString}###${SALT_INDEX}`;
}

module.exports = async function (req, res) {
  const { authRequestId } = req.params;

  // Construct the endpoint
  const endpoint = `/v3/recurring/auth/status/${MERCHANT_ID}/${authRequestId}`;
  const xVerifyChecksum = createChecksum(endpoint);

  console.log("Endpoint:", endpoint);
  console.log("Checksum:", xVerifyChecksum);

  try {
    // Make the GET request to PhonePe's API
    const response = await axios.get(`${PHONE_PE_HOST_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerifyChecksum,
        accept: "application/json",
      },
    });
    console.log("this is xverify",xVerifyChecksum);
    // Log and send the response data
    console.log("PhonePe auth request status response:", response.data);
    res.send(response.data);

  } catch (error) {
    // Handle errors appropriately
    if (error.response) {
      console.error("Error data:", error.response.data);
      console.error("Error status:", error.response.status);
      console.error("Error headers:", error.response.headers);
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      console.error("Error request:", error.request);
      res.status(500).send("No response received from PhonePe");
    } else {
      console.error("Error message:", error.message);
      res.status(500).send(error.message);
    }
  }
};
