import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { BASE_URL } from "./Constants";

const forgetpassword = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [userOtp, setUserOtp] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  
  const sendOtp = async () => {
    if (!email) return Alert.alert("Error", "Enter email.");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/Users/forgetpassword?email=${email}`, 
      { method: 'POST' });
      const json = await res.json();
      console.log(email+res)
      if (json.status === "success") {
        setServerOtp(json.otp.toString());
        setStep(2);
      } else {
        Alert.alert("Error", json.message);
      }
    } catch (e) { Alert.alert("Error", "Server error"); }
    finally { setLoading(false); }
  };

  // Step 2: Verify OTP
  const verifyOtp = () => {
    if (userOtp === serverOtp) setStep(3);
    else Alert.alert("Error", "Invalid 6-digit code.");
  };

  // Step 3: Update Password
  const updatePassword = async () => {
    if (newPassword.length < 2) return Alert.alert("Error", "Min 2 characters required.");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/Users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: email, Password: newPassword })
      });
      const json = await res.json();
      if (json.status === "success") {
        Alert.alert("Success", "Password updated!", [{ text: "Login", onPress: () => navigation.navigate("Login") }]);
      }
    } catch (e) { Alert.alert("Error", "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{step === 1 ? "Forgot Password" : step === 2 ? "Verify OTP" : "Reset Password"}</Text>

        {step === 1 && (
          <>
            <TextInput style={styles.input} placeholder="Enter Email" placeholderTextColor="black" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TouchableOpacity style={styles.btn} onPress={sendOtp}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Send Reset Code</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <TextInput style={styles.input} placeholder="2-Digit Code" placeholderTextColor="black"  value={userOtp} onChangeText={setUserOtp} keyboardType="numeric"  />
            <TouchableOpacity style={styles.btn} onPress={verifyOtp}><Text style={styles.btnText}>Verify Code</Text></TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <TextInput style={styles.input} placeholder="New Password" placeholderTextColor="black" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <TouchableOpacity style={styles.btn} onPress={updatePassword}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Update Password</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: 'white', padding: 25, borderRadius: 15, elevation: 5 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#F1F3F6', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  btn: { backgroundColor: 'royalblue', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' }
});

export default forgetpassword;