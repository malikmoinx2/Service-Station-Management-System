import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const Mystations = ({ navigation }) => {
  const { User, setstationdata } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null); // State for Full Screen Image

  const serverUrl = BASE_URL.replace('/api', '');

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const url = `${BASE_URL}/Station/GetStationsByOwners/${User?.id}`; 
      const response = await fetch(url);
      const result = await response.json();

      if (result.status === "success") {
        setStations(result.data);
        console.log(result.data)
      } else {
        Alert.alert("Notice", "No stations found.");
      }
    } catch (error) {
      Alert.alert("Error", "Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  const DeleteStation = (Id) => {
    Alert.alert(
      "Delete Station",
      "This will permanently delete your Station data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDeleteStation(Id) }
      ]
    );
  };

  const handleDeleteStation = async (stationId) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/Station/deletestation/${stationId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.status === "success") {
        Alert.alert("Success", "Station deleted successfully.");
        fetchStations();
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      console.error("Delete Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStationItem = ({ item }) => {
    const isOpen = item.status === 1;
    const imageUri = !item.imagePath 
      ? 'https://via.placeholder.com/150' 
      : item.imagePath.startsWith('http') 
        ? item.imagePath 
        : `${serverUrl}/station_images/${item.imagePath}?t=${Date.now()}`;

    return (
      <View style={styles.card}>
        <View style={[styles.statusBadge, { backgroundColor: isOpen ? 'green' : 'red' }]}>
          <Text style={styles.statusText}>{isOpen ? 'Open' : 'Close'}</Text>
        </View>

        <View style={styles.topSection}>
          <View>
            {/* ✅ Clickable Image for Full Screen View */}
            <TouchableOpacity onPress={() => setSelectedImage(imageUri)}>
              <Image 
                source={{ uri: imageUri }} 
                style={styles.profileImage} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.ratingButton} 
              onPress={() => navigation.navigate('displaybookingreview', { item })}
            >
              <Text style={styles.ratingText}>⭐ {item.averageRating ? Number(item.averageRating).toFixed(1) : '0.0'}</Text>
              <Text style={styles.reviewerText}>({item.reviewerCount || 0})</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.stationName}>{item.stationName}</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>📞 </Text>
              <Text style={styles.value}>{item.contact}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>📧 </Text>
              <Text style={styles.value} numberOfLines={1}>{item.email || 'N/A'}</Text>
            </View>
              
            <Text style={styles.addressText} numberOfLines={2}>🏡 {item.address}</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: 'green' }]} 
            onPress={() => { setstationdata(item); navigation.navigate('UpdateStation'); }}
          >
            <Text style={styles.buttonText}>UPDATE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'red' }]}
            onPress={() => DeleteStation(item.stationId)}
          >
            <Text style={styles.buttonText}>DELETE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Stations</Text>
        <View style={styles.line} />
      </View>

      <FlatList
        data={stations}
        renderItem={renderStationItem}
        keyExtractor={(item) => item.stationId.toString()}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No stations available.</Text>}
        showsVerticalScrollIndicator={false}
      />

      {/* ✅ Full Screen Image Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedImage(null)}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} resizeMode="contain" />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'ghostwhite' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, alignItems: 'center', backgroundColor: 'white', elevation: 2 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'black' },
  line: { height: 3, width: 40, backgroundColor: 'green', marginTop: 5, borderRadius: 2 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 4,
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    zIndex: 1,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  topSection: { flexDirection: 'row' },
  profileImage: { width: 90, height: 90, borderRadius: 10, backgroundColor: 'lightgrey' },
  
  ratingButton: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'grey',
  },
  ratingText: { color: 'gold', fontSize: 11, fontWeight: 'bold' },
  reviewerText: { color: 'white', fontSize: 9, marginLeft: 3 },

  infoContainer: { flex: 1, marginLeft: 15 },
  stationName: { fontSize: 18, fontWeight: 'bold', color: 'darkslategrey', marginBottom: 5, paddingRight: 45 },
  detailRow: { flexDirection: 'row', marginBottom: 2 },
  label: { fontSize: 13, fontWeight: 'bold', color: 'grey' },
  value: { fontSize: 13, color: 'black' },
  addressText: { fontSize: 12, color: 'grey', marginTop: 5, fontStyle: 'italic' },
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 15, 
    borderTopWidth: 1, 
    borderTopColor: 'whitesmoke', 
    paddingTop: 12 
  },
  actionButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, marginLeft: 10 },
  buttonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: 'grey' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: '100%', height: '80%' },
  closeModalBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 },
  closeIcon: { fontSize: 30, color: 'white', fontWeight: 'bold' },
});

export default Mystations;