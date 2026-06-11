import React, { useState, useEffect, useContext } from 'react';
import {StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity,Modal, ScrollView, SafeAreaView, StatusBar, Image, ActivityIndicator, Alert
} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SpecficStationBooking({ navigation }) {
  const [search, setSearch] = useState('');
  const { bookingSummary, setBookingSummary, setBookingData, User } = useContext(UserContext);

  const [modalType, setModalType] = useState(null); 
  const [loading, setLoading] = useState(false);
  
  const [stations, setStations] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [targetStation, setTargetStation] = useState(null);
  const [userVehicles, setUserVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const serverUrl = BASE_URL.replace('/api', '');

  useEffect(() => { 
    fetchStations(); 
    fetchUserVehicles();
  }, []);

  const fetchUserVehicles = async () => {
    try {
      const res = await fetch(`${BASE_URL}/Customer/GetVehiclesByUserId/${User?.id}`);
      const json = await res.json();
      if (json.status === 'success') {
        setUserVehicles(json.data || []);
      }
    } catch (e) { console.log("Vehicle fetch failed"); }
  };

  //  1. Fetch & Console Stations
  const fetchStations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/Station/getstations`);
      const json = await response.json();
      if (json.data) {
        setStations(json.data);
        console.log("--- 🚉 ALL STATIONS DATA ---");
        console.log(JSON.stringify(json.data, null, 2));
      }
    } catch (error) { console.log("Fetch Error:", error); }
    finally { setLoading(false); }
  };

  //  2. Fetch & Console Services
  const handleServiceModal = async (station) => {
    if (!selectedVehicle) {
      setTargetStation(station);
      setModalType('vehicle');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/Station/getservicesbystation/${station.stationId}`);
      const json = await res.json();
      console.log(`--- 🛠 SERVICES FOR: ${station.stationName} ---`);
      console.log(JSON.stringify(json.data, null, 2));
      
      const carType = (selectedVehicle?.carType || 'small').toLowerCase();
      const isVip = !!bookingSummary?.isVip;

      const processedServices = (json.data || []).map(s => {
        const hasDiscount = !!(s.hasDiscount || s.HasDiscount);
        
        // Casing robust prices from API
        const oNS = s.normalPriceSmall || s.NormalPriceSmall || s.originalNormalSmall || s.OriginalNormalSmall || 0;
        const oNL = s.normalPriceLarge || s.NormalPriceLarge || s.originalNormalLarge || s.OriginalNormalLarge || 0;
        const oVS = s.vipPriceSmall    || s.VipPriceSmall    || s.originalVIPSmall    || s.OriginalVIPSmall    || 0;
        const oVL = s.vipPriceLarge    || s.VipPriceLarge    || s.originalVIPLarge    || s.OriginalVIPLarge    || 0;

        const fNS = s.finalNormalSmall || s.FinalNormalSmall || oNS;
        const fNL = s.finalNormalLarge || s.FinalNormalLarge || oNL;
        const fVS = s.finalVIPSmall    || s.FinalVIPSmall    || oVS;
        const fVL = s.finalVIPLarge    || s.FinalVIPLarge    || oVL;

        let originalPrice = 0;
        let finalPrice = 0;

        if (!isVip && carType === 'small') { originalPrice = oNS; finalPrice = fNS; }
        if (!isVip && carType === 'large') { originalPrice = oNL; finalPrice = fNL; }
        if ( isVip && carType === 'small') { originalPrice = oVS; finalPrice = fVS; }
        if ( isVip && carType === 'large') { originalPrice = oVL; finalPrice = fVL; }

        // Last fallback if everything is 0
        if (finalPrice === 0) finalPrice = originalPrice || s.price || s.Price || 0;

        return {
          ...s,
          serviceId:   s.serviceId || s.ServiceId,
          serviceName: s.serviceName || s.ServiceName,
          duration:    s.duration || s.Duration,
          originalPrice,
          finalPrice,
          hasDiscount,
          discountLabel: s.discountLabel || s.DiscountLabel || '',
          // Store base prices for slot switching
          fNS, fNL, fVS, fVL
        };
      });

      setServicesList(processedServices);
      setBookingSummary(prev => ({ 
        ...prev, 
        station: station,
        carType: selectedVehicle.carType,
        carModel: selectedVehicle.carModel,
        carNumber: selectedVehicle.numberPlate
      }));
      setModalType('service');
    } catch (e) { Alert.alert("Error", "Services fetch failed"); }
    finally { setLoading(false); }
  };

  const selectVehicle = (v) => {
    setSelectedVehicle(v);
    setModalType(null);
    // After vehicle selection, proceed to services for the target station
    if (targetStation) {
      handleServiceModal(targetStation);
    }
  };

  const toggleService = (s) => {
    setBookingSummary(prev => {
      const isSelected = prev.services.some(ser => ser.serviceId === s.serviceId);
      const updated = isSelected 
        ? prev.services.filter(ser => ser.serviceId !== s.serviceId) 
        : [...prev.services, s];

      const duration = updated.reduce((sum, item) => sum + (item.duration || 0), 0);
      const bill = updated.reduce((sum, item) => sum + (item.finalPrice || 0), 0);
      
      return { ...prev, services: updated, totalDuration: duration, totalBill: bill };
    });
  };

  const calculateEndTime = (startTimeStr, durationMins) => {
    let [time, modifier] = startTimeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (hours === 12 && modifier === 'AM') hours = 0;
    if (modifier === 'PM' && hours < 12) hours += 12;
    const date = new Date();
    date.setHours(hours, minutes + durationMins, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleSlotPress = (station) => {
    if (bookingSummary?.services.length === 0) {
      return Alert.alert("Wait", "Please Select Services First!");
    }
    setTargetStation(station);
    setShowDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTempDate(selectedDate);
      fetchSlots(targetStation, selectedDate);
    }
  };

  //  3. Fetch & Console Slots
  const fetchSlots = async (station, date) => {
    setLoading(true);
    const formattedDate = date.toISOString().split('T')[0];
    try {
      const res = await fetch(`${BASE_URL}/Customer/get-single-station-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          StationId: station.stationId,
          BookingDate: formattedDate,
          TotalDuration: bookingSummary?.totalDuration
        })
      });
      const json = await res.json();
      console.log(`--- 📅 SLOTS FOR ${formattedDate} ---`);
      console.log(JSON.stringify(json.data, null, 2));

      setAvailableSlots(json.data || []);
      setBookingSummary(prev => ({ ...prev, station: station, bookingDate: formattedDate }));
      setModalType('slot');
    } catch (e) { Alert.alert("Error", "Slots fetch failed"); }
    finally { setLoading(false); }
  };

  const handleSlotSelection = (slot) => {
    const startTimeStr = slot.display.split(' - ')[0]; 
    const isVipTime = (startTimeStr.startsWith("1:") || startTimeStr.startsWith("01:")) && startTimeStr.includes("PM");
    const calculatedEnd = calculateEndTime(startTimeStr, bookingSummary.totalDuration);

    // ✅ 1 PM VIP Alert
    if (isVipTime) {
     Alert.alert(
  "VIP Slot", 
  "The 1:00 PM slot is a VIP booking. Standard rates do not apply."
);
    }

    setBookingSummary(prev => {
      // Recalculate bill based on VIP status of new slot
      const newSvcList = prev.services.map(s => {
        const carType = (prev.carType || 'small').toLowerCase();
        let finalPrice = s.finalPrice;

        // Extract base prices if they were kept (assuming they are in s)
        const fNS = s.finalNormalSmall || s.FinalNormalSmall || s.fNS || 0;
        const fNL = s.finalNormalLarge || s.FinalNormalLarge || s.fNL || 0;
        const fVS = s.finalVIPSmall    || s.FinalVIPSmall    || s.fVS || 0;
        const fVL = s.finalVIPLarge    || s.FinalVIPLarge    || s.fVL || 0;

        if (!isVipTime && carType === 'small') finalPrice = fNS || s.finalPrice;
        if (!isVipTime && carType === 'large') finalPrice = fNL || s.finalPrice;
        if ( isVipTime && carType === 'small') finalPrice = fVS || s.finalPrice;
        if ( isVipTime && carType === 'large') finalPrice = fVL || s.finalPrice;

        return { ...s, finalPrice };
      });

      const newBill = newSvcList.reduce((sum, item) => sum + item.finalPrice, 0);

      return {
        ...prev,
        services: newSvcList,
        slot: slot,
        startTime: startTimeStr,
        endTime: calculatedEnd,
        isVip: isVipTime,
        totalBill: newBill
      };
    });
    setModalType(null);
  };

  // ✅ 4. Final Booking Console
  const handleFinalBooking = () => {
    if (!bookingSummary?.slot) return Alert.alert("Incomplete", "Please select services and slot.");
    
    // Construct final booking data object
    const finalBookingData = {
      ...bookingSummary,
      stationId:            bookingSummary.station?.stationId,
      stationName:          bookingSummary.station?.stationName,
      availableBayId:       bookingSummary.slot?.bayId,
      serviceIds:           bookingSummary.services.map(s => s.serviceId),
      serviceNames:         bookingSummary.services.map(s => s.serviceName),
      totalAmount:          bookingSummary.totalBill,
      // Map finalPrice to price so addbookingdetail can show it
      selectedServicesList: bookingSummary.services.map(s => ({
        ...s,
        price: s.finalPrice
      })),
      date:                 bookingSummary.bookingDate,
      startTime:            bookingSummary.startTime,
      endTime:              bookingSummary.endTime,
      isVip:                bookingSummary.isVip,
      // Vehicle Details
      vehicleId:            selectedVehicle?.vehicleId,
      vehicleName:          `${selectedVehicle?.carCompany} ${selectedVehicle?.carModel}`,
      carType:              selectedVehicle?.carType,
      regNo:                selectedVehicle?.numberPlate,
    };

    // Save to global context
    setBookingData(finalBookingData);

    console.log("================= FINAL BOOKING DATA SAVED =================");
    console.log(JSON.stringify(finalBookingData, null, 2));
    console.log("============================================================");

    navigation.navigate('Addbookingdetail');
  };

  const renderStation = ({ item }) => (
    <View style={styles.stationCard}>
      <View style={styles.cardHeader}>
        <Image 
          source={{ uri: !item.imagePath ? 'https://via.placeholder.com/150' : `${serverUrl}/station_images/${item.imagePath}` }} 
          style={styles.profileImage} 
        />
        <View style={styles.infoContainer}>
          <View style={{flexDirection:'row', justifyContent:'space-between'}}>
             <Text style={styles.stationName}>{item.stationName}</Text>
             <View style={styles.busyBadge}><Text style={styles.busyText}>Available</Text></View>
          </View>
          <Text style={styles.locationText}>📍 {item.address}</Text>
        </View>
      </View>
      
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.reviewBtn]} onPress={() => navigation.navigate('displaybookingreview', {item})}>
          <Text style={styles.btnText}>⭐ REVIEWS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.serviceBtn]} onPress={() => handleServiceModal(item)}>
          <Text style={styles.btnText}>🛠 SERVICES ({bookingSummary?.services.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.slotBtn]} onPress={() => handleSlotPress(item)}>
          <Text style={styles.btnText}>📅 {bookingSummary?.startTime ? `${bookingSummary?.startTime}` : "SLOTS"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.greeting}>Select Station</Text>
        <View style={styles.searchContainer}>
          <TextInput style={styles.searchBar} placeholder="Search station..." placeholderTextColor= 'grey' value={search} onChangeText={setSearch} />
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker value={tempDate} mode="date" minimumDate={new Date()} onChange={onDateChange} />
      )}

      {!selectedVehicle ? (
        <View style={{ flex: 1, padding: 20 }}>
          <Text style={[styles.sectionLabel, {textAlign: 'center', fontSize: 16, marginBottom: 20}]}>Select Your Vehicle to Start</Text>
          <FlatList
            data={userVehicles}
            keyExtractor={item => item.vehicleId.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.stationCard, {flexDirection: 'row', alignItems: 'center'}]} 
                onPress={() => setSelectedVehicle(item)}
              >
                <View style={[styles.iconCircle, {backgroundColor: '#EBF2FF'}]}>
                  <Text style={{fontSize: 20}}>🚗</Text>
                </View>
                <View style={{flex: 1, marginLeft: 15}}>
                  <Text style={styles.stationName}>{item.carCompany} {item.carModel}</Text>
                  <Text style={styles.locationText}>{item.numberPlate} • {item.carType}</Text>
                </View>
                <Text style={styles.arrow}>{">"}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{padding: 40, alignItems: 'center'}}>
                <Text style={{color: '#888', marginBottom: 20}}>No vehicles found in your profile.</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('addvehicle')} 
                  style={[styles.nextBtn, {backgroundColor: 'darkturquoise'}]}
                >
                  <Text style={styles.nextBtnText}>+ ADD VEHICLE</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      ) : (
        <>
          <View style={styles.selectedVehicleHeader}>
            <View style={{flex: 1}}>
              <Text style={styles.selectedVehicleText}>Selected: {selectedVehicle.carCompany} {selectedVehicle.carModel}</Text>
              <Text style={styles.selectedVehicleSub}>{selectedVehicle.numberPlate} • {selectedVehicle.carType}</Text>
            </View>
            <TouchableOpacity onPress={() => { setSelectedVehicle(null); setBookingSummary(prev => ({...prev, services: [], totalBill: 0, slot: null, startTime: ''})); }}>
              <Text style={{color: 'royalblue', fontWeight: 'bold'}}>Change</Text>
            </TouchableOpacity>
          </View>

          <FlatList 
            data={stations.filter(s => (s.stationName || "").toLowerCase().includes(search.toLowerCase()))}
            renderItem={renderStation}
            keyExtractor={item => item.stationId.toString()}
            contentContainerStyle={{ padding: 15, paddingBottom: 120 }}
          />
        </>
      )}

      <View style={styles.footer}>
        <View style={styles.priceTag}>
          <Text style={styles.totalText}>Rs. {bookingSummary?.totalBill || 0}</Text>
          {bookingSummary?.isVip && <Text style={{color: 'red', fontSize: 10, fontWeight: 'bold'}}>✨ VIP SLOT</Text>}
          {bookingSummary?.bookingDate && <Text style={styles.durationText}>{bookingSummary.bookingDate} | {bookingSummary.endTime}</Text>}
        </View>
        <TouchableOpacity style={[styles.nextBtn, !bookingSummary?.slot && {backgroundColor:'#CCC'}]} onPress={handleFinalBooking}>
          <Text style={styles.nextBtnText}>NEXT</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!modalType} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIndicator} />
            <Text style={styles.modalTitleCenter}>
                {modalType === 'service' ? 'Select Services' : 
                 modalType === 'slot' ? `Slots for ${bookingSummary?.bookingDate}` : 
                 'Select Your Vehicle'}
            </Text>
            <ScrollView style={{maxHeight: 400}}>
              {modalType === 'vehicle' ? (
                userVehicles.length > 0 ? userVehicles.map((v, i) => (
                  <TouchableOpacity key={i} style={styles.serviceRow} onPress={() => selectVehicle(v)}>
                    <View>
                      <Text style={styles.itemText}>{v.carCompany} {v.carModel}</Text>
                      <Text style={styles.itemSubText}>{v.numberPlate} • {v.carType}</Text>
                    </View>
                    <View style={[styles.checkbox, selectedVehicle?.vehicleId === v.vehicleId && styles.checked]}>
                      {selectedVehicle?.vehicleId === v.vehicleId && <Text style={{color: '#FFF', fontSize: 12, fontWeight: 'bold'}}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                )) : (
                  <View style={{padding: 20, alignItems: 'center'}}>
                    <Text style={{color: '#888', marginBottom: 10}}>No vehicles found.</Text>
                    <TouchableOpacity onPress={() => { setModalType(null); navigation.navigate('addvehicle'); }} style={styles.actionBtn}>
                      <Text style={{color: 'darkturquoise', fontWeight: 'bold'}}>+ Add Vehicle</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : modalType === 'service' ? (
                servicesList.map((s, i) => {
                  const isChecked = bookingSummary?.services.some(ser => ser.serviceId === s.serviceId);
                  return (
                    <TouchableOpacity key={i} style={styles.serviceRow} onPress={() => toggleService(s)}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.itemText}>{s.serviceName}</Text>
                          {s.hasDiscount && (
                            <View style={styles.miniBadge}>
                              <Text style={styles.miniBadgeText}>{s.discountLabel || 'OFFER'}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.itemSubText}>{s.duration}m</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginRight: 15 }}>
                        {s.hasDiscount && (
                          <Text style={styles.cutPrice}>Rs. {s.originalPrice}</Text>
                        )}
                        <Text style={styles.itemPriceMain}>Rs. {s.finalPrice}</Text>
                      </View>
                      <View style={[styles.checkbox, isChecked && styles.checked]}>
                        {isChecked && <Text style={{color: '#FFF', fontSize: 12, fontWeight: 'bold'}}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.slotGrid}>
                  {availableSlots.length > 0 ? availableSlots.map((slot, i) => {
                    const timeStr = slot.display.split(' - ')[0];
                    const isVip = (timeStr.startsWith("1:") || timeStr.startsWith("01:")) && timeStr.includes("PM");
                    return (
                      <TouchableOpacity 
                        key={i} 
                        style={[styles.slotBox, isVip && styles.vipSlotBox]} 
                        onPress={() => handleSlotSelection(slot)}
                      >
                        {isVip && (
                          <View style={styles.slotVipBadge}>
                            <Text style={styles.slotVipText}>VIP</Text>
                          </View>
                        )}
                        <Text style={[styles.slotTimeMain, isVip && {color: '#B8860B'}]}>{timeStr}</Text>
                        <Text style={styles.slotTap}>Bay: {slot.bayId}</Text>
                      </TouchableOpacity>
                    );
                  }) : (
                    <Text style={{textAlign:'center', width:'100%', padding:20, color:'#888'}}>No slots available.</Text>
                  )}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setModalType(null)} style={styles.confirmBtn}><Text style={styles.confirmBtnText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading && <View style={styles.loader}><ActivityIndicator size="large" color="#D49B00" /></View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { padding: 20, backgroundColor: '#FFF' },
  greeting: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  searchContainer: { backgroundColor: '#F1F3F6', borderRadius: 10, paddingHorizontal: 15, marginTop: 10 },
  searchBar: { height: 45 },
  stationCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 3 },
  cardHeader: { flexDirection: 'row' },
  infoContainer: { marginLeft: 12, flex: 1 },
  stationName: { fontSize: 16, fontWeight: 'bold' },
  busyBadge: { backgroundColor: '#E8F5E9', padding: 4, borderRadius: 5 },
  busyText: { color: '#2E7D32', fontSize: 9, fontWeight: 'bold' },
  locationText: { color: '#888', fontSize: 11, marginTop: 2 },
  profileImage: { width: 85, height: 85, borderRadius: 10, backgroundColor: '#eee' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, marginHorizontal: 3, alignItems: 'center' },
  serviceBtn: { backgroundColor: 'darkturquoise' },
  reviewBtn: { backgroundColor: '#5856D6' },
  slotBtn: { backgroundColor: '#D49B00' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 9 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 20, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE', elevation: 20 },
  priceTag: { flex: 1 },
  totalText: { fontSize: 20, fontWeight: 'bold' },
  durationText: { fontSize: 12, color: 'royalblue', fontWeight: '500' },
  nextBtn: { backgroundColor: '#1A1A1A', paddingHorizontal: 35, paddingVertical: 15, borderRadius: 12 },
  nextBtnText: { color: '#FFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  modalHeaderIndicator: { width: 40, height: 5, backgroundColor: '#DDD', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
  modalTitleCenter: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  itemText: { fontSize: 16, fontWeight: '600' },
  itemSubText: { fontSize: 12, color: '#999' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: 'darkturquoise', justifyContent: 'center', alignItems: 'center' },
  checked: { backgroundColor: 'darkturquoise' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  slotBox: { width: '48%', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  slotTimeMain: { fontSize: 16, fontWeight: 'bold' },
  slotTap: { fontSize: 11, color: 'royalblue', marginTop: 4 },
  confirmBtn: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, marginTop: 15, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold' },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  cutPrice: { fontSize: 10, color: '#999', textDecorationLine: 'line-through' },
  itemPriceMain: { fontSize: 14, fontWeight: 'bold', color: 'darkturquoise' },
  miniBadge: { backgroundColor: '#e53935', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 8 },
  miniBadgeText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  vipSlotBox: { borderColor: '#FFD700', backgroundColor: '#FFFDF0', borderWidth: 1.5 },
  slotVipBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, elevation: 3 },
  slotVipText: { fontSize: 8, fontWeight: 'bold', color: '#000' },
  selectedVehicleHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, marginHorizontal: 15, marginTop: 15, borderRadius: 12, elevation: 2, borderLeftWidth: 4, borderLeftColor: 'darkturquoise' },
  selectedVehicleText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  selectedVehicleSub: { fontSize: 11, color: '#666' },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  arrow: { fontSize: 18, color: '#CCC' },
});