import React, { useState } from 'react';
import { View, TextInput, Button, SafeAreaView, StyleSheet, Alert, Linking, Text } from 'react-native';
import axios from 'axios';
import phonepeSDK from 'react-native-phonepe-pg';
import Base64 from 'react-native-base64';
import sha256 from 'sha256';
import { v4 as uuidv4 } from 'uuid';

const App = () => {
    const [data, setData] = useState({
        mobile: "",
        amount: ""
    });
    const [environment, setEnvironment] = useState("SANDBOX");
    const [merchantId, setMerchantID] = useState("PGTESTPAYUAT140");
    const [appID, setAppID] = useState(null);
    const [enableLogging, setEnableLogging] = useState(true);
    const [subscriptionId, setSubscriptionId] = useState(""); 
    const [authRequestId, setAuthRequestId] = useState(""); 
    const [authStatus, setAuthStatus] = useState(""); 

    const merchantUserId = "testUser123"; 

    const generateTransactionId = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 100000);
        const merchantPrefix = "T";
        return `${merchantPrefix}${timestamp}${random}`;
    };

    const generateUniqueId = (length = 16) => {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let uniqueId = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            uniqueId += charset[randomIndex];
        }
        return uniqueId;
    };

    const validateInputs = () => {
        if (!data.mobile || !data.amount) {
            Alert.alert("Error", "Please enter both mobile number and amount");
            return false;
        }
        if (isNaN(data.amount) || Number(data.amount) <= 0) {
            Alert.alert("Error", "Please enter a valid amount");
            return false;
        }
        return true;
    };

    const submitHandler = () => {
        if (!validateInputs()) return;

        phonepeSDK.init(environment, merchantId, appID, enableLogging).then(res => {
            const transactionId = generateTransactionId();
            const requestBody = {
                merchantId: merchantId,
                merchantTransactionId: transactionId,
                merchantUserId: merchantUserId,
                amount: data.amount * 100, 
                mobileNumber: data.mobile,
                callbackUrl: "", 
                paymentInstrument: {
                    type: "PAY_PAGE"
                }
            };

            console.log("Request Body:", requestBody);

            const salt_key = "775765ff-824f-4cc4-9053-c3926e493514";
            const salt_Index = 1;
            const payload = JSON.stringify(requestBody);
            const payload_main = Base64.encode(payload);

            console.log("Base64 Encoded Payload:", payload_main);

            const string = payload_main + "/pg/v1/pay" + salt_key;
            const checksum = sha256(string) + "###" + salt_Index;

            phonepeSDK.startTransaction(
                payload_main,
                checksum,
                null,
                null,
            ).then(resp => {
                console.log('Transaction response:', resp);
                setSubscriptionId(resp.subscriptionId); 
            }).catch(err => {
                console.error("Transaction error:", err);
                Alert.alert("Error", "Transaction failed");
            });
        }).catch(err => {
            console.error("Initialization error:", err);
            Alert.alert("Error", "PhonePe SDK initialization failed");
        });
    };

    const setupAutopayHandler = async () => {
        if (!validateInputs()) return;

        try {
            const MerchantSubscriptionId = generateUniqueId();
            const AuthRequestId = generateTransactionId();
            setAuthRequestId(AuthRequestId); 

            const requestBody = {
                amount: data.amount * 100, 
                mobile: data.mobile,
                merchantUserId: merchantUserId,
                merchantSubscriptionId: MerchantSubscriptionId
            };

            console.log("Setup Autopay Request Body:", requestBody);

            const subscriptionResponse = await axios.post('http://192.168.29.14:3002/subscription/create', requestBody);
            console.log('Subscription response:', subscriptionResponse.data);
            const { subscriptionId } = subscriptionResponse.data.data;

            if (!subscriptionId) {
                throw new Error('Subscription ID is missing in the response');
            }

            setSubscriptionId(subscriptionId); 
            console.log(`Stored Subscription ID: ${subscriptionId}`);

            const authRequestBody = {
                subscriptionId: subscriptionId,
                authRequestId: AuthRequestId,
                amount: data.amount,
                userId: merchantUserId,
                targetApp: "com.phonepe.app"
            };

            console.log("Auth Request Body:", authRequestBody);

            const authResponse = await axios.post('http://192.168.29.14:3002/auth/submit', authRequestBody);
            console.log('Auth request response:', authResponse.data);
            const { redirectUrl } = authResponse.data.data;

            if (redirectUrl) {
                console.log(`Redirecting user to: ${redirectUrl}`);
                await Linking.openURL(redirectUrl);
            } else {
                throw new Error('Redirect URL is missing');
            }

            // Wait for 18 seconds before checking the auth status
            setTimeout(async () => {
                console.log("Checking auth status after 18 seconds delay...");
                const statusResponse = await checkAuthStatus(AuthRequestId);
            }, 18000); 

        } catch (error) {
            console.error("Setup autopay error:", error);
            if (error.response) {
                console.error("Error response data:", error.response.data);
                console.error("Error response status:", error.response.status);
                console.error("Error response headers:", error.response.headers);
            } else if (error.request) {
                console.error("Error request data:", error.request);
            } else {
                console.error("Error message:", error.message);
            }
            Alert.alert("Error", "An error occurred while setting up autopay");
        }
    };

    // Function to check the auth status
    const checkAuthStatus = async (authRequestId) => {
        try {
            const endpoint = `/v3/recurring/auth/status/${merchantId}/${authRequestId}`;
            const xVerifyChecksum = createChecksum(endpoint);
    
            console.log("Endpoint:", endpoint);
            console.log("Checksum:", xVerifyChecksum);
    
            const response = await axios.get(`https://api-preprod.phonepe.com/apis/pg-sandbox${endpoint}`, {
                headers: {
                    "Content-Type": "application/json",
                    "X-VERIFY": xVerifyChecksum,
                    accept: "application/json",
                },
            });
    
            console.log("PhonePe auth request status response:", response.data);
    
            const subscriptionState = response.data.data?.subscriptionDetails?.state;
            const transactionState = response.data.data?.transactionDetails?.state;
    
            console.log(`Subscription State: ${subscriptionState}`);
            console.log(`Transaction State: ${transactionState}`);
    
            // Determine overall auth status based on response
            let status;
            if (subscriptionState === 'ACTIVE' && transactionState === 'COMPLETED') {
                status = 'SUCCESS';
            } else if (subscriptionState === 'FAILED' || transactionState === 'FAILED') {
                status = 'FAILED';
            } else {
                status = 'PENDING';
            }
    
            console.log(`Determined Auth Status: ${status}`);
    
            // Set the auth status in state
            setAuthStatus(status);
    
            // Provide feedback to the user based on the status
            if (status === 'SUCCESS') {
                Alert.alert('Success', 'Autopay setup successful');
                // Trigger the recurring process after success
                triggerRecurringProcess();
            } else if (status === 'FAILED') {
                Alert.alert('Failed', 'Autopay setup failed');
            } else {
                Alert.alert('Pending', 'Autopay setup is pending');
            }
    
        } catch (error) {
            console.error("Error checking auth status:", error);
            if (error.response) {
                console.error("Error response data:", error.response.data);
                console.error("Error response status:", error.response.status);
            } else if (error.request) {
                console.error("Error request data:", error.request);
            } else {
                console.error("Error message:", error.message);
            }
            Alert.alert("Error", "An error occurred while checking auth status");
        }
    };

    const triggerRecurringProcess = async () => {
        try {
            // Initialize Recurring Debit using recurring_notification
            const recurringNotificationResponse = await axios.post('http://192.168.29.14:3002/recurring/notification', {
                subscriptionId: subscriptionId,
                transactionId: authRequestId,  // Use the authRequestId here
                amount: data.amount * 100,
                userId: merchantUserId
            });
    
            console.log('Recurring Notification Response:', recurringNotificationResponse.data);
    
            const { notificationId } = recurringNotificationResponse.data.data;
    
            // Execute Recurring Debit
            const recurringDebitResponse = await axios.post('http://192.168.29.14:3002/recurring/execute', {
                subscriptionId: subscriptionId,
                notificationId: notificationId,
                transactionId: authRequestId,  // Use the same authRequestId (transactionId) here
                userId: merchantUserId
            });
    
            console.log('Recurring Debit Response:', recurringDebitResponse.data);
    
            // Check Recurring Debit Status
            const recurringDebitStatusResponse = await axios.get(`http://192.168.29.14:3002/recurring/status/${merchantId}/${authRequestId}`);
            console.log('Recurring Debit Status Response:', recurringDebitStatusResponse.data);
    
            Alert.alert("Success", "Recurring process completed successfully.");
        } catch (error) {
            console.error("Error in recurring process:", error);
            Alert.alert("Error", "An error occurred during the recurring process.");
        }
    };
    
    
    

    // Helper function to create checksum
    const createChecksum = (endpoint) => {
        const SALT_KEY = "775765ff-824f-4cc4-9053-c3926e493514";
        const SALT_INDEX = 1;
        const stringToHash = endpoint + SALT_KEY;
        const hashedString = sha256(stringToHash);
        return `${hashedString}###${SALT_INDEX}`;
    };

    return (
        <View>
            <SafeAreaView>
                <View style={Styles.container}>
                    <TextInput
                        placeholder='Enter Mobile Number'
                        onChangeText={(txt) => setData({ ...data, mobile: txt })}
                        style={Styles.textField}
                        keyboardType='numeric'
                    />
                    <TextInput
                        placeholder='Enter Amount'
                        onChangeText={(txt) => setData({ ...data, amount: txt })}
                        style={Styles.textField}
                        keyboardType='numeric'
                    />
                    <Button title="Pay" onPress={submitHandler} />
                    <Button title="Setup Autopay" onPress={setupAutopayHandler} />
                    {authStatus ? <Text>Authorization Status: {authStatus}</Text> : null}
                </View>
            </SafeAreaView>
        </View>
    );
};

const Styles = StyleSheet.create({
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        gap: 10
    },
    textField: {
        padding: 15,
        borderColor: "gray",
        borderWidth: 1,
        width: "90%",
        marginBottom: 10
    }
});

export default App;
