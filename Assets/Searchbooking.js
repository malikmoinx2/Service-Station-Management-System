import React, { useState, useEffect, useContext } from 'react'; 
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service'; 
import { 
  StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, 
  StatusBar, FlatList, Alert, PermissionsAndroid, TextInput, ActivityIndicator 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UserContext } from './UserContext';
import { BASE_URL } from './Constants';

const Searchbooking = ({ navigation }) => {
  const { User, setBookingData, setusercoordinate } = useContext(UserContext);
  const [loading, setloading] = useState(true);
  
  // 💡 VIP HOURS CONFIGURATION LIST (Yahan aap jitne chahein ghante add kar sakte hain)
  // Examples: 13 = 1 PM, 14 = 2 PM, 17 = 5 PM, 20 = 8 PM (24-hour format)
  const vipHoursList = [13, 14, 20]; 

  // States
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]); 
  const [userLocation, setUserLocation] = useState(null);
  const [timeValue, setTimeValue] = useState(new Date()); 
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeDisplay, setTimeDisplay] = useState(null);
  const [endTimeDisplay, setEndTimeDisplay] = useState(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [userlat, setuserlat] = useState(33.6844); 
  const [userlong, setuserlong] = useState(73.0479);
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [servicesList, setservicesList] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (servicesList.length > 0) {
      calculateEndDetails();
    }
  }, [selectedServices, timeValue, servicesList]);

  // Helper function to check if selected hour is VIP
  const checkIfVipSlot = (dateObj) => {
    if (!dateObj) return false;
    const selectedHour = dateObj.getHours();
    return vipHoursList.includes(selectedHour);
  };

  const loadInitialData = async () => {
    try {
      setloading(true);
      const serviceRes = await fetch(`${BASE_URL}/Station/getservicenames`);
      const serviceResult = await serviceRes.json();
      if (serviceResult.status === "success") setservicesList(serviceResult.data);

      const vehicleRes = await fetch(`${BASE_URL}/Customer/GetVehiclesByUserId/${User?.id}`);
      const vehicleResult = await vehicleRes.json();
      if (vehicleResult.status === "success") {
        setVehiclesList(vehicleResult.data);
        if (vehicleResult.data.length > 0) setSelectedVehicle(vehicleResult.data[0]);
      }
    } catch (error) {
      console.error("Load Data Error:", error);
      Alert.alert("Error", "Failed to fetch initial data.");
    } finally {
      setloading(false);
    }
  };

  const calculateEndDetails = () => {
    let duration = 0;
    selectedServices.forEach(serviceId => {
      const service = servicesList.find(s => s.id === serviceId);
      if (service) duration += service.defaultDuration; 
    });
    setTotalDuration(duration);

    if (timeValue && duration > 0) {
      let endTimeObj = new Date(timeValue.getTime());
      endTimeObj.setMinutes(endTimeObj.getMinutes() + duration);
      setEndTimeDisplay(formatTime(endTimeObj));
    } else {
      setEndTimeDisplay(null);
    }
  };

  const formatTime = (date) => {
    const hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    const minutes = date.getMinutes();
    const displayMin = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHour}:${displayMin} ${ampm}`;
  };

  const toggleService = (serviceId) => {
    if (selectedServices.includes(serviceId)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter(id => id !== serviceId));
      }
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      if (date < new Date().setHours(0,0,0,0)) {
        Alert.alert("Invalid Date", "You cannot select a past date.");
        return;
      }
      setSelectedDate(date);
      setTimeDisplay(null);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false); 
    if (event.type === "set" && selectedTime) {
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();

      if (isToday) {
        const bufferTime = new Date(now.getTime() + 2 * 60000);
        if (selectedTime.getTime() < bufferTime.getTime()) {
          Alert.alert("Invalid Time", "Please select a time at least 2 minutes from now.");
          return;
        }
      }

      const hours = selectedTime.getHours();
      if (hours < 0 || hours > 24) {
        Alert.alert("Closed", "Please select a valid operational time slot.");
        return;
      }

      setTimeValue(selectedTime);
      setTimeDisplay(formatTime(selectedTime));
    }
  };

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setuserlat(latitude); setuserlong(longitude);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`, 
        { headers: { 'User-Agent': 'ServiceAcCarApp' } }
      );
      const data = await response.json();
      setUserLocation(data.display_name.split(',')[0] + ", " + (data.address.city || ""));
    } catch (error) {
      setUserLocation("Selected Location");
    }
  };

  const handleConfirm = () => {
    if (!timeDisplay) {
        Alert.alert("Time Required", "Please select an appointment time slot.");
        return;
    }
    if (!selectedVehicle) {
        Alert.alert("Vehicle Required", "Please select a vehicle.");
        return;
    }

    const selectedNames = servicesList
      .filter(s => selectedServices.includes(s.id))
      .map(s => s.serviceName);

    // 💡 Dynamic List Validation Check
    const isVipSlotSelected = checkIfVipSlot(timeValue);

    const finalBookingData = {
      vehicleId: selectedVehicle.vehicleId,
      vehicleName: `${selectedVehicle.carCompany} ${selectedVehicle.carModel}`,
      carType: selectedVehicle.carType,
      regNo: selectedVehicle.numberPlate,
      serviceIds: selectedServices,
      serviceNames: selectedNames,
      date: selectedDate.toDateString(),
      startTime: timeDisplay,
      endTime: endTimeDisplay,
      duration: totalDuration,
      location: userLocation,
      latitude:  userlat,    //userlat
      longitude: userlong,   //userlong
      isVip: isVipSlotSelected 
    };

    console.log("Final Booking Object:", finalBookingData);
    setBookingData(finalBookingData);
    setusercoordinate({ userlatitude: userlat, userlongitude: userlong });
    navigation.navigate('Viewnearbystation');
  }; 

  const requestlocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) { return false; }
  };

  const getlocation = async () => {
    setIsSearching(false);
    const hasPermission = await requestlocationPermission();
    if (!hasPermission) return;

    Geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setuserlat(latitude); setuserlong(longitude);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`, 
            { headers: { 'User-Agent': 'ServiceAcCarApp' } }
          );
          const data = await response.json();
          setUserLocation(data.display_name.split(',')[0] + ", " + (data.address.city || ""));
        } catch (error) { setUserLocation("Current Location"); }
      },
      (error) => Alert.alert("GPS Error", "Ensure GPS is enabled."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleInputChange = async (text) => {
    setSearchInput(text);
    if (text.length > 2) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&accept-language=en`, { headers: { 'User-Agent': 'ServiceAcCarApp' } });
        const data = await response.json();
        setSuggestions(data);
      } catch (error) { console.error(error); }
    } else { setSuggestions([]); }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="royalblue" />
        <Text style={styles.loaderText}>Syncing Data...</Text>
      </View>
    );
  }

  // UI rendering state helpers
  const currentIsVip = checkIfVipSlot(timeValue);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule Service</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Vehicle Selection List */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Your Vehicle</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={vehiclesList}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => setSelectedVehicle(item)}
                style={[styles.vehicleChip, selectedVehicle?.vehicleId === item.vehicleId && styles.activeBlack]}
              >
                <Text style={[styles.vehicleText, selectedVehicle?.vehicleId === item.vehicleId && styles.whiteText]}>
                  {item.carCompany} {item.carModel}
                </Text>
                <Text style={[styles.vehicleSubText, selectedVehicle?.vehicleId === item.vehicleId && styles.whiteText]}>
                  {item.carType} • {item.numberPlate}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.vehicleId.toString()}
          />
        </View>

        {/* Services List */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Services ({totalDuration} mins)</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={servicesList}
            renderItem={({ item }) => {
              const isSelected = selectedServices.includes(item.id);
              return (
                <TouchableOpacity 
                  onPress={() => toggleService(item.id)}
                  style={[styles.serviceChip, isSelected && styles.activeBlue]}
                >
                  <Text style={[styles.serviceText, isSelected && styles.whiteText]}>
                    {item.serviceName} ({item.defaultDuration}m)
                  </Text>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.id.toString()}
          />
        </View>

        {/* Date Picker Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Service Date</Text>
          <TouchableOpacity style={styles.pickerBox} onPress={() => setShowDatePicker(true)}>
             <Text style={styles.pickerBoxText}>📅 {selectedDate.toDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker value={selectedDate} mode="date" display="calendar" minimumDate={new Date()} onChange={onDateChange} />
          )}
        </View>

        {/* Time Picker Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Appointment Time</Text>
          <TouchableOpacity 
            activeOpacity={0.8} 
            style={[styles.timePickerBtn, timeDisplay && currentIsVip && styles.vipBorder]}
            onPress={() => setShowTimePicker(true)}
          >
            <View style={{alignItems: 'center'}}>
                <Text style={[styles.timePickerBtnText, timeDisplay && currentIsVip && styles.vipText]}>
                    {timeDisplay ? `Starts at: ${timeDisplay}` : "Set Appointment Time"}
                </Text>
                {endTimeDisplay && (
                    <Text style={styles.endTimeLabel}>Expected Finish: {endTimeDisplay}</Text>
                )}
            </View>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker value={timeValue} mode="time" is24Hour={false} onChange={onTimeChange} />
          )}
          {timeDisplay && currentIsVip && (
            <Text style={styles.vipNoteText}>
              Note: This is a VIP slot. VIP price will apply.
            </Text>
          )}
        </View>

        {/* Map Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Service Location</Text>
          {isSearching && (
            <View style={{ zIndex: 30 }}>
              <View style={styles.searchBarContainer}>
                <TextInput style={styles.searchTextInput} placeholder="Search area..." value={searchInput} onChangeText={handleInputChange} />
              </View>
              {suggestions.map((item, index) => (
                <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => {
                   setuserlat(parseFloat(item.lat|| 33.5964675)); setuserlong(parseFloat(item.lon|| 73.0590794));
                   setUserLocation(item.display_name.split(',')[0]); setSuggestions([]); setIsSearching(false);
                }}>
                  <Text numberOfLines={1} style={styles.suggestionText}>{item.display_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.mapWrapper}>
            <MapView provider={PROVIDER_GOOGLE} style={styles.map} onPress={handleMapPress}
              region={{ latitude: userlat, longitude: userlong, latitudeDelta: 0.015, longitudeDelta: 0.0121 }}>
              <Marker coordinate={{ latitude: userlat, longitude: userlong }} title="Dropoff Point" />
            </MapView>
            <View style={styles.mapOverlay}>
                <Text style={styles.locationTitle}>Dropoff Address</Text>
                <Text numberOfLines={2} style={styles.locationSub}>{userLocation || "Pin your location on map"}</Text>
            </View>
          </View>

          <View style={styles.locRow}>
              <TouchableOpacity style={styles.locBtn} onPress={getlocation}><Text style={styles.locBtnText}>📍 Current</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.locBtn, isSearching && styles.activeSearchBtn]} onPress={() => setIsSearching(!isSearching)}>
                <Text style={[styles.locBtnText, isSearching && styles.whiteText]}>🔍 Search</Text>
              </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.confirmBtn, !timeDisplay && styles.disabledBtn]} disabled={!timeDisplay} onPress={handleConfirm}>
          <Text style={styles.confirmText}>FIND NEARBY STATIONS</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 20, backgroundColor: 'white', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  scrollContent: { padding: 20 },
  section: { marginBottom: 25 },
  sectionLabel: { fontSize: 13, fontWeight: 'bold', color: '#6c757d', marginBottom: 12, textTransform: 'uppercase' },
  vehicleChip: { backgroundColor: 'white', padding: 12, borderRadius: 15, marginRight: 10, elevation: 3, borderWidth: 1, borderColor: '#eee', minWidth: 140 },
  vehicleText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  vehicleSubText: { fontSize: 11, color: '#666', marginTop: 2 },
  serviceChip: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8, elevation: 2 },
  serviceText: { fontSize: 13, color: '#333' },
  pickerBox: { backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  pickerBoxText: { fontSize: 16, fontWeight: '600', color: '#333' },
  timePickerBtn: { backgroundColor: '#EBF2FF', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: 'royalblue' },
  timePickerBtnText: { fontSize: 16, fontWeight: '700', color: 'royalblue' },
  endTimeLabel: { fontSize: 12, color: '#555', marginTop: 4 },
  vipBorder: { borderColor: '#FFD700', backgroundColor: '#FFFDF0', borderStyle: 'dashed' },
  vipText: { color: '#B8860B' },
  activeBlack: { backgroundColor: '#212529', borderColor: '#212529' },
  activeBlue: { backgroundColor: 'royalblue' },
  whiteText: { color: 'white' },
  vipNoteText: { color: '#B8860B', fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: 'bold' },
  searchBarContainer: { backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ddd' },
  searchTextInput: { height: 45, color: '#000' },
  suggestionItem: { padding: 14, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  suggestionText: { fontSize: 13, color: '#444' },
  activeSearchBtn: { backgroundColor: '#343a40' },
  mapWrapper: { height: 180, borderRadius: 18, overflow: 'hidden', marginTop: 10, elevation: 4 },
  map: { flex: 1 },
  mapOverlay: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 10 },
  locationTitle: { fontSize: 10, fontWeight: 'bold', color: 'royalblue' },
  locationSub: { fontSize: 12, color: '#000' },
  locRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  locBtn: { width: '48%', backgroundColor: 'white', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  locBtnText: { fontSize: 13, fontWeight: '700' },
  confirmBtn: { backgroundColor: 'royalblue', padding: 18, borderRadius: 15, alignItems: 'center', marginBottom: 40 },
  disabledBtn: { backgroundColor: '#ced4da' },
  confirmText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  loaderText: { marginTop: 12, color: 'gray' }
});

export default Searchbooking;