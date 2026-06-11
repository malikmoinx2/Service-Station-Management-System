import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, StatusBar, TouchableOpacity, Switch, Alert
} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const Mybays = ({navigation}) => {
  const { User,setbaydata } = useContext(UserContext);
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState( );
  const [bays, setBays] = useState([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingBays, setLoadingBays] = useState(false);

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const response = await fetch(`${BASE_URL}/Station/getstationlist/${User?.id}`);
      const result = await response.json();
      if (result.status === "success") {
        setStations(result.data);
        if (result.data.length > 0) {
          const firstId = result.data[0].stationId;
          setSelectedStationId(firstId);
          fetchBays(firstId);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Stations loaing failed Please Check Your Connection");
    } finally {
      setLoadingStations(false);
    }
  };


  const fetchBays = async (id) => {
    setLoadingBays(true);
    try {
      const response = await fetch(`${BASE_URL}/Station/getbaysbystation/${id}`);
      const result = await response.json();
      if (result.status === "success") {
        setBays(result.data);
        console.log(result.data)
      } else {
        setBays([]);
      }
    } catch (error) {
      setBays([]);
    } finally {
      setLoadingBays(false);
    }
  };

  const handleStationPress = (id) => {
    setSelectedStationId(id);
    fetchBays(id);
  };
 const Deletebays = (Id) => {
       Alert.alert(
         "Delete Bay",
         "This will permanently delete your bay data. Are you sure?",
         [
           { text: "Cancel", style: "cancel" },
           { text: "Delete", style: "destructive", onPress: () => handleDeleteBays(Id)}
         ]
       );
     };
 
 const handleDeleteBays = async (bayId) => {
           try {
             const response = await fetch(`${BASE_URL}/Station/deletebay/${bayId}`, {
               method: 'DELETE',
               headers: { 'Content-Type': 'application/json' }
             });
             const result = await response.json();
 
             if (result.status === "success") {
               Alert.alert("Deleted", "Service has been removed.");
               fetchBays(selectedStationId);
             } else {
               Alert.alert("Error", result.message || "Failed to delete");
             }
           } catch (error) {
             console.log("Delete Error:", error);
             Alert.alert("Error", "Server connection failed");
           }
          }

  const renderStationChip = ({ item }) => {
    const isSelected = item.stationId === selectedStationId;
    return (
      <TouchableOpacity
        style={[styles.chip, isSelected && styles.selectedChip]}
        onPress={() => handleStationPress(item.stationId)}
      >
        <Text style={[styles.chipText, isSelected && styles.whiteText]}>
          {item.stationName}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBayItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        
        <View style={styles.infoSection}>
          <Text style={styles.bayName}>{item.bayName}</Text>
          
          <View style={styles.stationRow}>
            <Text style={styles.stationLabel}>Type: </Text>
            <Text style={styles.stationName}>{item.bayType}</Text>
          </View>

          {/* ✅ Services Section: Yahan hum list of services show kar rahe hain */}
          <View style={styles.servicesContainer}>
            {item.services && item.services.length > 0 ? (
              item.services.map((svc, index) => (
                <View key={index} style={styles.serviceBadge}>
                  <Text style={styles.serviceBadgeText}>{svc.serviceName}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noServiceText}>No services linked</Text>
            )}
          </View>

          <Text style={styles.descText} numberOfLines={2}>
            {item.description || "No description available"}
          </Text>
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: 'aliceblue' }]} 
              onPress={() => {setbaydata(item); navigation.navigate('updatebays');}}
            >
              <Text style={{ fontSize: 16 }}>✏️</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: 'mistyrose' }]} 
              onPress={()=>Deletebays(item.bayId)}
            >
              <Text style={{ fontSize: 16 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  if (loadingStations) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
            <ActivityIndicator size="large" color="deepskyblue" />
            <Text style={{ marginTop: 12, color: 'gray', fontWeight: 'bold' }}>Fetching Stations...</Text>
          </View>
        );
      }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Station Bays</Text>
      </View>

      {/* Horizontal Stations List */}
      <View style={styles.stationListWrapper}>
        <FlatList
          horizontal
          data={stations}
          renderItem={renderStationChip}
          keyExtractor={(item) => item.stationId.toString()}
          showsHorizontalScrollIndicator={false}
          extraData={selectedStationId}
          contentContainerStyle={{ paddingHorizontal: 15 }}
        />
      </View>

      {/* Bays Vertical List */}
      {loadingBays ? (
        <ActivityIndicator size="large" color="deepskyblue" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={bays}
          renderItem={renderBayItem}
          keyExtractor={(item) => item.bayId.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No bays found for this station.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'whitesmoke' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'black' },
  
  
  stationListWrapper: { paddingVertical: 15, backgroundColor: '#fff' },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'whitesmoke',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'lightgray'
  },
  selectedChip: { backgroundColor: 'deepskyblue', borderColor: 'deepskyblue' },
  chipText: { fontWeight: '600', color: 'gray' },
  whiteText: { color: 'white' },

  listContainer: { padding: 15 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: 'whitesmoke', elevation: 4, shadowColor: 'black', shadowOpacity: 0.1, shadowRadius: 10 },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between' },
  infoSection: { flex: 1 },
  bayName: { fontSize: 18, fontWeight: 'bold', color: 'black' },
  stationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stationLabel: { fontSize: 12, color: 'gray' },
  stationName: { fontSize: 13, color: 'black', fontWeight: '600' },
  descText: { fontSize: 11, color: 'gray', marginTop: 5 },
  actionSection: { alignItems: 'flex-end', justifyContent: 'space-between' },
  switchRow: { alignItems: 'center' },
  statusLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  buttonRow: { flexDirection: 'row', marginTop: 15 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  emptyText: { textAlign: 'center', marginTop: 40, color: 'gray' },
  // Existing styles ke sath ye add karein
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Agar zyada services hon to agli line mein aa jayen
    marginTop: 8,
    marginBottom: 5
  },
  serviceBadge: {
    backgroundColor: '#E3F2FD', // Light blue background
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#BBDEFB'
  },
  serviceBadgeText: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: 'bold',
    textTransform: 'capitalize'
  },
  noServiceText: {
    fontSize: 11,
    color: '#ff8a80', // Light red for alert
    fontStyle: 'italic',
    marginTop: 5
  },
  descText: { 
    fontSize: 12, 
    color: 'gray', 
    marginTop: 5,
    lineHeight: 16 
  },
});

export default Mybays;