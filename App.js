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
    const [subscriptionId, setSubscriptionId] = useState(""); // State to store the subscription ID
    const [authRequestId, setAuthRequestId] = useState(""); // State to store the auth request ID
    const [authStatus, setAuthStatus] = useState(""); // State to store the auth status

    // Ensure merchantUserId is set to a valid value
    const merchantUserId = "testUser123"; // Replace with a valid user ID

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
                amount: data.amount * 100, // Amount in paise
                mobileNumber: data.mobile,
                callbackUrl: "", // Provide a valid callback URL if required
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
                setSubscriptionId(resp.subscriptionId); // Store the subscription ID
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
            setAuthRequestId(AuthRequestId); // Set the authRequestId state

            const requestBody = {
                amount: data.amount * 100, // Amount in paise
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

            setSubscriptionId(subscriptionId); // Store the subscription ID
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

            // Fetch auth status
            const statusResponse = await axios.get(`http://192.168.29.14:3002/auth/status/${merchantId}/${AuthRequestId}`);
            console.log('Auth status response:', statusResponse.data);
            const { authStatus } = statusResponse.data.data;

            setAuthStatus(authStatus);

            if (authStatus === 'SUCCESS') {
                Alert.alert('Success', 'Autopay setup successful');
            } else {
                Alert.alert('Failed', 'Autopay setup failed');
            }

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
