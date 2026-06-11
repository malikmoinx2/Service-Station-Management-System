import React, { useState, useContext, useRef } from 'react';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Image, Alert, Switch, ActivityIndicator, PermissionsAndroid
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Geolocation from 'react-native-geolocation-service';
import { UserContext } from './UserContext';
import { BASE_URL } from './Constants';
 
export default function Addstation({ navigation }) {
  const { User } = useContext(UserContext);
  const mapRef = useRef(null);
 
  const [loading, setLoading]         = useState(false);
  const [stationName, setStationName] = useState('');
  const [email, setEmail]             = useState('');
  const [address, setAddress]         = useState('');
  const [contact, setContact]         = useState('');
  const [image, setImage]             = useState('');
  const [status, setStatus]           = useState(true);
 
  const [openTime, setOpenTime]           = useState('');
  const [closeTime, setCloseTime]         = useState('');
  const [openTimeApi, setOpenTimeApi]     = useState('');
  const [closeTimeApi, setCloseTimeApi]   = useState('');
  const [showOpenPicker, setShowOpenPicker]   = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);
 
  // --- Location States (same as Searchbooking) ---
  const [userlat, setuserlat]               = useState(31.5204);
  const [userlong, setuserlong]             = useState(74.3587);
  const [userLocation, setUserLocation]     = useState('');
  const [isSearching, setIsSearching]       = useState(false);
  const [searchInput, setSearchInput]       = useState('');
  const [suggestions, setSuggestions]       = useState([]);
 
  // ---- Image Picker ----
  const handleImagePicker = (type) => {
    const method = type === 'camera' ? launchCamera : launchImageLibrary;
    method({ mediaType: 'photo', quality: 0.7 }, (res) => {
      if (res.assets) setImage(res.assets[0].uri);
    });
  };
 
  // ---- Time Picker ----
  const onTimeChange = (event, selectedDate, type) => {
    if (type === 'open') setShowOpenPicker(false);
    else setShowClosePicker(false);
 
    if (selectedDate) {
      const h = selectedDate.getHours(), m = selectedDate.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const display = `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
      const api     = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      if (type === 'open') { setOpenTime(display); setOpenTimeApi(api); }
      else                 { setCloseTime(display); setCloseTimeApi(api); }
    }
  };
 
  // ---- Map Press → reverse geocode (same as Searchbooking) ----
  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setuserlat(latitude);
    setuserlong(longitude);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`,
        { headers: { 'User-Agent': 'ServiceAcCarApp' } }
      );
      const data = await response.json();
      setUserLocation(
        data.display_name.split(',')[0] + ', ' + (data.address.city || data.address.town || '')
      );
    } catch {
      setUserLocation('Selected Location');
    }
  };
 
  // ---- Current Location (same as Searchbooking) ----
  const getlocation = async () => {
    setIsSearching(false);
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    } catch { return; }
 
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setuserlat(latitude);
        setuserlong(longitude);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`,
            { headers: { 'User-Agent': 'ServiceAcCarApp' } }
          );
          const data = await response.json();
          setUserLocation(
            data.display_name.split(',')[0] + ', ' + (data.address.city || data.address.town || '')
          );
        } catch {
          setUserLocation('Current Location');
        }
      },
      () => Alert.alert('GPS Error', 'Ensure GPS is enabled.'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };
 
  // ---- Search Input (same as Searchbooking) ----
  const handleInputChange = async (text) => {
    setSearchInput(text);
    if (text.length > 2) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&accept-language=en`,
          { headers: { 'User-Agent': 'ServiceAcCarApp' } }
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) { console.error(error); }
    } else {
      setSuggestions([]);
    }
  };
 
  // ---- Save Station ----
  const handleSaveStation = async () => {
    if (!stationName || !contact || !address || !openTimeApi || !closeTimeApi) {
      Alert.alert('Missing Info', 'Please fill all required fields.');
      return;
    }
    setLoading(true);
 
    const formData = new FormData();
    formData.append('StationName', stationName);
    formData.append('Contact', contact);
    formData.append('Email', email);
    formData.append('Address', address);
    formData.append('Latitude', userlat.toString());
    formData.append('Longitude', userlong.toString());
    formData.append('OpeningTime', openTimeApi);
    formData.append('ClosingTime', closeTimeApi);
    formData.append('OwnerId', User?.id);
    formData.append('Status', status ? 1 : 0);
 
    if (image) {
      const ext = image.split('.').pop();
      formData.append('imageFile', {
        uri: image,
        name: `station_${Date.now()}.${ext}`,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      });
    }
 
    try {
      const response = await fetch(`${BASE_URL}/Station/addstation`, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      const result = await response.json();
      if (result.status === 'success') {
        Alert.alert('Success', 'Station Registered!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('Error', result.message || 'Something went wrong');
      }
    } catch {
      Alert.alert('Error', 'Server connection failed. Check IP in Constants.js');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add New Station</Text>
      </View>
 
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
 
        {/* Photo */}
        <View style={styles.photoSection}>
          <View style={styles.imagePlaceholder}>
            {image
              ? <Image source={{ uri: image }} style={styles.profileImage} />
              : <Text style={{ color: '#999' }}>No Photo</Text>}
          </View>
          <View style={styles.imagePickerRow}>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => handleImagePicker('camera')}>
              <Text style={styles.pickerBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: 'slategray' }]} onPress={() => handleImagePicker('library')}>
              <Text style={styles.pickerBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
 
        {/* Form Fields */}
        <View style={styles.form}>
          <Text style={styles.label}>Station Name</Text>
          <TextInput style={styles.input} value={stationName} onChangeText={setStationName} placeholder="Enter station name" placeholderTextColor="#999" />
 
          <Text style={styles.label}>Station Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="e.g. station@service.com" placeholderTextColor="#999" autoCapitalize="none" />
 
          <Text style={styles.label}>Contact Number</Text>
          <TextInput style={styles.input} value={contact} onChangeText={setContact} keyboardType="phone-pad" placeholder="e.g. 03001234567" placeholderTextColor="#999" />
 
          <Text style={styles.label}>Full Address</Text>
          <TextInput style={[styles.input, { height: 60 }]} value={address} onChangeText={setAddress} multiline placeholder="Enter complete address" placeholderTextColor="#999" />
 
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Opening Time</Text>
              <TouchableOpacity onPress={() => setShowOpenPicker(true)} style={styles.timeInputBox}>
                <Text style={{ color: openTime ? 'black' : '#999' }}>{openTime || 'Set Time'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Closing Time</Text>
              <TouchableOpacity onPress={() => setShowClosePicker(true)} style={styles.timeInputBox}>
                <Text style={{ color: closeTime ? 'black' : '#999' }}>{closeTime || 'Set Time'}</Text>
              </TouchableOpacity>
            </View>
          </View>
 
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <View style={styles.switchRow}>
              <Switch value={status} onValueChange={setStatus} trackColor={{ false: '#ccc', true: '#00796b' }} />
              <Text style={[styles.statusText, { color: status ? '#00796b' : '#555' }]}>
                {status ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
 
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput style={styles.input} value={userlat.toString()} keyboardType="numeric" onChangeText={(t) => setuserlat(t)} />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput style={styles.input} value={userlong.toString()} keyboardType="numeric" onChangeText={(t) => setuserlong(t)} />
            </View>
          </View>
        </View>
 
        {/* Map Section (same style as Searchbooking) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Station Location</Text>
 
          {isSearching && (
            <View style={{ zIndex: 30 }}>
              <View style={styles.searchBarContainer}>
                <TextInput
                  style={styles.searchTextInput}
                  placeholder="Search area..."
                  value={searchInput}
                  onChangeText={handleInputChange}
                />
              </View>
              {suggestions.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setuserlat(parseFloat(item.lat));
                    setuserlong(parseFloat(item.lon));
                    setUserLocation(item.display_name.split(',')[0]);
                    setSuggestions([]);
                    setIsSearching(false);
                  }}
                >
                  <Text numberOfLines={1} style={styles.suggestionText}>{item.display_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
 
          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              onPress={handleMapPress}
              region={{
                latitude:       Number(userlat)  || 31.5204,
                longitude:      Number(userlong) || 74.3587,
                latitudeDelta:  0.015,
                longitudeDelta: 0.0121,
              }}
            >
              <Marker
                coordinate={{ latitude: Number(userlat), longitude: Number(userlong) }}
                title="Station Location"
              />
            </MapView>
 
            <View style={styles.mapOverlay}>
              <Text style={styles.locationTitle}>Station Address</Text>
              <Text numberOfLines={2} style={styles.locationSub}>
                {userLocation || 'Pin your location on map'}
              </Text>
            </View>
          </View>
 
          <View style={styles.locRow}>
            <TouchableOpacity style={styles.locBtn} onPress={getlocation}>
              <Text style={styles.locBtnText}>📍 Current</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.locBtn, isSearching && styles.activeSearchBtn]}
              onPress={() => setIsSearching(!isSearching)}
            >
              <Text style={[styles.locBtnText, isSearching && styles.whiteText]}>🔍 Search</Text>
            </TouchableOpacity>
          </View>
        </View>
 
        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveStation} disabled={loading}>
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.submitText}>Save Station</Text>}
        </TouchableOpacity>
 
        <View style={{ height: 40 }} />
      </ScrollView>
 
      {showOpenPicker  && <DateTimePicker value={new Date()} mode="time" is24Hour={false} onChange={(e, d) => onTimeChange(e, d, 'open')} />}
      {showClosePicker && <DateTimePicker value={new Date()} mode="time" is24Hour={false} onChange={(e, d) => onTimeChange(e, d, 'close')} />}
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safeArea:           { flex: 1, backgroundColor: 'white' },
  header:             { padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle:        { fontSize: 20, fontWeight: 'bold', color: 'black' },
  container:          { paddingHorizontal: 20 },
  photoSection:       { alignItems: 'center', marginVertical: 15 },
  imagePlaceholder:   { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: 'darkturquoise', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  profileImage:       { width: '100%', height: '100%' },
  imagePickerRow:     { flexDirection: 'row', marginTop: 10 },
  pickerBtn:          { backgroundColor: 'darkturquoise', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, marginHorizontal: 5 },
  pickerBtnText:      { color: 'white', fontWeight: 'bold', fontSize: 12 },
  form:               { marginTop: 10 },
  label:              { fontSize: 13, fontWeight: 'bold', marginBottom: 5, color: '#333', marginTop: 10 },
  input:              { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 15, color: 'black' },
  timeInputBox:       { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, backgroundColor: 'white' },
  row:                { flexDirection: 'row', justifyContent: 'space-between' },
  column:             { width: '48%' },
  statusRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f7fa', padding: 12, borderRadius: 10, marginBottom: 15 },
  statusLabel:        { fontWeight: 'bold', color: '#00796b' },
  switchRow:          { flexDirection: 'row', alignItems: 'center' },
  statusText:         { marginLeft: 8, fontWeight: 'bold' },
  section:            { marginBottom: 25 },
  sectionLabel:       { fontSize: 13, fontWeight: 'bold', color: '#6c757d', marginBottom: 12, textTransform: 'uppercase' },
  searchBarContainer: { backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ddd' },
  searchTextInput:    { height: 45, color: '#000' },
  suggestionItem:     { padding: 14, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  suggestionText:     { fontSize: 13, color: '#444' },
  mapWrapper:         { height: 180, borderRadius: 18, overflow: 'hidden', marginTop: 10, elevation: 4 },
  map:                { flex: 1 },
  mapOverlay:         { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 10 },
  locationTitle:      { fontSize: 10, fontWeight: 'bold', color: 'darkturquoise' },
  locationSub:        { fontSize: 12, color: '#000' },
  locRow:             { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  locBtn:             { width: '48%', backgroundColor: 'white', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  locBtnText:         { fontSize: 13, fontWeight: '700' },
  activeSearchBtn:    { backgroundColor: '#343a40' },
  whiteText:          { color: 'white' },
  submitBtn:          { backgroundColor: 'darkturquoise', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  submitText:         { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
 
