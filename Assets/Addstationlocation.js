import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { TextInput } from "react-native-paper";
import MapView, { Marker } from "react-native-maps";
import Geocoder from "react-native-geocoding";
import { Dropdown } from "react-native-element-dropdown";

// Initialize Geocoding API
Geocoder.init("AIzaSyCdmIHvKSHu-vKEeN0hcvjQrOtr8row6qE");

export default function AddstationlocationInfo({navigation}) {
  const cities = [ 
    { label: "Islamabad", value: "Islamabad" },
    { label: "Rawalpindi", value: "Rawalpindi" },
    { label: "Lahore", value: "Lahore" },
    { label: "Karachi", value: "Karachi" },
    { label: "Peshawar", value: "Peshawar" },
    { label: "Quetta", value: "Quetta" },
    { label: "Multan", value: "Multan" },
    { label: "Faisalabad", value: "Faisalabad" },
    { label: "Sialkot", value: "Sialkot" },
  ];

  const [city, setCity] = useState(""); // Selected city
  const [fullAddress, setFullAddress] = useState(""); // Address input
  const [coordinates, setCoordinates] = useState(null); // Confirmed coordinates

  const [markerCoords, setMarkerCoords] = useState({
    latitude: 33.6844, 
    longitude: 73.0479, 
  });

  // ✅ Request Location Permission (Android)
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    };
  
    // ✅ Get Current Location
    const getCurrentLocation = async () => {
      setSelectMode(false);
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        alert('Location permission denied');
        return;
      }
  
      Geolocation.getCurrentPosition(
        position => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);
          setSelectedLocation(null);
          setDirectionTarget(null); // reset
        },
        error => alert(error.message),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    };
  

  const mapRef = useRef(null); // Map reference for animation

  // Fetch coordinates from address and move marker
  const locateAddress = async () => {
    if (!fullAddress) {
      alert("Please enter full address!");
      return;
    }

    try {
      const geo = await Geocoder.from(fullAddress);
      if (geo.results.length > 0) {
        const location = geo.results[0].geometry.location;
        const newCoords = {
          latitude: location.lat,
          longitude: location.lng,
        };
        setMarkerCoords(newCoords);

        // Animate map to the new location
        mapRef.current.animateToRegion(
          {
            ...newCoords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000
        );

        Alert.alert("Marker moved to entered address");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      Alert.alert("Unable to find location. Please check the address.");
    }
  };

  const confirmLocation = () => {
    setCoordinates(markerCoords);
    Alert.alert(
      "Location Confirmed",
      `Coordinates saved:\nLat: ${markerCoords.latitude.toFixed(
        6
      )}, Lon: ${markerCoords.longitude.toFixed(6)}`
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add Station</Text>
      <Text style={styles.subtitle}>Location Info</Text>

      {/* Styled Dropdown */}
      <View style={styles.dropdownWrapper}>
        <Text style={styles.dropdownLabel}>Select City</Text>
        <Dropdown
          style={styles.dropdown}
          placeholderStyle={{ color: "grey" }}
          selectedTextStyle={{ color: "#000" }}
          data={cities}
          labelField="label"
          valueField="value"
          placeholder="Select City"
          value={city}
          onChange={(item) => setCity(item.value)}
        />
      </View>

      {/* Address input */}
      <TextInput
        label="Full Address"
        mode="outlined"
        value={fullAddress}
        onChangeText={setFullAddress}
        style={styles.input}
      />

      {/* Button to locate address on map */}
      <TouchableOpacity style={styles.mapBtn} onPress={()=>navigation.navigate('successfullyregister')}>
        <Text style={styles.mapBtnText}>📍 Locate Address on Map</Text>
      </TouchableOpacity>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: markerCoords.latitude,
          longitude: markerCoords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={(e) => setMarkerCoords(e.nativeEvent.coordinate)}
      >
        <Marker
          coordinate={markerCoords}
          draggable
          onDragEnd={(e) => setMarkerCoords(e.nativeEvent.coordinate)}
        />
      </MapView>

      {/* Confirm Location button */}
      <TouchableOpacity style={styles.mapBtn} onPress={()=>navigation.navigate('successfullyregister')}>
        <Text style={styles.mapBtnText}>✅ Confirm Location</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#E8F9F6",
  },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#4EC5C1", marginBottom: 20 },
  dropdownWrapper: {
    width: "90%",
    marginBottom: 20,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4EC5C1",
    paddingHorizontal: 10,
    height: 50,
  },
  input: { width: "90%", marginBottom: 15, backgroundColor: "#fff" },
  mapBtn: {
    width: "90%",
    backgroundColor: "#B8E4E2",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  mapBtnText: { color: "#333", fontWeight: "600" },
  map: {
    width: "90%",
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
  },
});
