import React, { useState, useRef, useEffect, useContext } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { UserContext } from './UserContext';

const directionmap = () => {
  const { usercoordinate, destinationcoordinate } = useContext(UserContext);
  
  const userLat = usercoordinate?.userlatitude || 33.6844; 
  const userLog = usercoordinate?.userlongitude || 73.0479;
  const destLat = destinationcoordinate?.destinationlatitude || 33.7077;
  const destLog = destinationcoordinate?.destinationlongitude || 73.0500;

  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('Locating Station...');
  const [routeData, setRouteData] = useState({ coords: [], distance: 0, duration: 0 });
  const mapRef = useRef(null);

  // Dynamic coordinates object
  const coords = {
    origin: { latitude: parseFloat(userLat), longitude: parseFloat(userLog) },
    destination: { latitude: parseFloat(destLat), longitude: parseFloat(destLog) },
  };

  // --- Update Address when destination changes ---
  useEffect(() => {
    if (destLat && destLog) {
      fetchAddressName(coords.destination);
        console.log("destionation"+destinationcoordinate?.destinationlatitude+destinationcoordinate?.destinationlongitude)
        console.log("origin"+usercoordinate?.userlatitude+usercoordinate?.userlongitude)
      // Auto-focus map on the new destination
      mapRef.current?.animateToRegion({
        ...coords.destination,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [destinationcoordinate]);

  const fetchAddressName = async (location) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${location.latitude}&lon=${location.longitude}&format=json`,
        { headers: { 'User-Agent': 'TravelApp/1.0' } }
      );
      const data = await response.json();
      if (data && data.display_name) {
        // Address ko chota karne ke liye suburb ya city uthayen
        const addr = data.address.suburb || data.address.city || data.address.road || "Selected Station";
        setAddress(addr);
      }
    } catch (e) {
      setAddress("Station Location");
    }
  };

  const handleNavigation = async () => {
    if (isActive) {
      setIsActive(false);
      setRouteData({ coords: [], distance: 0, duration: 0 });
      return;
    }

    setLoading(true);
    // OSRM API for routing
    const url = `https://router.project-osrm.org/route/v1/driving/${coords.origin.longitude},${coords.origin.latitude};${coords.destination.longitude},${coords.destination.latitude}?overview=full&geometries=geojson`;

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
        setIsActive(true);

        // Fit map to show full route
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(points, {
            edgePadding: { top: 80, right: 50, bottom: 300, left: 50 },
            animated: true
          });
        }, 500);
      } else {
        Alert.alert("Route Error", "Could not find a driving route to this station.");
      }
    } catch (e) {
      Alert.alert("Error", "Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  // --- UI Components ---
  const HeaderStats = () => (
    isActive && (
      <View style={styles.headerCard}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{routeData.distance.toFixed(1)}</Text>
          <Text style={styles.statLabel}>KM</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{Math.ceil(routeData.duration)}</Text>
          <Text style={styles.statLabel}>MINS</Text>
        </View>
      </View>
    )
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          ...coords.origin,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={mapTheme}
      >
        {/* User Current Location Marker */}
        <Marker coordinate={coords.origin} title="My Location">
          <View style={styles.dotOrigin}><View style={styles.dotInner}/></View>
        </Marker>

        {/* Station Destination Marker */}
        <Marker coordinate={coords.destination} title="Station Location">
          <View style={styles.dotDest} />
        </Marker>

        {/* Draw Route Line */}
        {isActive && (
          <Polyline
            coordinates={routeData.coords}
            strokeWidth={5}
            strokeColor="#007AFF"
            lineCap="round"
          />
        )}
      </MapView>

      <HeaderStats />

      {/* Bottom Information Panel */}
      <View style={styles.bottomSheet}>
        <View style={styles.addressSection}>
          <Text style={styles.smallLabel}>DESTINATION STATION</Text>
          <Text style={styles.mainAddress} numberOfLines={1}>{address}</Text>
        </View>

        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.mainButton, isActive ? styles.btnRed : styles.btnBlack]} 
          onPress={handleNavigation}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>{isActive ? "END TRIP" : "START JOURNEY"}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { ...StyleSheet.absoluteFillObject },
  headerCard: {
    position: 'absolute', top: 50, left: 20, right: 20,
    backgroundColor: '#FFFFFF', borderRadius: 20, flexDirection: 'row',
    padding: 15, elevation: 10, shadowOpacity: 0.1, shadowRadius: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 },
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  statLabel: { fontSize: 10, color: '#8E8E93', fontWeight: 'bold' },
  divider: { width: 1, backgroundColor: '#EEE', height: '100%' },
  dotOrigin: { width: 22, height: 22, backgroundColor: '#007AFF', borderRadius: 11, borderWidth: 3, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  dotInner: { width: 6, height: 6, backgroundColor: '#FFF', borderRadius: 3 },
  dotDest: { width: 22, height: 22, backgroundColor: '#FF3B30', borderRadius: 11, borderWidth: 3, borderColor: '#FFF' },
  bottomSheet: {
    position: 'absolute', bottom: 0, width: '100%',
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 25, paddingBottom: 35, elevation: 25, shadowColor: '#000', shadowOpacity: 0.2
  },
  addressSection: { marginBottom: 20 },
  smallLabel: { fontSize: 10, color: '#8E8E93', fontWeight: 'bold' },
  mainAddress: { fontSize: 18, fontWeight: '700', color: '#000', marginTop: 4 },
  mainButton: { height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnBlack: { backgroundColor: '#000' },
  btnRed: { backgroundColor: '#FF3B30' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

const mapTheme = [{"elementType": "geometry", "stylers": [{"color": "#f5f5f5"}]}, {"featureType": "road", "elementType": "geometry", "stylers": [{"color": "#ffffff"}]}, {"featureType": "poi", "stylers": [{"visibility": "off"}]}];

export default directionmap;