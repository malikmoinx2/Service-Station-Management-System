
import React, { useState, useContext, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Image 
} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";
import { useIsFocused } from '@react-navigation/native'; // Refresh count ke liye

export default function App({ navigation }) {
  const { User } = useContext(UserContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const isFocused = useIsFocused(); // Jab bhi screen pe wapas ayein ye trigger hoga

  // Server URL logic for image path
  const serverUrl = BASE_URL.replace('/api', '');

  // Fetch Notification Count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${BASE_URL}/Customer/my-notifications/${User.id}`);
      const result = await response.json();
      
      // Filter unread notifications (IsRead == 0 ya false)
      if (Array.isArray(result)) {
        const unread = result.filter(n => n.isRead === false || n.isRead === 0).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.log("Count Fetch Error:", error);
    }
  };

  useEffect(() => {
    if (User?.id && isFocused) {
      fetchUnreadCount();
    }
  }, [isFocused]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        
        {/* Header Area Updated */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.welcome}>Welcome Back,</Text>
            <Text style={styles.user}>{User?.name || 'User'}</Text>
          </View>
          
          <View style={styles.headerRight}>
            {/* Notification Icon with Badge */}
            <TouchableOpacity 
              style={styles.notifBtn} 
              onPress={() => navigation.navigate('notification')}
            >
              <Text style={{ fontSize: 26 }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

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
        
        <Text style={styles.instruction}>Click on any box to View, Update or Delete</Text>
       
        {/* Grid Container for Boxes */}
        <View style={styles.gridContainer}>
          <TouchableOpacity style={[styles.box, { backgroundColor: 'teal' }]} onPress={() => navigation.navigate('Mystations')}>
            <View style={styles.circle}><Text style={{fontSize: 25}}>🚕</Text></View>
            <Text style={styles.label}>Stations</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.box, { backgroundColor: 'olive' }]} onPress={() => navigation.navigate('Myservices')}>
            <View style={styles.circle}><Text style={{fontSize: 25}}>⚙️</Text></View>
            <Text style={styles.label}>Services</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.box, { backgroundColor: 'limegreen' }]} onPress={()=>navigation.navigate('Mybays')}>
            <View style={styles.circle} ><Text style={{fontSize: 25}}>🅿️</Text></View>
            <Text style={styles.label}>Bays</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.box, { backgroundColor: 'deeppink' }]} onPress={() => navigation.navigate('Myproducts')}>
            <View style={styles.circle}><Text style={{fontSize: 25}}>📦</Text></View>
            <Text style={styles.label}>Products</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.box, { backgroundColor: '#6B8E23' }]} onPress={() => navigation.navigate('myoilandfilter')}>
            <View style={styles.circle}><Text style={{fontSize: 25}}>🔧</Text></View>
            <Text style={styles.label}>Service Item</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.box, { backgroundColor: '#4682B4' }]} onPress={() => navigation.navigate('feedbacks')}>
            <View style={styles.circle}><Text style={{fontSize: 25}}>🟰</Text></View>
            <Text style={styles.label}>Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.box, { backgroundColor: '#4682B4' }]} onPress={() => navigation.navigate('offers')}>
            <View style={styles.circle}><Text style={{fontSize: 25}}>📴</Text></View>
            <Text style={styles.label}>My Offers</Text>
          </TouchableOpacity>
           <TouchableOpacity style={[styles.box, { backgroundColor: '#4682B4' }]} onPress={() => navigation.navigate('history')}>
            <View style={styles.circle}><Text style={{fontSize: 25}}>📴</Text></View>
            <Text style={styles.label}>StationAnalytics</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Quick Actions</Text>

        <ActionCard title="Add Station" sub="Register a new service station" color="limegreen" onPress={() => navigation.navigate('Addstation')} />
        <ActionCard title="Add Service" sub="Register a new service offering" color="deeppink" onPress={() => navigation.navigate('Addservices')} />
        <ActionCard title="Add Service Bay" sub="Register a new Service Bay" color="darkgreen" onPress={() => navigation.navigate('Addbays')} />
        <ActionCard title="Add Product" sub="Add New products to marketplace" color="orange" onPress={() => navigation.navigate('Addproducts')} />
        <ActionCard title="Add Oil And Filter" sub="Add Oil and Filter for Service" color="#FF8C00" onPress={() => navigation.navigate('Addoilandfilter')} />
        <ActionCard title="Manage Orders" sub="View and process your orders" color="#FFA500" onPress={() => navigation.navigate('Manageorder')} />
        <ActionCard title="Manage Bookings" sub="View and Manage booking" color="teal" onPress={() => navigation.navigate('ManageBooking')} isLast />

      </ScrollView>
    </SafeAreaView>
  );
}

const ActionCard = ({ title, sub, color, onPress, isLast }) => (
  <TouchableOpacity style={[styles.card, isLast && { marginBottom: 30 }]} onPress={onPress}>
    <View style={[styles.cardIcon, { backgroundColor: color }]} />
    <View style={{ flex: 1 }}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{sub}</Text>
    </View>
    <Text style={styles.plus}>+</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20 },
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
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
  welcome: { fontSize: 16, color: 'gray' },
  user: { fontSize: 22, fontWeight: 'bold', color: 'black' },
  instruction: { fontSize: 13, color: '#888', marginBottom: 15 },
  profileCircle: { 
    width: 55, 
    height: 55, 
    borderRadius: 27.5, 
    backgroundColor: '#f0f0f0', 
    borderWidth: 2,
    borderColor: '#50C2C9',
    overflow: 'hidden'
  },
  profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  box: { 
    width: '48%', 
    height: 120, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 15, 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5
  },
  circle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  label: { fontSize: 16, color: 'white', fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', marginVertical: 15, color: 'black' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 12, elevation: 4 },
  cardIcon: { width: 40, height: 40, borderRadius: 50, marginRight: 15 },
  cardTitle: { fontWeight: 'bold', fontSize: 16, color: 'black' },
  cardSub: { fontSize: 12, color: 'gray' },
  plus: { fontSize: 24, color: '#ccc' }
});
