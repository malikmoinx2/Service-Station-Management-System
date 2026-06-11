import React, { useContext, useState, useEffect } from 'react';
import {StyleSheet,View,Text,SafeAreaView,TouchableOpacity,ImageBackground,ScrollView,StatusBar,Dimensions,Image} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants"; 
import { useIsFocused } from '@react-navigation/native'; // Refresh logic ke liye

const { width } = Dimensions.get('window');

const Customerhome = ({ navigation }) => {
  const { User } = useContext(UserContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const isFocused = useIsFocused();

  // Server URL logic
  const serverUrl = BASE_URL.replace('/api', '');

  // // Fetch Unread Notifications Count
  // const fetchUnreadCount = async () => {
  //   try {
  //     const response = await fetch(`${BASE_URL}/Customer/my-notifications/${User.id}`);
  //     const result = await response.json();
  //     if (Array.isArray(result)) {
  //       const unread = result.filter(n => n.isRead === false || n.isRead === 0).length;
  //       setUnreadCount(unread);
  //     }
  //   } catch (error) {
  //     console.log("Notification Count Error:", error);
  //   }
  // };

  // useEffect(() => {
  //   if (User?.id && isFocused) {
  //     fetchUnreadCount();
  //   }
  // }, [isFocused]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section Updated */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome Back</Text> 
            <Text style={styles.homeTitle}>{User?.name || 'Customer'}</Text> 
          </View>

          <View style={styles.headerRight}>
            {/* Notification Bell with Badge */}
            {/* <TouchableOpacity 
              style={styles.notifBtn} 
              onPress={() => navigation.navigate('notifications')}
            >
              <Text style={{ fontSize: 26 }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity> */}

            <TouchableOpacity 
              style={styles.profileCircle}
              onPress={() => navigation.navigate('userprofile')} 
            >
              <Image 
                source={{ 
                  uri: !User?.imageUrl 
                    ? 'https://cdn-icons-png.flaticon.com/512/149/149071.png' 
                    : User.imageUrl.startsWith('file://') || User.imageUrl.startsWith('http')
                    ? User.imageUrl 
                    : `${serverUrl}/profile_images/${User.imageUrl}?t=${Date.now()}` 
                }} 
                style={styles.profileImg} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section */}
        <ImageBackground
          source={require("./picturesandicons/3d-car-with-simple-background.jpg")} 
          style={styles.heroCard}
          imageStyle={{ borderRadius: 25 }}
        >
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Premium Services</Text>
            <Text style={styles.heroSubtitle}>Quality you can trust</Text>
          </View>
        </ImageBackground>

        {/* Action Buttons Section */}
        <View style={styles.mainActionContainer}>
          <ActionListItem label="Add Vehicles" icon="🚗" color="#cccfd6" onPress={() => navigation.navigate('ManageVehicle')} />
          <ActionListItem label="Book Now" icon="📅" color="#4169E1" onPress={() => navigation.navigate('Searchbooking')} />
            {/* <ActionListItem label="Book Now 2" icon="📅" color="#4169E1" onPress={() => navigation.navigate('searchbookings')} /> */}
          {/* <ActionListItem label="Book Specific station" icon="📅" color="#4169E1" onPress={() => navigation.navigate('specificstationbooking')} /> */}
          <ActionListItem label="My Booking" icon="📋" color="#FFA500" onPress={() => navigation.navigate('Mybooking')} />
          <ActionListItem label="Marketplace" icon="🏬" color="#32CD32" onPress={() => navigation.navigate('Marketplace')} />
          <ActionListItem label="Cart" icon="🛒" color="#FF4500" onPress={() => navigation.navigate('Viewcart')} />
          <ActionListItem label="My Orders" icon="📦" color="#228B22" onPress={() => navigation.navigate('Orderstatus')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const ActionListItem = ({ label, icon, color, onPress }) => (
  <TouchableOpacity style={styles.bigButton} onPress={onPress}>
    <View style={[styles.iconCircle, { backgroundColor: color }]}>
      <Text style={styles.iconText}>{icon}</Text>
    </View>
    <View style={styles.textContainer}>
        <Text style={styles.btnLabel}>{label}</Text>
        <Text style={styles.arrow}>❯</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'ghostwhite' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 25, 
    backgroundColor: 'white',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifBtn: {
    marginRight: 15,
    position: 'relative',
    padding: 5
  },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'red',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white'
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  welcomeText: { fontSize: 14, color: 'gray' },
  homeTitle: { fontSize: 20, fontWeight: 'bold', color: 'black' },
  profileCircle: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: 'whitesmoke', 
    borderWidth: 2, 
    borderColor: '#50C2C9',
    overflow: 'hidden' 
  },
  profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroCard: { height: 180, margin: 20 },
  heroOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    padding: 25, 
    justifyContent: 'center',
    borderRadius: 25,
  },
  heroTitle: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  heroSubtitle: { color: '#E0E0E0', fontSize: 14, marginTop: 5 },
  mainActionContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  bigButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    marginBottom: 15,
    elevation: 3,
  },
  iconCircle: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  iconText: { fontSize: 22 },
  textContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btnLabel: { fontSize: 17, fontWeight: '700', color: '#333' },
  arrow: { color: '#CCC', fontSize: 18, fontWeight: 'bold' }
});

export default Customerhome;
