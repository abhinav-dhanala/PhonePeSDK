import React, { useState } from 'react';
import { View, TextInput, Button, SafeAreaView, StyleSheet, Alert, Linking, Text } from 'react-native';
import axios from 'axios';
import phonepeSDK from 'react-native-phonepe-pg';
import Base64 from 'react-native-base64';
import sha256 from 'sha256';

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
    const [authStatus, setAuthStatus] = useState("");

    const merchantUserId = "testUser123"; // Replace with a valid user ID

    const generateTransactionId = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 100000);
        const merchantPrefix = "T";
        return `${merchantPrefix}${timestamp}${random}`;
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

            const salt_key = "775765ff-824f-4cc4-9053-c3926e493514";
            const salt_Index = 1;
            const payload = JSON.stringify(requestBody);
            const payload_main = Base64.encode(payload);

            const string = payload_main + "/pg/v1/pay" + salt_key;
            const checksum = sha256(string) + "###" + salt_Index;

            phonepeSDK.startTransaction(
                payload_main,
                checksum,
                null,
                null,
            ).then(resp => {
                console.log('Transaction response:', resp);
                setSubscriptionId(resp.subscriptionId); // Update this as per the response structure
            }).catch(err => {
                console.error("Transaction error:", err);
                Alert.alert("Error", "Transaction failed");
            });
        }).catch(err => {
            console.error("Initialization error:", err);
            Alert.alert("Error", "PhonePe SDK initialization failed");
        });
    };

    const setupAutopayHandler = () => {
        if (!validateInputs()) return;

        const requestBody = {
            amount: data.amount * 100, // Amount in paise
            mobile: data.mobile,
            merchantUserId: merchantUserId // Ensure this is included
        };

        axios.post('http://192.168.29.14:3002/subscription/create', requestBody)
            .then(response => {
                const { subscriptionId } = response.data.data;

                if (!subscriptionId) {
                    throw new Error('Subscription ID is missing in the response');
                }

                setSubscriptionId(subscriptionId); // Store the subscription ID

                return axios.post('http://192.168.29.14:3002/auth/submit', {
                    subscriptionId: subscriptionId,
                    authRequestId: generateTransactionId(),
                    amount: data.amount,
                    userId: merchantUserId,
                    targetApp: "com.phonepe.app"
                });
            })
            .then(response => {
                const { redirectUrl } = response.data.data;

                if (redirectUrl) {
                    Linking.openURL(redirectUrl).catch(err => console.error("Failed to open URL:", err));
                } else {
                    throw new Error('Redirect URL is missing');
                }
            })
            .then(() => {
                return axios.get(`http://192.168.29.14:3002/auth/status/${merchantUserId}`);
            })
            .then(response => {
                const { authStatus } = response.data.data;
                setAuthStatus(authStatus);

                if (authStatus === 'SUCCESS') {
                    Alert.alert('Success', 'Autopay setup successful');
                } else {
                    Alert.alert('Failed', 'Autopay setup failed');
                }
            })
            .catch(error => {
                console.error("Setup autopay error:", error);
                Alert.alert("Error", "An error occurred while setting up autopay");
            });
    };

    const cancelSubscriptionHandler = () => {
        if (!subscriptionId) {
            Alert.alert("Error", "No subscription ID available for cancellation");
            return;
        }

        const requestBody = {
            merchantUserId: merchantUserId,
            subscriptionId: subscriptionId,
        };

        axios.post('http://192.168.29.14:3002/subscription/cancel', requestBody)
            .then(response => {
                Alert.alert('Success', 'Subscription canceled successfully');
                setSubscriptionId(""); // Clear the subscription ID after cancellation
            })
            .catch(error => {
                console.error("Cancel subscription error:", error);
                Alert.alert("Error", "An error occurred while canceling the subscription");
            });
    };

    return (
        <View style={Styles.container}>
            <SafeAreaView>
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
                <Button title="Cancel Subscription" onPress={cancelSubscriptionHandler} />
                <Text>{authStatus}</Text>
            </SafeAreaView>
        </View>
    );
};

const Styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
    },
    textField: {
        borderBottomWidth: 1,
        marginBottom: 16,
        padding: 8,
    },
});

export default App;
