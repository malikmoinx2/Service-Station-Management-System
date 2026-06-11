import React, { useEffect,useContext } from "react";
import { View, Image, StyleSheet, Alert } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { UserContext } from "./UserContext";
const Splash = ({ navigation }) => {
  const { setUser,User,setcartid } = useContext(UserContext);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkLoginStatus();
    }, 2500);

    return () => clearTimeout(timer); 
  }, [navigation]);

  const checkLoginStatus = async () => {
  try {
    const userString = await AsyncStorage.getItem('user'); 

    if (userString !== null) {
      const userData = JSON.parse(userString); 
      setUser(userData);
      if (userData.role === 'Customer') {
       const id = await AsyncStorage.getItem('cartId');
        setcartid(id);
        console.log("cartid"+id)
        navigation.replace('Customerhome'); 
      } else if (userData.role === "StationOwner") {
        navigation.replace('Dashboard'); 
        
      } else if (userData.role === "Admin") {
        navigation.replace('AdminDashboard'); 
      }
      
      else {
        
        navigation.replace('Login');
        Alert.alert("Error", "Invalid Role Found");
      }

    } else {
      navigation.replace('Login');
      // Alert.alert("Welcome", "Please Login to continue"); // Ye zyada behtar message hai
    }
  } catch (e) {
    Alert.alert("Error reading storage", e.message);
    navigation.replace('Login');
  }
}
  return (
    <View style={styles.mainContainer}> 

      <View style={styles.imageView}>
        <Image
          source={require("./picturesandicons/pngwing 1 1.png")} 
          style={styles.image}
        />
        <Image
          source={require("./picturesandicons/pngwing 1 2.png")} 
          style={styles.image2}
        />
      </View>
      
      <View style={styles.titleRow}> 
        <Text style={styles.titleBlue}>Service</Text>
        <Text style={styles.titleBlack}>A Car</Text>
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionText}>
          Keep your car shining inside and out with smart effortless care. Experience a faster, easier, and smarter way to service your vehicle.
        </Text>
      </View>

      {/* Loading indicator taaki user ko lage processing ho rahi hai */}
      <ActivityIndicator size="small" color="#50C2C9" style={{ marginTop: 30 }} />

    </View>
  );
}

export default Splash;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center', // Isse content center mein rahega
  },
  imageView: {
    alignItems: "center",
    width: "100%", // Poori width taaki images center hon
    height: "30%",
    flexDirection: "row",
    justifyContent: 'center'
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginRight: 10
  },
  image2: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginLeft: 10
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: 'center', // Text center karne ke liye
    marginTop: 20
  },
  titleBlue: {
    color: '#50C2C9',
    fontSize: 35,
    fontWeight: "bold"
  },
  titleBlack: {
    fontSize: 35,
    fontWeight: "bold",
    marginLeft: 10
  },
  descriptionContainer: {
    width: "85%",
    alignSelf: "center",
    marginTop: 20
  },
  descriptionText: {
    fontSize: 15,
    fontStyle: "italic",
    textAlign: "center",
    color: 'gray'
  }
});