import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, 
  StatusBar, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { UserContext } from './UserContext';
import { BASE_URL } from "./Constants";

const { width } = Dimensions.get('window');

const Availableservices = ({ navigation, route }) => {
  const { bookingData, setBookingData } = useContext(UserContext);
  
  const stationId = route?.params?.stationId || bookingData?.stationId;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    if (stationId) {
      fetchStationServices();
    } else {
      Alert.alert("Error", "Station ID not found!");
      setLoading(false);
    }
  }, [stationId]);

  const fetchStationServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/Station/getservicesbystation/${stationId}`);
      const result = await response.json();

      if (result.status === "success" && result.data) {
        setServices(result.data);
        // IDs, Names, Prices, aur Durations context mein update karne ka function
        updateContextWithServiceDetails(result.data);
      } else {
        setServices([]);
        console.log(result.message);
      }
    } catch (error) {
      console.error("API Error:", error);
      Alert.alert("Error", "Failed to load services from server.");
    } finally {
      setLoading(false);
    }
  };

  const updateContextWithServiceDetails = (allServicesFromApi) => {
    let total = 0;
    let matchedIds = [];
    let detailedServices = []; // Individual service data store karne ke liye

    // Sirf wo services filter karna jo user ne pehle select ki thin
    const selectedFromBooking = allServicesFromApi.filter(service => 
      bookingData.serviceNames.includes(service.serviceName || service.ServiceName)
    );

    selectedFromBooking.forEach(s => {
      // ✅ VIP check: True hai to VIP price, warna Normal price
      const currentPrice = bookingData.isVip ? (s.vipPrice || s.VipPrice) : (s.normalPrice || s.NormalPrice);
      const currentDuration = s.duration || s.Duration;
      const currentId = s.serviceId || s.ServiceId;
      const currentName = s.serviceName || s.ServiceName;

      total += parseFloat(currentPrice || 0);
      matchedIds.push(currentId);

      // ✅ Har service ka pura detail object bana rahe hain
      detailedServices.push({
        serviceId: currentId,
        serviceName: currentName,
        price: parseFloat(currentPrice),
        duration: currentDuration
      });
    });

    setTotalPrice(total);

    // ✅ Final Booking Data ko Context mein update karna saari details ke sath
    setBookingData(prev => ({
      ...prev,
      serviceIds: matchedIds,
      totalAmount: total,
      // ✅ Yeh naya field hai jisme individual price aur duration hai
      selectedServicesList: detailedServices 
    }));

    console.log("--- UPDATED BOOKING DATA IN CONTEXT ---");
    console.log("Matched IDs:", matchedIds);
    console.log("Detailed List:", JSON.stringify(detailedServices, null, 2));
  };

  const renderServiceItem = ({ item }) => {
    const sName = item.serviceName || item.ServiceName;
    const isPreSelected = bookingData.serviceNames.includes(sName);
    const displayPrice = bookingData.isVip ? (item.vipPrice || item.VipPrice) : (item.normalPrice || item.NormalPrice);

    return (
      <View style={[styles.serviceCard, isPreSelected && styles.selectedCard]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.serviceTitle, isPreSelected && styles.whiteText]}>{sName}</Text>
          <Text style={[styles.duration, isPreSelected && styles.whiteText]}>
            ⏱ {item.duration || item.Duration} min
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View>
            <Text style={[styles.priceLabel, isPreSelected && styles.whiteText]}>
              {bookingData.isVip ? "VIP Rate" : "Normal Rate"}
            </Text>
            <Text style={[styles.priceValue, isPreSelected && styles.whiteText]}>
              RS {displayPrice}
            </Text>
          </View>
          
          {isPreSelected && (
            <View style={styles.checkboxActive}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
          )}
        </View>

        {!isPreSelected && (
          <View style={styles.overlayLocked}>
             <Text style={styles.lockedText}>LOCKED</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="royalblue" />
        <Text style={{marginTop: 10, color: 'gray'}}>Syncing Station Services...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        
        <Text style={styles.headerTitle}>Final Service Review</Text>
        <View style={{width: 40}} />
      </View>

      <FlatList
        data={services}
        keyExtractor={(item, index) => (item.serviceId || index).toString()}
        renderItem={renderServiceItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Account Status:</Text>
            <Text style={styles.infoValue}>
              {bookingData.isVip ? "🌟 VIP MEMBERSHIP APPLIED" : "STANDARD BOOKING"}
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>RS {totalPrice}</Text>
        </View>
        <TouchableOpacity 
          style={styles.confirmBtn} 
          onPress={() => navigation.navigate('Addbookingdetail')}
        >
          <Text style={styles.confirmBtnText}>PROCEED TO DETAILS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: 'white', elevation: 3 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center',marginLeft:80 },
  infoBox: { padding: 15, backgroundColor: '#E3F2FD', margin: 15, borderRadius: 12, borderLeftWidth: 5, borderLeftColor: 'royalblue' },
  infoLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: 'bold', color: 'royalblue', marginTop: 2 },
  listContent: { paddingHorizontal: 15, paddingBottom: 160 },
  serviceCard: { backgroundColor: 'white', borderRadius: 15, padding: 18, marginBottom: 12, elevation: 1, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  selectedCard: { backgroundColor: 'royalblue', borderColor: 'royalblue' },
  whiteText: { color: 'white' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  serviceTitle: { fontSize: 16, fontWeight: 'bold' },
  duration: { fontSize: 12, color: 'crimson', fontWeight: 'bold' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 12, color: 'gray' },
  priceValue: { fontSize: 17, fontWeight: 'bold' },
  checkboxActive: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  checkIcon: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  overlayLocked: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  lockedText: { fontSize: 10, color: '#999', fontWeight: 'bold', letterSpacing: 1 },
  footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 25 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  totalLabel: { fontSize: 16, color: '#666' },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: 'black' },
  confirmBtn: { backgroundColor: 'black', padding: 18, borderRadius: 15, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 }
});

export default Availableservices;