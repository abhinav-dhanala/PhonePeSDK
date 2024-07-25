// cal_checksum.js
const sha256 = require("sha256");

const base64response = "eyJzdWNjZXNzIjp0cnVlLCJjb2RlIjoiU1VDQ0VTUyIsIm1lc3NhZ2UiOiJZb3VyIHN1YnNjcmlwdGlvbiBpcyByZXZva2VkLiIsImRhdGEiOnsiY2FsbGJhY2tUeXBlIjoiU1VCU0NSSVBUSU9OIiwibWVyY2hhbnRJZCI6IlVBVE1FUkNIQU5UIiwibWVyY2hhbnRTdWJzY3JpcHRpb25JZCI6IjQ0ZGVkMDhmLSIsInN1YnNjcmlwdGlvbkRldGFpbHMiOnsic3Vic2NyaXB0aW9uSWQiOiJPTVMyMTA3MTQxNzUzMzEwMjA4MzAxNzQ4Iiwic3RhdGUiOiJSRVZPS0VEIn19fQ==";
const checksum = sha256(base64response + "775765ff-824f-4cc4-9053-c3926e493514") + "###" + 1;
console.log(checksum);
