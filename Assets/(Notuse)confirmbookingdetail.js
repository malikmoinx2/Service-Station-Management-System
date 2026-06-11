import React, { useContext, useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, SafeAreaView, 
  ScrollView, StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { UserContext } from './UserContext';
import { BASE_URL } from "./Constants";

const Confirmbookingdetail = ({ navigation }) => {
  const { bookingData, setBookingData, User } = useContext(UserContext);
  const [loading, setLoading] = useState(false);

  // --- Calculation Logic ---
  const servicesTotal = bookingData.totalAmount || 0; // Yeh services ki base price hai
  const oilPrice = bookingData.oilPrice || 0;
  const filterPrice = bookingData.filterPrice || 0;
  const grandTotal = servicesTotal + oilPrice + filterPrice;

  const handleConfirmBooking = async () => {
    try {
      setLoading(true);

      const payload = {
        CustomerId: User?.id, 
        StationId: bookingData.stationId,
        BayId: bookingData.availableBayId,
        BookingDate: bookingData.date,
        StartTime: bookingData.startTime,
        EndTime: bookingData.endTime,
        TotalAmount: grandTotal, 
        CarNumber: bookingData.carNumber,
        CarModel: bookingData.carModel,

        // Product IDs for database
        OilId: bookingData.selectedOilId,
        FilterId: bookingData.selectedFilterId,

        SelectedServices: bookingData.selectedServicesList.map(service => ({
          ServiceId: service.serviceId,
          Price: service.price,
          Duration: service.duration
        }))
      };

      const response = await fetch(`${BASE_URL}/Customer/confirm-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        Alert.alert("Success 🎉", "Your booking has been confirmed!");
        
        setBookingData({
          serviceIds: [],
          serviceNames: [],
          selectedServicesList: [],
          date: null,
          startTime: null,
          endTime: null,
          totalAmount: 0,
          carModel: '',
          carNumber: '',
          selectedOilId: null,
          selectedFilterId: null,
          oilName: '',
          filterName: '',
          oilPrice: 0,
          filterPrice: 0
        });

        navigation.replace('Customerhome'); 
      } else {
        Alert.alert("Error", result.message || "Failed to confirm booking");
      }
    } catch (error) {
      Alert.alert("Error", "Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 1. Vehicle Info */}
        <Text style={styles.sectionTitle}>Vehicle Details :</Text>
        <View style={styles.infoCard}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Car:</Text>
            <Text style={styles.value}>{bookingData.carModel} ({bookingData.carNumber})</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Schedule:</Text>
            <Text style={styles.value}>{bookingData.date} | {bookingData.startTime}</Text>
          </View>
        </View>

        {/* 2. Services Breakdown */}
        <Text style={styles.sectionTitle}>Selected Services :</Text>
        <View style={styles.infoCard}>
          {bookingData.selectedServicesList.map((service, index) => (
            <View key={index} style={styles.detailRow}>
              <Text style={styles.value}>{service.serviceName}</Text>
              <Text style={styles.priceValue}>RS {service.price}</Text>
            </View>
          ))}
        </View>

        {/* 3. Products Breakdown (Only show if Oil Service is selected) */}
        {bookingData.oilName !== 'N/A' && bookingData.oilName !== '' && (
          <>
            <Text style={styles.sectionTitle}>Selected Products :</Text>
            <View style={styles.infoCard}>
              <View style={styles.detailRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.value}>{bookingData.oilName}</Text>
                  <Text style={styles.subLabel}>Engine Oil</Text>
                </View>
                <Text style={styles.priceValue}>RS {oilPrice}</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.value}>{bookingData.filterName}</Text>
                  <Text style={styles.subLabel}>Oil Filter</Text>
                </View>
                <Text style={styles.priceValue}>RS {filterPrice}</Text>
              </View>
            </View>
          </>
        )}

        {/* 4. Total Calculation */}
        <View style={[styles.infoCard, { backgroundColor: '#f9f9f9' }]}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Services Subtotal:</Text>
            <Text style={styles.value}>RS {servicesTotal}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Products Subtotal:</Text>
            <Text style={styles.value}>RS {oilPrice + filterPrice}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>RS {grandTotal}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.confirmButton, loading && { backgroundColor: '#555' }]} 
            onPress={handleConfirmBooking}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmButtonText}>Confirm Now</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'ghostwhite' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', alignItems: 'center', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { fontSize: 22, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 8, marginTop: 10, textTransform: 'uppercase' },
  infoCard: { backgroundColor: 'white', borderRadius: 15, padding: 18, elevation: 3, marginBottom: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 14, color: 'gray' },
  subLabel: { fontSize: 11, color: 'royalblue', fontWeight: '600' },
  value: { fontSize: 14, color: 'black', fontWeight: '700' },
  priceValue: { fontSize: 14, color: 'black', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: 'royalblue' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  backButton: { width: '45%', padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#eee' },
  confirmButton: { backgroundColor: 'black', width: '45%', padding: 16, borderRadius: 12, alignItems: 'center' },
  backButtonText: { color: 'black', fontWeight: 'bold' },
  confirmButtonText: { color: 'white', fontWeight: 'bold' }
});

export default Confirmbookingdetail;