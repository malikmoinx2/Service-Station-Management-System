import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Alert, Dimensions, SafeAreaView } from 'react-native';
import { TextInput } from 'react-native-paper';
import { BASE_URL } from "./Constants"

const { width } = Dimensions.get('window');

export default function Signup({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('Customer'); 

 const onSignup = async () => {
  if (!name || !email || !password || !contact) {
    Alert.alert("Error", "Kindly Fill All Fields Properly!");
    return;
  }

  const dataitem = {
    Name: name,
    Email: email,
    Password: password,
    Contact: contact,
    Role: role || "User",
    ImageUrl: ""
  };

  try {
     const url= `${BASE_URL}/Users/signup`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataitem),
    });

    const result = await response.json();
   console.log(result)
    if (result.status === "success") {
      Alert.alert("Success", result.message);
      navigation.replace('Login');
    } else {
      Alert.alert("Signup Error", result.message);
    }
  } catch (error) {
    console.log("Detailed Error:", error);
    Alert.alert("Connection Error", "Server error Please check connection");
  }
};
  

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerArea}>
          <Image
            source={require("./picturesandicons/register.png")}
            style={styles.logo}
          />
          <Text style={styles.mainTitle}>Create Account</Text>
          <Text style={styles.subTitle}>Sign up to get started</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          
          <Text style={styles.roleTitle}>Join As</Text>
          <View style={styles.roleWrapper}>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[
                styles.roleBox, 
                { borderColor: role === 'Customer' ? 'deepskyblue' : 'lightgray' }
              ]} 
              onPress={() => setRole('Customer')}
            >
              <Text style={styles.roleIcon}>👤</Text>
              <Text style={[styles.roleLabel, { color: role === 'Customer' ? 'deepskyblue' : 'gray' }]}>Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              style={[
                styles.roleBox, 
                { borderColor: role === 'StationOwner' ? 'orange' : 'lightgray' }
              ]} 
              onPress={() => setRole('StationOwner')}
            >
              <Text style={styles.roleIcon}>⛽</Text>
              <Text style={[styles.roleLabel, { color: role === 'StationOwner' ? 'orange' : 'gray' }]}>Owner</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity 
              activeOpacity={0.7}
              style={[
                styles.roleBox, 
                { borderColor: role === 'Admin' ? 'green' : 'lightgray' }
              ]} 
              onPress={() => setRole('Admin')}
            >
              <Text style={styles.roleIcon}>👑</Text>
              <Text style={[styles.roleLabel, { color: role === 'Admin' ? 'green' : 'gray' }]}>Admin</Text>
            </TouchableOpacity> */}
          </View>

          <TextInput
            label="Name"
            mode="outlined"
            value={name}
            onChangeText={setName}
            style={styles.input}
            outlineColor="lightgray"
            activeOutlineColor="deepskyblue"
            theme={{ roundness: 12 }}
          />

          <TextInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            outlineColor="lightgray"
            activeOutlineColor="deepskyblue"
            theme={{ roundness: 12 }}
          />

          <TextInput
            label="Contact"
            mode="outlined"
            value={contact}
            onChangeText={setContact}
            keyboardType='numeric'
            style={styles.input}
            outlineColor="lightgray"
            activeOutlineColor="deepskyblue"
            theme={{ roundness: 12 }}
          />

          <TextInput
            label="Password"
            mode="outlined"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            outlineColor="lightgray"
            activeOutlineColor="deepskyblue"
            theme={{ roundness: 12 }}
          />

          <TextInput
            label="Confirm Password"
            mode="outlined"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            style={styles.input}
            outlineColor="lightgray"
            activeOutlineColor="deepskyblue"
            theme={{ roundness: 12 }}
          />

          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={onSignup} 
            style={styles.signupBtn}
          >
            <Text style={styles.signupBtnText}>SIGN UP</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('directionmap')} style={styles.loginLink}>
            <Text style={{ color: 'gray' }}>
              Already have an account? <Text style={{ color: 'deepskyblue', fontWeight: 'bold' }}>Login</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: 'white',
  },
  headerArea: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
  },
  logo: {
    width: 140,
    height: 100,
    resizeMode: 'contain',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 10,
  },
  subTitle: {
    fontSize: 14,
    color: 'gray',
  },
  formContainer: {
    paddingHorizontal: 25,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'gray',
    marginBottom: 10,
  },
  roleWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roleBox: {
    flex: 0.31,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'white',
  },
  roleIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  roleLabel: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  signupBtn: {
    backgroundColor: 'deepskyblue',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  signupBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginLink: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center'
  }
});