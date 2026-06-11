import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, FlatList, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown'; 

import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

export default function Addoilandfilter({ navigation }) {
  const { User } = useContext(UserContext);
  const [selectedStations, setSelectedStations] = useState([]);
  const [loading, setloading] = useState(true);
  const [itemType, setItemType] = useState('Oil');
  const [stations, setstations] = useState([]);

  // --- COMMON STATE ---
  const [price, setPrice] = useState(''); // Price state for both

  // --- OIL STATES ---
  const [oilname, setoilname] = useState('');
  const [oilbrand, setoilbrand] = useState('');
  const [viscosity, setviscosity] = useState('5W-30');
  const [capacity, setcapacity] = useState('4L');
  const [Enginetype, setEnginetype] = useState('Petrol');

  // --- FILTER STATES ---
  const [filtername, setfiltername] = useState('');
  const [filterbrand, setfilterbrand] = useState('');
  const [vehiclemodel, setvehiclemodel] = useState('');
  const [partnumber, setpartnumber] = useState('');

  const engineData = [
    { label: 'Petrol', value: 'Petrol' },
    { label: 'Diesel', value: 'Diesel' },
    { label: 'Hybrid', value: 'Hybrid' },
    { label: 'Electric', value: 'Electric' },
  ];

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      setloading(true);
      const stationUrl = `${BASE_URL}/Station/getstationlist/${User?.id}`;
      const stationRes = await fetch(stationUrl);
      const stationResult = await stationRes.json();
      if (stationResult.status === "success") {
        setstations(stationResult.data);
      }
    } catch (error) {
      console.error("Fetch Stations Error:", error);
    } finally {
      setloading(false);
    }
  };

  const handleAdd = async () => {
    if (selectedStations.length === 0) {
      Alert.alert("Selection Required", "Please select at least one station.");
      return;
    }

    if (!price || isNaN(price)) {
      Alert.alert("Invalid Price", "Please enter a valid numeric price.");
      return;
    }

    setloading(true);

    try {
      if (itemType === 'Oil') {
        if (!oilname) {
          Alert.alert("Missing Info", "Please enter Oil Name");
          setloading(false);
          return;
        }

        const oilBody = {
          OilName: oilname,
          Brand: oilbrand,
          Viscosity: viscosity,
          EngineType: Enginetype,
          Capacity: capacity,
          Price: parseFloat(price), // Price included
          StationId: selectedStations, 
        };

        const res = await fetch(`${BASE_URL}/Station/AddOil`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(oilBody),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Oil update failed");
        Alert.alert("Success", "Oil added successfully!");

      } else {
        if (!filtername) {
          Alert.alert("Missing Info", "Please enter Filter Name");
          setloading(false);
          return;
        }

        const filterBody = {
          FilterName: filtername,
          Brand: filterbrand,
          VehicleModel: vehiclemodel,
          PartNumber: partnumber,
          Price: parseFloat(price) || 0, // Price included
          StationId: selectedStations,
        };

        const res = await fetch(`${BASE_URL}/Station/AddFilter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filterBody),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Filter update failed");
        Alert.alert("Success", "Filter added successfully!");
      }

      clearForm();

    } catch (error) {
      console.error("API Error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setloading(false);
    }
  };

  const clearForm = () => {
    setoilname('');
    setoilbrand('');
    setfiltername('');
    setfilterbrand('');
    setPrice(''); // Clear price
    setvehiclemodel('');
    setpartnumber('');
  };

  const toggleStation = (id) => {
    setSelectedStations(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderStationItem = ({ item }) => {
    const isSelected = selectedStations.includes(item.stationId);
    return (
      <TouchableOpacity style={[styles.stationChip, isSelected && styles.stationSelected]} onPress={() => toggleStation(item.stationId)}>
        <Text style={[styles.stationText, isSelected && styles.stationTextSelected]}>{item.stationName}</Text>
        {isSelected && <Text style={styles.checkIcon}>✓</Text>}
      </TouchableOpacity>
    );
  };

  if (loading && stations.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="deepskyblue" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Update Inventory</Text>
        <View style={styles.headerLine} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          
          <View style={styles.topSection}>
            <Text style={styles.sectionLabel}>Select Stations</Text>
            <FlatList data={stations} renderItem={renderStationItem} keyExtractor={item => item.stationId.toString()} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stationList} />
          </View>

          <View style={styles.toggleWrapper}>
            <View style={styles.toggleBox}>
              <TouchableOpacity style={[styles.toggleBtn, itemType === 'Oil' && styles.activeToggle]} onPress={() => { setItemType('Oil'); clearForm(); }}>
                <Text style={[styles.toggleBtnText, itemType === 'Oil' && styles.activeText]}>🛢️ Oil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, itemType === 'Filter' && styles.activeToggle]} onPress={() => { setItemType('Filter'); clearForm(); }}>
                <Text style={[styles.toggleBtnText, itemType === 'Filter' && styles.activeText]}>🔧 Filter</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formPadding}>
            <View style={styles.card}>
              <Text style={styles.formTitle}>Add New {itemType}</Text>
              
              {itemType === 'Oil' ? (
                <View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Oil Name</Text>
                    <TextInput style={styles.input} placeholder="e.g. Shell Helix" value={oilname} onChangeText={setoilname} placeholderTextColor="silver" />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Brand</Text>
                    <TextInput style={styles.input} placeholder="e.g. Shell" value={oilbrand} onChangeText={setoilbrand} placeholderTextColor="silver" />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, {flex: 1, marginRight: 12}]}>
                      <Text style={styles.label}>Viscosity</Text>
                      <TextInput style={styles.input} value={viscosity} onChangeText={setviscosity} placeholderTextColor="silver" />
                    </View>
                    <View style={[styles.inputGroup, {flex: 1}]}>
                      <Text style={styles.label}>Capacity</Text>
                      <TextInput style={styles.input} value={capacity} onChangeText={setcapacity} placeholderTextColor="silver" />
                    </View>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Engine Type</Text>
                    <Dropdown
                      style={styles.dropdown}
                      data={engineData}
                      labelField="label"
                      valueField="value"
                      placeholder="Select Engine Type"
                      value={Enginetype}
                      onChange={item => setEnginetype(item.value)}
                      placeholderStyle={{ color: 'silver' }}
                      selectedTextStyle={{ color: 'black' }}
                    />
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Filter Name</Text>
                    <TextInput style={styles.input} value={filtername} onChangeText={setfiltername} placeholderTextColor="silver" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Brand</Text>
                    <TextInput style={styles.input} value={filterbrand} onChangeText={setfilterbrand} placeholderTextColor="silver" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Vehicle Model</Text>
                    <TextInput style={styles.input} value={vehiclemodel} onChangeText={setvehiclemodel} placeholderTextColor="silver" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Part Number</Text>
                    <TextInput style={styles.input} value={partnumber} onChangeText={setpartnumber} placeholderTextColor="silver" />
                  </View>
                </View>
              )}

              {/* COMMON PRICE INPUT */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price (PKR)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. 5500" 
                  value={price} 
                  onChangeText={setPrice} 
                  keyboardType="numeric" 
                  placeholderTextColor="silver" 
                />
              </View>

              <TouchableOpacity 
                style={[styles.submitBtn, (selectedStations.length === 0 || !price) && styles.disabledBtn]} 
                onPress={()=>handleAdd()}
                disabled={selectedStations.length === 0 || !price}
              >
                <Text style={styles.submitBtnText}>UPDATE {selectedStations.length} STATIONS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'whitesmoke' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, alignItems: 'center', backgroundColor: 'white' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerLine: { height: 3, width: 40, backgroundColor: 'limegreen', marginTop: 5 },
  topSection: { backgroundColor: 'white', paddingVertical: 15 },
  sectionLabel: { marginLeft: 20, fontSize: 12, fontWeight: 'bold', color: 'grey', marginBottom: 10 },
  stationList: { paddingHorizontal: 15 },
  stationChip: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: 'lightgrey', flexDirection: 'row' },
  stationSelected: { backgroundColor: 'limegreen', borderColor: 'limegreen' },
  stationText: { color: 'dimgray', fontWeight: 'bold' },
  stationTextSelected: { color: 'white' },
  checkIcon: { color: 'white', marginLeft: 8, fontSize: 12 },
  toggleWrapper: { padding: 20 },
  toggleBox: { flexDirection: 'row', backgroundColor: 'lightgrey', borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeToggle: { backgroundColor: 'limegreen' },
  toggleBtnText: { fontWeight: 'bold', color: 'gray' },
  activeText: { color: 'white' },
  formPadding: { paddingHorizontal: 20 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 3 },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: 'bold', color: 'darkslategrey', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: 'silver', borderRadius: 10, padding: 12, fontSize: 15, color: 'black', backgroundColor: 'white' },
  dropdown: { height: 50, borderColor: 'silver', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, backgroundColor: 'white' },
  row: { flexDirection: 'row' },
  submitBtn: { marginTop: 20, backgroundColor: 'limegreen', padding: 16, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { backgroundColor: 'silver' },
  submitBtnText: { color: 'white', fontWeight: 'bold' }
});