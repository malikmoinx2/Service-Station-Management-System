import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, Dimensions, SafeAreaView } from 'react-native';
import { TextInput } from 'react-native-paper'; // React Native Paper for modern inputs
import { UserContext } from "./UserContext";
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { BASE_URL } from "./Constants"

const { width } = Dimensions.get('window');

export default function Login({ navigation }) {
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Eye button state
  const { setUser, setcartid } = useContext(UserContext);

  const handlelogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Fields cannot be empty!");
      return;
    }
    const dataitem = { Email: email, Password: password };
    try {
      const url = `${BASE_URL}/Users/login`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataitem),
      });
      const result = await response.json();

      if (result.status === "success") {
        const userData = result.data;
        const userRole = result.data.role;
        
        const userToSave = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          contact: userData.contact,
          imageUrl: userData.imageUrl
        };

        // Context aur Storage mein user save karein
        setUser(userToSave);
        await AsyncStorage.setItem('user', JSON.stringify(userToSave));

        Alert.alert('Success', `Welcome ${result.data.name}!`);

        if (userRole === "Customer") {
          await createCart(userData.id); 
          navigation.replace('Customerhome');
        } else if (userRole === "StationOwner") {
          navigation.replace('Dashboard');
        }
          else if(userRole==="Admin"){
          navigation.replace('AdminDashboard');
          }
         else {
          Alert.alert("Role Error", "User role not recognized.");
        }
      } else {
        Alert.alert("Login Failed", result.message || "Invalid Email or Password");
      }
    } catch (error) {
      console.log("Login Error:", error);
      Alert.alert("Error", "Server connection failed");
    }
  };

  const createCart = async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/Customer/createcart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: userId })
      });
      const result = await response.json();
      if (result.status === "success") {
        const cartIdString = result.cartId.toString();
        setcartid(result.cartId);
        await AsyncStorage.setItem('cartId', cartIdString);
        console.log("Cart ID saved to storage:", cartIdString);
      }
    } catch (error) {
      console.log("Create Cart Error:", error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={styles.scrollContainer}>
        
        {/* Header Area */}
        <View style={styles.headerArea}>
          <Image
            source={require("./picturesandicons/login.png")}
            style={styles.logo}
          />
          <Text style={styles.mainTitle}>Welcome Back</Text>
          <Text style={styles.subTitle}>Login to your account</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Email Input */}
          <TextInput
            label="Email Address"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.input}
            outlineColor="lightgray"
            activeOutlineColor="deepskyblue"
            theme={{ roundness: 12 }}
          />

          {/* Password Input with Eye Icon */}
          <TextInput
            label="Password"
            mode="outlined"
            secureTextEntry={!showPassword} // Toggle secure entry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            outlineColor="lightgray"
            activeOutlineColor="deepskyblue"
            theme={{ roundness: 12 }}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"} 
                onPress={() => setShowPassword(!showPassword)} 
                color="gray"
              />
            }
          />

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forget} onPress={() => navigation.navigate("forgetpassword")}>
            <Text style={styles.forgetText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={handlelogin} 
            style={styles.loginBtn}
          >
            <Text style={styles.loginBtnText}>LOGIN</Text>
          </TouchableOpacity>

          {/* Signup Link */}
          <View style={styles.registerRow}>
            <Text style={{ color: 'gray' }}>Do not have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.registerLink}>Signup</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerArea: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    backgroundColor: 'white',
  },
  logo: {
    width: 150,
    height: 120,
    resizeMode: 'contain',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 15,
  },
  subTitle: {
    fontSize: 14,
    color: 'gray',
    marginTop: 5,
  },
  formContainer: {
    paddingHorizontal: 30,
    marginTop: 20,
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
  },
  forget: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgetText: {
    color: 'deepskyblue',
    fontWeight: '600',
    fontSize: 13,
  },
  loginBtn: {
    backgroundColor: 'deepskyblue',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  loginBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  registerLink: {
    color: 'deepskyblue',
    fontWeight: 'bold',
  }
});