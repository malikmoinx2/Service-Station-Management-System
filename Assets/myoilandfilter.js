import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, 
  SafeAreaView, StatusBar, Modal, ActivityIndicator, Alert 
} from 'react-native';

import { UserContext } from "./UserContext"; // Path check kar lein
import { BASE_URL } from "./Constants";

export default function myoilandfilter({ navigation }) {
  const { User } = useContext(UserContext);
  
  // States
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [itemType, setItemType] = useState('Oil'); // 'Oil' or 'Filter'
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);


  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      fetchInventory();
    }
  }, [selectedStation, itemType]);

  const fetchStations = async () => {
    try {
      const res = await fetch(`${BASE_URL}/Station/getstationlist/${User?.id}`);
      const result = await res.json();
      if (result.status === "success") {
        setStations(result.data);
        if (result.data.length > 0) {
          setSelectedStation(result.data[0].stationId); 
        }
      }
    } catch (error) {
      console.error("Stations Fetch Error:", error);
    }
  };

  const fetchInventory = async () => {
  if (!selectedStation) return;
  
  setLoading(true);
  try {
    
    const endpoint = itemType === 'Oil' 
      ? `/Station/GetOilsByStation/${selectedStation}` 
      : `/Station/GetFiltersByStation/${selectedStation}`;

    const response = await fetch(`${BASE_URL}${endpoint}`);
    const result = await response.json();

    if (result.status === "success") {
      setInventory(result.data);
      console.log(result.data)
    } else {
      setInventory([]);
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    Alert.alert("Network Error", "Could not connect to server");
  } finally {
    setLoading(false);
  }
};

  const handleDelete = (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: () => deleteItem(id) 
      }
    ]);
  };

  const deleteItem = async (id) => {
    try {
      const endpoint = itemType === 'Oil' ? `/Station/DeleteOil/${id}` : `/Station/DeleteFilter/${id}`;
      const res = await fetch(`${BASE_URL}${endpoint}`, 
        { method: 'DELETE' });
      const result = await res.json();

      if (res.ok) {
        Alert.alert("Success", "Item deleted successfully");
        console.log(res.ok)
        fetchInventory(); 
      } else {
        Alert.alert("Error", result.message || "Could not delete");
      }
    } catch (error) {
      Alert.alert("Error", "Server connection failed");
    }
  };

  const renderInventoryItem = ({ item }) => {

 const  currentStationObj = stations.find(s => s.stationId === selectedStation);
 const  stationame = currentStationObj ? currentStationObj.stationName : "Unknown Station";
  return(
    <View style={styles.card}>
      <View style={[styles.cardIndicator, { backgroundColor: itemType === 'Oil' ? '#32D74B' : '#FF9500' }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemName}>
            {itemType === 'Oil' ? item.oilName : item.filterName}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.brand}</Text>
          </View>
        </View>

        <Text style={styles.itemSpecs}>
          {itemType === 'Oil'  ? `Viscosity: ${item.viscosity} | Cap: ${item.capacity}` 
            : `Model: ${item.vehicleModel} | Part: ${item.partNumber}`}
        </Text>
        <Text style={styles.itemSpecs}> Price:{item.price||0}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.btn, styles.editBtn]}
            onPress={() => navigation.navigate('updateoilandfilter', { item, type: itemType,sId:selectedStation,sName:stationame })}
          >
            <Text style={styles.btnText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.btn, styles.deleteBtn]}
            onPress={() => handleDelete(itemType === 'Oil' ? item.oilId : item.filterId)}
          >
            <Text style={styles.btnText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory Manager</Text>
        <Text style={styles.label}>SELECT STATION</Text>
        <FlatList
          data={stations}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.chip, selectedStation === item.stationId && styles.activeChip]}
              onPress={() => setSelectedStation(item.stationId)}
            >
              <Text style={[styles.chipText, selectedStation === item.stationId && styles.activeChipText]}>
                {item.stationName}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.stationId.toString()}
        />
      </View>

      
      <View style={styles.filterSection}>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowPicker(true)}>
          <View style={styles.row}>
            <Text style={styles.dropdownEmoji}>{itemType === 'Oil' ? "🛢️" : "🔧"}</Text>
            <Text style={styles.dropdownBtnText}>
               {itemType === 'Oil' ? "Oil Inventory" : "Filter Inventory"}
            </Text>
          </View>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* INVENTORY LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#32D74B" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={inventory}
          renderItem={renderInventoryItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text style={styles.emptyText}>No {itemType} found for this station.</Text>
            </View>
          }
        />
      )}

      
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Category</Text>
            <TouchableOpacity style={styles.modalItem} onPress={() => {setItemType('Oil'); setShowPicker(false);}}>
              <Text style={styles.modalText}>🛢️ Oil Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalItem} onPress={() => {setItemType('Filter'); setShowPicker(false);}}>
              <Text style={styles.modalText}>🔧 Filter Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles remains the same as your design...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15,marginLeft:80 },
  label: { fontSize: 10, fontWeight: '800', color: '#A0A0A0', letterSpacing: 1, marginBottom: 8 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 15, backgroundColor: '#F0F0F0', marginRight: 10 },
  activeChip: { backgroundColor: '#32D74B' },
  chipText: { fontWeight: '600', color: '#666' },
  activeChipText: { color: '#fff' },
  filterSection: { paddingHorizontal: 20, marginTop: 15 },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, elevation: 2 },
  dropdownEmoji: { fontSize: 20, marginRight: 10 },
  dropdownBtnText: { fontSize: 16, fontWeight: '700', color: '#333' },
  arrow: { color: '#CCC', fontSize: 12 },
  listContainer: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  cardIndicator: { width: 6 },
  cardContent: { flex: 1, padding: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', flex: 1 },
  badge: { backgroundColor: '#E8F9ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, color: '#32D74B', fontWeight: 'bold' },
  itemSpecs: { color: '#8E8E93', fontSize: 13, marginTop: 5, marginBottom: 15 },
  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  editBtn: { backgroundColor: '#F2F2F7', marginRight: 10 },
  deleteBtn: { backgroundColor: '#FFF0F0' },
  btnText: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalItem: { padding: 18, alignItems: 'center', backgroundColor: '#F8F9FB', borderRadius: 15, marginBottom: 10 },
  modalText: { fontSize: 16, fontWeight: '600' },
  cancelBtn: { padding: 15, marginTop: 5 },
  cancelText: { textAlign: 'center', color: 'red', fontWeight: 'bold' },
  emptyText: { color: '#8E8E93', fontSize: 14 }
});