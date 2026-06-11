import React, { useState, useContext } from "react";
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { TextInput } from 'react-native-paper'; // Paper use kiya eye icon ke liye
import { BASE_URL } from "./Constants"
import { UserContext } from "./UserContext";

const Changepassword = () => {
  const { User } = useContext(UserContext);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // Eye icon toggle states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const verifyCurrentPassword = async () => {
    if (!currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }
    setLoading(true);
    const valid = await checkcurrentpassword(User?.id, currentPassword);
    setLoading(false);
    if (valid.status === "success") {
      setIsVerified(true);
      Alert.alert("Success", "Current password verified!");
    } else {
      setIsVerified(false);
      Alert.alert("Error", "Incorrect current password!");
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New password and confirm password do not match");
      return;
    }
    const res = await updatePasswordApi(User?.id, newPassword);
    if (res.status === "success") {
      Alert.alert("Success", "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsVerified(false);
    } else {
      Alert.alert("Error", "Failed to update password");
    }
  };

  const checkcurrentpassword = async (Userid, Userpassword) => {
    try {
      const url = `${BASE_URL}/Users/verifycurrentpassword`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Userid, password: Userpassword }),
      });
      return await response.json();
    } catch (error) {
      return { status: "error", message: "Network issue." };
    }
  }

  const updatePasswordApi = async (Userid, Userpassword) => {
    try {
      const url = `${BASE_URL}/Users/changepassword`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Userid, password: Userpassword }),
      });
      return await response.json();
    } catch (error) {
      return { status: "error", message: "Network issue" };
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Change Password</Text>

        {/* Current Password Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            mode="outlined"
            placeholder="Enter current password"
            secureTextEntry={!showCurrent}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            editable={!isVerified}
            style={[styles.input, isVerified && styles.disabledInput]}
            outlineColor="#ddd"
            activeOutlineColor="#50C2C9"
            theme={{ roundness: 10 }}
            right={
              <TextInput.Icon 
                icon={showCurrent ? "eye-off" : "eye"} 
                onPress={() => setShowCurrent(!showCurrent)} 
                color={isVerified ? "gray" : "#555"}
              />
            }
          />
          {!isVerified && (
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={verifyCurrentPassword}
              disabled={loading}
            >
              <Text style={styles.verifyBtnText}>
                {loading ? "Verifying..." : "Verify Current Password"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* New Password Section */}
        <View style={{ marginTop: 10, opacity: isVerified ? 1 : 0.5 }}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            mode="outlined"
            placeholder="Enter new password"
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
            editable={isVerified}
            style={[styles.input, !isVerified && styles.disabledInput]}
            outlineColor="#ddd"
            activeOutlineColor="#50C2C9"
            theme={{ roundness: 10 }}
            right={
              <TextInput.Icon 
                icon={showNew ? "eye-off" : "eye"} 
                onPress={() => isVerified && setShowNew(!showNew)} 
              />
            }
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            mode="outlined"
            placeholder="Confirm new password"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={isVerified}
            style={[styles.input, !isVerified && styles.disabledInput]}
            outlineColor="#ddd"
            activeOutlineColor="#50C2C9"
            theme={{ roundness: 10 }}
            right={
              <TextInput.Icon 
                icon={showConfirm ? "eye-off" : "eye"} 
                onPress={() => isVerified && setShowConfirm(!showConfirm)} 
              />
            }
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: isVerified ? "#50C2C9" : "#ccc" }]}
            disabled={!isVerified}
            onPress={handleSavePassword}
          >
            <Text style={styles.saveBtnText}>Save Password</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  inner: { padding: 20 },
  section: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 30, textAlign: "center", color: "#333" },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#555" },
  input: {
    backgroundColor: "white",
    marginBottom: 10,
    height: 55,
  },
  disabledInput: {
    backgroundColor: "#ececec",
  },
  verifyBtn: {
    backgroundColor: "#50C2C9",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },
  verifyBtnText: { color: "white", fontWeight: "bold" },
  saveBtn: {
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  saveBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

export default Changepassword;