//-> curl -X POST http://localhost:3002/callback/revoke -H "Content-Type: application/json" -H "X-VERIFY: 55814bcee8982017bf38e78d7475e01fb60388b8716d58a7317b3e945eae9543###1" -d "{\"response\": \"eyJzdWNjZXNzIjp0cnVlLCJjb2RlIjoiU1VDQ0VTUyIsIm1lc3NhZ2UiOiJZb3VyIHN1YnNjcmlwdGlvbiBpcyByZXZva2VkLiIsImRhdGEiOnsiY2FsbGJhY2tUeXBlIjoiU1VCU0NSSVBUSU9OIiwibWVyY2hhbnRJZCI6IlVBVE1FUkNIQU5UIiwibWVyY2hhbnRTdWJzY3JpcHRpb25JZCI6IjQ0ZGVkMDhmLSIsInN1YnNjcmlwdGlvbkRldGFpbHMiOnsic3Vic2NyaXB0aW9uSWQiOiJPTVMyMTA3MTQxNzUzMzEwMjA4MzAxNzQ4Iiwic3RhdGUiOiJSRVZPS0VEIn19fQ==\"}"


const sha256 = require("sha256");

// UAT environment
const SALT_KEY = "775765ff-824f-4cc4-9053-c3926e493514";
const SALT_INDEX = 1;

module.exports = async function (req, res) {
  const { response } = req.body;
  const xVerify = req.headers["x-verify"];

  if (!response || !xVerify) {
    return res.status(400).send("Invalid request");
  }

  const decodedResponse = Buffer.from(response, "base64").toString("utf8");
  const jsonResponse = JSON.parse(decodedResponse);

  console.log("Decoded response from PhonePe:", jsonResponse);

  const checksum = sha256(response + SALT_KEY) + "###" + SALT_INDEX;

  if (xVerify !== checksum) {
    return res.status(400).send("Checksum validation failed");
  }

  // Process the revoked subscription
  // You can save the subscription state to your database or take any necessary actions

  res.send("Callback received and processed");
};
