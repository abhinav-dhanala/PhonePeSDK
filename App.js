import React, { useState } from 'react';
import { View, Text, TextInput, Button, SafeAreaView, StyleSheet } from 'react-native';
import { AppRegistry } from 'react-native';
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

    const generateTransactionId = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 100000);
        const merchantPrefix = "T";
        return `${merchantPrefix}${timestamp}${random}`; // Fixed missing semicolon and template literal syntax
    };

    const SubmitHandler = () => {
        phonepeSDK.init(environment, merchantId, appID, enableLogging).then(res => {
            const requestBody = {
                merchantId: merchantId,
                merchantTransactionId: generateTransactionId(),
                merchantUserId: "",
                amount: data.amount * 100,
                mobileNumber: data.mobile,
                callbackUrl: "",
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
                console.log(resp);
            }).catch(err => {
                console.log(err);
            });
        }).catch(err => {
            console.log(err);
        });
    };

    return (
        <View>
            <SafeAreaView>
                <View style={Styles.container}>
                    <TextInput
                        placeholder='Enter Mobile Number'
                        onChangeText={(txt) => setData({ ...data, mobile: txt })}
                        style={Styles.textField}
                    />
                    <TextInput
                        placeholder='Enter Amount'
                        onChangeText={(txt) => setData({ ...data, amount: txt })}
                        style={Styles.textField}
                    />
                    <Button title="Pay" onPress={SubmitHandler} />
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
        width: "90%"
    }
});

AppRegistry.registerComponent('phonpefin', () => App);

export default App;
