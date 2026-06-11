import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, Alert, PermissionsAndroid, Dimensions, TextInput, FlatList } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { BASE_URL } from './Constants'; 

const { width, height } = Dimensions.get('window');

const directionmaps = ({ route }) => {
  const { bookingId } = route?.params || { bookingId: null }; 

  // States
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false); 
  
  const [customerLocation, setCustomerLocation] = useState(null);
  const [stationLocation, setStationLocation] = useState(null);
  
  const [stationName, setStationName] = useState('Fetching Station Address...');
  const [routeData, setRouteData] = useState({ coords: [], distance: 0, duration: 0 });
  
  // 🔥 Nominatim Autocomplete States
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  const mapRef = useRef(null);

  useEffect(() => {
    startupConfiguration();
    console.log("bookingid: " + bookingId);
  }, [bookingId]);

  const startupConfiguration = async () => {
    try {
      setLoading(true);
      const currentGPS = await getHardwareGPSLocation();
      setCustomerLocation(currentGPS);

      if (bookingId) {
        const stationCoords = await fetchStationCoordinates(bookingId);
        setStationLocation(stationCoords);
        await fetchAddressName(stationCoords);
      } else {
        setStationLocation({ latitude: 33.7077, longitude: 73.0500 });
      }

      animateMapToPoint(currentGPS.latitude, currentGPS.longitude);
    } catch (error) {
      Alert.alert("Location Error", error.message || "Failed to setup initial view.");
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const getHardwareGPSLocation = () => {
    return new Promise(async (resolve, reject) => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        reject(new Error("Permission denied."));
        return;
      }
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
        (error) => reject(new Error("Make sure GPS location services are turned ON.")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  const fetchStationCoordinates = async (id) => {
    try {
      const cleanId = parseInt(id, 10);
      const targetUrl = `${BASE_URL}/Customer/GetStationCoordinates/${cleanId}`;
      console.log("📡 Sending API Request to URL:", targetUrl);
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log(`🌐 HTTP Response Status: ${response.status} (${response.statusText})`);
      const responseText = await response.text();

      if (!responseText || responseText.trim() === "") {
        throw new Error("Server returned an completely EMPTY response body.");
      }

      const result = JSON.parse(responseText);

      if (result && result.status === "success" && result.data) {
        const lat = parseFloat(result.data.latitude);
        const lng = parseFloat(result.data.longitude);
        return { latitude: lat, longitude: lng };
      } else {
        throw new Error(result.message || "Database response status is not 'success'");
      }
    } catch (e) {
      console.error("💥 CRITICAL ERROR in fetchStationCoordinates:", e.message);
      return { latitude: 33.7077, longitude: 73.0500 }; 
    }
  };

  const fetchAddressName = async (location) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${location.latitude}&lon=${location.longitude}&format=json`,
        { headers: { 'User-Agent': 'ServiceAcCarApp/1.0' } }
      );
      const data = await response.json();
      if (data && data.display_name) {
        const addr = data.address.suburb || data.address.city || data.address.road || "Target Station";
        setStationName(addr);
      }
    } catch (e) {
      setStationName("Station Location");
    }
  };

  // 🔥 Nominatim Fetch Logic (Auto Complete)
  const handleInputChange = async (text) => {
    setSearchInput(text);
    if (text.length > 2) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&accept-language=en`,
          { headers: { 'User-Agent': 'ServiceAcCarApp/1.0' } }
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) { 
        console.error("Autocomplete Error:", error); 
      }
    } else { 
      setSuggestions([]); 
    }
  };

  // 🔥 Suggestion Selection Handler
  const handleSelectSuggestion = (item) => {
    const searchedCoords = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    };
    setCustomerLocation(searchedCoords);
    setSearchInput(item.display_name);
    setSuggestions([]); // List clear karein
    animateMapToPoint(searchedCoords.latitude, searchedCoords.longitude);
  };

  const animateMapToPoint = (lat, lng) => {
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.012, 
      longitudeDelta: 0.012,
    }, 1000);
  };

  const handleMapPress = (e) => {
    if (!isLocationConfirmed) {
      setCustomerLocation(e.nativeEvent.coordinate);
    }
  };

  const processRouteCalculation = async () => {
    if (!customerLocation || !stationLocation) return; 

    setNavigating(true);
    const url = `https://router.project-osrm.org/route/v1/driving/${customerLocation.longitude},${customerLocation.latitude};${stationLocation.longitude},${stationLocation.latitude}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.code === 'Ok') {
        const points = data.routes[0].geometry.coordinates.map(c => ({
          latitude: c[1],
          longitude: c[0]
        }));
        
        setRouteData({
          coords: points,
          distance: data.routes[0].distance / 1000,
          duration: data.routes[0].duration / 60
        });
        
        setIsLocationConfirmed(true);

        setTimeout(() => {
          mapRef.current?.fitToCoordinates([customerLocation, stationLocation], {
            edgePadding: { top: 140, right: 70, bottom: 300, left: 70 },
            animated: true
          });
        }, 400);

      } else {
        Alert.alert("Routing Mismatch", "Could not map a direct route path to station.");
      }
    } catch (e) {
      Alert.alert("Network Issue", "Failed to draw routing link.");
    } finally {
      setNavigating(false);
    }
  };

  const handleResetLocation = () => {
    setIsLocationConfirmed(false);
    setSearchInput('');
    setRouteData({ coords: [], distance: 0, duration: 0 });
    animateMapToPoint(customerLocation.latitude, customerLocation.longitude);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loaderText}>Loading Street Map Engine...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* 🧭 Custom Nominatim Free Autocomplete Input Panel */}
      {!isLocationConfirmed && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInputText}
              placeholder="🔍 Search street or area name..."
              placeholderTextColor="#8E8E93"
              value={searchInput}
              onChangeText={handleInputChange}
            />
          </View>
          
          {suggestions.length > 0 && (
            <View style={styles.searchResultList}>
              <FlatList
                data={suggestions}
                keyExtractor={(item, index) => index.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.searchRow} 
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <Text style={styles.searchDescription} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      )}

      {/* 🗺️ Main Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        onPress={handleMapPress}
        mapType="standard"
        showsUserLocation={true}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: customerLocation?.latitude || 33.6844,
          longitude: customerLocation?.longitude || 73.0479,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
      >
        {customerLocation && (
          <Marker 
            coordinate={customerLocation} 
            title={isLocationConfirmed ? "My Pick Location" : "Hold and drag me anywhere"}
            draggable={!isLocationConfirmed}
            onDragEnd={(e) => setCustomerLocation(e.nativeEvent.coordinate)}
          >
            <View style={styles.dotOrigin}><View style={styles.dotInner}/></View>
          </Marker>
        )}

        {stationLocation && isLocationConfirmed && (
          <Marker coordinate={stationLocation} title="Service Station Target">
            <View style={styles.dotDest} />
          </Marker>
        )}

        {isLocationConfirmed && routeData.coords.length > 0 && (
          <Polyline
            coordinates={routeData.coords}
            strokeWidth={6}
            strokeColor="#1d71f2" 
            lineCap="round"
          />
        )}
      </MapView>

      {/* Stats Panel */}
      {isLocationConfirmed && (
        <View style={styles.headerCard}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{routeData.distance.toFixed(1)}</Text>
            <Text style={styles.statLabel}>KM DISTANCE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.ceil(routeData.duration)}</Text>
            <Text style={styles.statLabel}>EST MINUTES</Text>
          </View>
        </View>
      )}

      {/* Bottom Sheet UI */}
      <View style={styles.bottomSheet}>
        <View style={styles.addressSection}>
          <Text style={styles.smallLabel}>TARGETED STATION DESTINATION</Text>
          <Text style={styles.mainAddress} numberOfLines={1}>{stationName}</Text>
          {!isLocationConfirmed && (
            <Text style={styles.hintText}>📍 Gali ya road par touch karke ya marker move karke correct point select karein.</Text>
          )}
        </View>

        {navigating ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.mainButton, isLocationConfirmed ? styles.btnRed : styles.btnBlack]} 
            onPress={isLocationConfirmed ? handleResetLocation : processRouteCalculation}
          >
            <Text style={styles.btnText}>
              {isLocationConfirmed ? "CHANGE START POINT" : "CONFIRM LOCATION & DRAW ROUTE"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { ...StyleSheet.absoluteFillObject },
  
  // 🔥 Customized Overlay Styles for Free Autocomplete
  searchContainer: { position: 'absolute', top: 55, left: 15, right: 15, zIndex: 999, elevation: 15 },
  searchInputWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  searchInputText: { height: 50, color: '#000', fontSize: 15, paddingHorizontal: 15 },
  searchResultList: { backgroundColor: '#FFF', borderRadius: 12, marginTop: 5, elevation: 10, maxHeight: 240, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  searchRow: { padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  searchDescription: { color: '#333', fontSize: 14 },

  headerCard: { position: 'absolute', top: 130, left: 20, right: 20, backgroundColor: '#FFFFFF', borderRadius: 20, flexDirection: 'row', padding: 15, elevation: 10, shadowOpacity: 0.1, shadowRadius: 10, shadowColor: '#000' },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  statLabel: { fontSize: 9, color: '#8E8E93', fontWeight: 'bold', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#EEE', height: '100%' },
  dotOrigin: { width: 26, height: 26, backgroundColor: '#007AFF', borderRadius: 13, borderWidth: 3, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  dotInner: { width: 6, height: 6, backgroundColor: '#FFF', borderRadius: 3 },
  dotDest: { width: 26, height: 26, backgroundColor: '#FF3B30', borderRadius: 13, borderWidth: 3, borderColor: '#FFF', elevation: 5 },
  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 35, elevation: 25 },
  addressSection: { marginBottom: 20 },
  smallLabel: { fontSize: 10, color: '#8E8E93', fontWeight: 'bold' },
  mainAddress: { fontSize: 18, fontWeight: '700', color: '#000', marginTop: 4 },
  hintText: { fontSize: 12, color: '#007AFF', marginTop: 6, fontWeight: '500' },
  mainButton: { height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnBlack: { backgroundColor: '#000' },
  btnRed: { backgroundColor: '#FF3B30' },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loaderText: { marginTop: 12, fontSize: 14, color: '#555', fontWeight: '500' }
});

export default directionmaps;