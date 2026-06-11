import React, { useState, useContext, useEffect, useRef } from 'react';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { 
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, 
  SafeAreaView, Image, Alert, Switch, ActivityIndicator, PermissionsAndroid 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import Geolocation from 'react-native-geolocation-service';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

export default function updatestation({ navigation }) {
  const { User, stationdata } = useContext(UserContext);
  const mapRef = useRef(null);

 
  const serverUrl = BASE_URL.replace('/api', '');


  const [loading, setLoading] = useState(false);
  const [lat, setLat] = useState(stationdata?.latitude?.toString() || "33.6844");
  const [long, setLong] = useState(stationdata?.longitude?.toString() || "73.0479");
  
  
  const initialImage = stationdata?.imagePath 
    ? (stationdata.imagePath.startsWith('http') 
        ? stationdata.imagePath 
        : `${serverUrl}/station_images/${stationdata.imagePath}`)
    : "";
    
  const [image, setImage] = useState(initialImage);
  const [stationName, setStationName] = useState(stationdata?.stationName || "");
  const [email, setEmail] = useState(stationdata?.email || ""); 
  const [contact, setContact] = useState(stationdata?.contact || "");
  const [address, setAddress] = useState(stationdata?.address || "");
  

const [openTimeApi, setOpenTimeApi] = useState(stationdata?.openingTime || ""); 
const [closeTimeApi, setCloseTimeApi] = useState(stationdata?.closingTime || "");


const [openTime, setOpenTime] = useState(); 
const [closeTime, setCloseTime] = useState();
  
  const [showOpenPicker, setShowOpenPicker] = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);
  const [status, setStatus] = useState(stationdata?.status === 1);

  
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const formatTimeToDisplay = (timeStr) => {
    if (!timeStr) return "Select Time";
    const [hrs, mins] = timeStr.split(':');
    const h = parseInt(hrs);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${displayHour}:${mins.toString().padStart(2, "0")} ${ampm}`;
  };

  useEffect(() => {
  if (stationdata) {
    const formattedOpen = formatTimeToDisplay(stationdata.openingTime);
    const formattedClose = formatTimeToDisplay(stationdata.closingTime);
    
    setOpenTime(formattedOpen);
    setCloseTime(formattedClose);
    

    setOpenTimeApi(stationdata.openingTime);
    setCloseTimeApi(stationdata.closingTime);
    console.log(stationdata)
  }
}, [stationdata]);

  const handleSearchInputChange = async (text) => {
    setSearchInput(text);
    if (text.length > 2) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&accept-language=en`,
          { headers: { 'User-Agent': 'ServiceYourCarApp' } }
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error("OSM Search error:", error);
      }
    } else {
      setSuggestions([]);
    }
  };

  const selectLocationFromSearch = (item) => {
    const newLatStr = item.lat.toString();
    const newLonStr = item.lon.toString();
    setLat(newLatStr);
    setLong(newLonStr);
    mapRef.current?.animateToRegion({
      latitude: parseFloat(newLatStr),
      longitude: parseFloat(newLonStr),
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 1000);
    setSuggestions([]);
    setSearchInput("");
    setShowSearchBox(false);
  };

  const getCurrentLocation = async () => {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      Geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLat(latitude.toString());
          setLong(longitude.toString());
          mapRef.current?.animateToRegion({
            latitude, longitude,
            latitudeDelta: 0.005, longitudeDelta: 0.005,
          }, 1000);
        },
        (err) => Alert.alert("Error", "GPS enable karein"),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    }
  };

  const onTimeChange = (event, selectedDate, type) => {
    if (type === 'open') setShowOpenPicker(false);
    else setShowClosePicker(false);

    if (selectedDate) {
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const apiTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      const displayTime = formatTimeToDisplay(apiTime);

      if (type === "open") {
        setOpenTime(displayTime);
        setOpenTimeApi(apiTime);
      } else {
        setCloseTime(displayTime);
        setCloseTimeApi(apiTime);
      }
    }
  };

  const handleUpdate = async () => {
    if (!stationName || !contact || !address || !email || !lat || !long) {
      Alert.alert("Error", "Please fill all required fields including Email");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("StationName", stationName);
    formData.append("Email", email);
    formData.append("Contact", contact);
    formData.append("Address", address);
    formData.append("Latitude", lat);
    formData.append("Longitude", long);
    formData.append("OpeningTime", openTimeApi);
    formData.append("ClosingTime", closeTimeApi);
    formData.append("OwnerId", User?.id);
    formData.append("Status", status ? 1 : 0);

   
    if (image && image.startsWith('file://')) {
      const uriParts = image.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('imageFile', {
        uri: image,
        name: `update_${Date.now()}.${fileType}`,
        type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`
      });
    }

    try {
      const url = `${BASE_URL}/Station/updatestation/${stationdata?.stationId}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { 'Accept': 'application/json' },
        body: formData
      });
      const result = await response.json();

      if (result.status === "success") {
        Alert.alert("Success", "Station updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert("Failed", result.message || "Update failed");
      }
    } catch (error) {
      console.log("Update Error:", error);
      Alert.alert("Error", "Server connection failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Update Station</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
        
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.imagePlaceholder}>
            {image ? <Image source={{ uri: image }} style={styles.profileImage} /> :
              <Text style={{ color: 'gray' }}>No Image</Text>}
          </View>
          <View style={styles.imagePickerRow}>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => launchCamera({ mediaType: 'photo', quality: 0.7 }, r => r.assets && setImage(r.assets[0].uri))}>
              <Text style={styles.pickerBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: 'slategray' }]} onPress={() => launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, r => r.assets && setImage(r.assets[0].uri))}>
              <Text style={styles.pickerBtnText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: 'red' }]} onPress={() => setImage("")}>
              <Text style={styles.pickerBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <Text style={styles.label}>Station Name</Text>
          <TextInput style={styles.input} value={stationName} onChangeText={setStationName} placeholderTextColor="#999" />

          <Text style={styles.label}>Station Email</Text>
          <TextInput 
            style={styles.input} 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address" 
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Contact No</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" value={contact} onChangeText={setContact} placeholderTextColor="#999" />

          <Text style={styles.label}>Station Address</Text>
          <TextInput style={[styles.input, {height: 60}]} value={address} onChangeText={setAddress} multiline placeholderTextColor="#999" />

          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput style={styles.input} value={lat} keyboardType="numeric" onChangeText={setLat} />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput style={styles.input} value={long} keyboardType="numeric" onChangeText={setLong} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Opening Time</Text>
              <TouchableOpacity style={styles.timeInputBox} onPress={() => setShowOpenPicker(true)}>
                <Text style={{ color: 'black' }}>{openTime}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Closing Time</Text>
              <TouchableOpacity style={styles.timeInputBox} onPress={() => setShowClosePicker(true)}>
                <Text style={{ color: 'black' }}>{closeTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Station Status</Text>
            <View style={styles.switchRow}>
              <Switch value={status} onValueChange={setStatus} trackColor={{ false: "#ccc", true: "#00796b" }} />
              <Text style={[styles.statusText, { color: status ? '#00796b' : '#555' }]}>{status ? "Open" : "Closed"}</Text>
            </View>
          </View>
        </View>

        {/* MAP SECTION */}
        <Text style={styles.label}>Update Location on Map</Text>
        <View style={styles.mapContainer}>
          {showSearchBox && (
            <View style={styles.searchWrapper}>
              <TextInput 
                style={styles.searchTextInput} 
                placeholder="Search new area..." 
                value={searchInput} 
                onChangeText={handleSearchInputChange} 
                placeholderTextColor="#999"
              />
              {suggestions.map((item, index) => (
                <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => selectLocationFromSearch(item)}>
                  <Text numberOfLines={1} style={styles.suggestionText}>{item.display_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.mapElement}
              onPress={(e) => {
                setLat(e.nativeEvent.coordinate.latitude.toString());
                setLong(e.nativeEvent.coordinate.longitude.toString());
              }}
              region={{
                latitude: Number(lat) || 33.6844,
                longitude: Number(long) || 73.0479,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker 
                coordinate={{ 
                    latitude: Number(lat) || 33.6844, 
                    longitude: Number(long) || 73.0479 
                }} 
                draggable 
                onDragEnd={(e) => {
                  setLat(e.nativeEvent.coordinate.latitude.toString());
                  setLong(e.nativeEvent.coordinate.longitude.toString());
                }} 
              />
            </MapView>
          </View>

          <View style={styles.locRow}>
             <TouchableOpacity style={styles.locBtn} onPress={getCurrentLocation}>
                <Text style={styles.locBtnText}>📍 Current</Text>
             </TouchableOpacity>
             <TouchableOpacity 
                style={[styles.locBtn, showSearchBox && {backgroundColor: 'darkslategrey'}]} 
                onPress={() => {setShowSearchBox(!showSearchBox); setSuggestions([]);}}
             >
               <Text style={[styles.locBtnText, showSearchBox && {color: 'white'}]}>🔍 Search</Text>
             </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleUpdate} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Update Station</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {showOpenPicker && <DateTimePicker value={new Date()} mode="time" is24Hour={false} onChange={(e, d) => onTimeChange(e, d, 'open')} />}
      {showClosePicker && <DateTimePicker value={new Date()} mode="time" is24Hour={false} onChange={(e, d) => onTimeChange(e, d, 'close')} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  header: { paddingVertical: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  container: { paddingHorizontal: 20 },
  photoSection: { alignItems: 'center', marginVertical: 20 },
  imagePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f0f0', overflow: 'hidden', borderWidth: 1, borderColor: 'darkturquoise', justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: '100%', height: '100%' },
  imagePickerRow: { flexDirection: 'row', marginTop: 15 },
  pickerBtn: { backgroundColor: 'darkturquoise', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginHorizontal: 3 },
  pickerBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  form: { marginTop: 5 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 5, color: '#555' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 15, color: 'black' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { flex: 0.48 },
  timeInputBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 15, backgroundColor: '#f9f9f9' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f7fa', padding: 12, borderRadius: 10, marginBottom: 20 },
  statusLabel: { fontWeight: 'bold', color: '#00796b' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { marginLeft: 5, fontWeight: 'bold' },
  mapContainer: { marginBottom: 25 },
  searchWrapper: { marginBottom: 10, zIndex: 100 },
  searchTextInput: { borderWidth: 1, borderColor: 'darkturquoise', borderRadius: 8, padding: 10, color: 'black', backgroundColor: 'white' },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: 'white' },
  suggestionText: { fontSize: 12, color: '#444' },
  mapWrapper: { height: 200, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  mapElement: { flex: 1 },
  locRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  locBtn: { width: '48%', backgroundColor: 'white', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  locBtnText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  submitBtn: { backgroundColor: 'darkturquoise', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});