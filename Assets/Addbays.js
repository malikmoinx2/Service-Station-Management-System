import React, { useState, useEffect,useContext } from 'react';
import {StyleSheet,View,Text,TextInput,TouchableOpacity, FlatList, SafeAreaView,ScrollView,StatusBar,ActivityIndicator,Alert,Switch} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const Addbays = () => {
   const { User } = useContext(UserContext);
  const [stations, setstations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStationId, setSelectedStationId] = useState(null); 
  const [bayName, setBayName] = useState(''); 
  const [description, setDescription] = useState(''); 
  const [bayType, setBayType] = useState('Without Lifter'); 
  const [status, setStatus] = useState(1); 

 useEffect(() => {
    fetchStationList();
  }, []);

  const fetchStationList = async () => {
    try {
      const url = `${BASE_URL}/Station/getstationlist/${User?.id}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.status === "success") {
        setstations(result.data); 
      } else {
        Alert.alert("Notice", "No stations found. Please add a station first.");
      }
    } catch (error) {
      console.error("API Error:", error);
      Alert.alert("Error", "Could not fetch station list");
    } finally {
      setLoading(false);
    }
  };
  const handleSaveBay = async () => {
  if (!selectedStationId || !bayName.trim()) {
    Alert.alert("Error", "Please select a station and enter bay name.");
    return;
  }
  const bayData = {
    BayName: bayName,
    BayType: bayType,
    Description: description,
    StationId: selectedStationId, 
    Status: status
  };

  try {
    const url =`${BASE_URL}/Station/addbay`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bayData)
    });

    const result = await response.json();

    if (result.status === "success") {
      Alert.alert("Success", "Bay added successfully!");
      setBayName('');
      setDescription('');
    } else {
      Alert.alert("Failed", result.message);
    }
  } catch (error) {
    Alert.alert("Error", "Server connection failed.");
  }
};
  
 const renderStationItem = ({ item }) => {
  const isSelected = selectedStationId === item.stationId;
  return (
    <TouchableOpacity
      style={[styles.chip, isSelected && styles.selectedChip]}
      onPress={() => setSelectedStationId(item.stationId)}
    >
      <Text style={[styles.chipText, isSelected && styles.whiteText]}>
        {item.stationName}
      </Text>
    </TouchableOpacity>
  );
};

  if (loading) {
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add New Bay</Text>
        <View style={styles.headerLine} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding}>
        <Text style={styles.label}>Select Station</Text>
        <FlatList
          horizontal
          data={stations}
          renderItem={renderStationItem}
          keyExtractor={item => item.stationId.toString()}
          showsHorizontalScrollIndicator={false}
          style={styles.list}
        />

        <Text style={styles.label}>Bay Name (e.g.Bay 1)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter bay name"
          value={bayName}
          onChangeText={setBayName}
        />

        <Text style={styles.label}>Bay Type</Text>
        <View style={styles.typeRow}>
          {['With Lifter', 'Without Lifter'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeBtn, bayType === type && styles.selectedTypeBtn]}
              onPress={() => setBayType(type)}
            >
              <Text style={[styles.typeBtnText, bayType === type && styles.whiteText]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Short description about this bay..."
          placeholderTextColor="grey"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.label}>Bay Status</Text>
            <Text style={styles.subLabel}>
              {status === 1 ? 'Available (Active)' : 'Under Maintenance (Inactive)'}
            </Text>
          </View>
          <Switch
            trackColor={{ false: 'silver', true: 'palegreen' }}
            thumbColor={status === 1 ? 'limegreen' : 'white'}
            onValueChange={(value) => setStatus(value ? 1 : 0)}
            value={status === 1}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={()=>handleSaveBay()}>
          <Text style={styles.saveButtonText}>Create Bay</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { padding: 20, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  headerLine: { height: 4, width: 30, backgroundColor: 'springgreen', marginTop: 5, borderRadius: 2 },
  scrollPadding: { padding: 20 },
   loadingText: { marginTop: 10, color: 'gray', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: 'dimgray', marginBottom: 8 },
  subLabel: { fontSize: 12, color: 'gray', marginTop: -5, marginBottom: 5 },
  list: { marginBottom: 25 },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'whitesmoke',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'lightgray'
  },
  selectedChip: { backgroundColor: 'springgreen', borderColor: 'springgreen' },
  chipText: { fontWeight: '600', color: 'gray' },
  whiteText: { color: 'white' },
  input: {
    backgroundColor: 'whitesmoke',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'lightgray',
    marginBottom: 20,
    fontSize: 15
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', marginBottom: 20 },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'whitesmoke',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'lightgray'
  },
  selectedTypeBtn: { backgroundColor: 'skyblue', borderColor: 'skyblue' },
  typeBtnText: { fontWeight: 'bold', fontSize: 12, color: 'gray' },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'aliceblue',
    padding: 15,
    borderRadius: 12,
    marginBottom: 30
  },
  saveButton: {
    backgroundColor: 'limegreen',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 4
  },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default Addbays;