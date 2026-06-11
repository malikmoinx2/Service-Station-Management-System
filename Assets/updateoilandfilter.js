import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, SafeAreaView, StatusBar, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { BASE_URL } from "./Constants";

const updateoilandfilter = ({ route, navigation }) => {
  // Navigation se data nikalna
  const { item, type, sId,sName } = route.params;

  // States
  const [itemType, setItemType] = useState(type || 'Oil');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [viscosity, setViscosity] = useState('');
  const [capacity, setCapacity] = useState('');
  const [engineType, setEngineType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [price, setPrice] = useState('');

  
  useEffect(() => {
    if (item) {
      if (itemType === 'Oil') {
        setName(item.oilName);
        setViscosity(item.viscosity);
        setCapacity(item.capacity);
        setEngineType(item.engineType || 'Petrol');
      } else {
        setName(item.filterName);
        setVehicleModel(item.vehicleModel || '');
      }
      setBrand(item.brand);
      setPrice(item.price ? item.price.toString() : '0');
      console.log(item)
    }
  }, [item]);
  

  const handleUpdate = async () => {
    
    if (!name || !brand || !price) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    try {
      
      const updateData = {
        stationId: sId,
        brand: brand,
        price: parseFloat(price) || 0,
        
        ...(itemType === 'Oil' ? {
          oilId: item.oilId,
          oilName: name,
          viscosity: viscosity,
          capacity: capacity,
          engineType: engineType
        } : {
          filterId: item.filterId,
          filterName: name,
          vehicleModel: vehicleModel
        })
      };
       console.log("befor Api calling:",updateData)
      
      const endpoint = '/Station/UpdateInventoryItem'; 
      
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT', 
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const result = await res.json();
      console.log(res)

      if (res.ok && result.status === "success") {
        Alert.alert("Success", "Inventory Updated Successfully!", [
          { 
            text: "OK", 
            onPress: () => navigation.navigate('myoilandfilter') // Wapis list wali screen par
          }
        ]);
      } else {
        Alert.alert("Update Failed", result.message || "Could not update item");
      }
    } catch (error) {
      console.error("Update API Error:", error);
      Alert.alert("Error", "Server connection failed. Please check your network.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Update Inventory</Text>
        <View style={styles.headerLine} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.lockContainer}>
            <Text style={styles.lockLabel}>Station Name:</Text>
            <View style={styles.lockBox}>
              <Text style={styles.lockText}>📍 Station: {sName}</Text>
              <Text>🔒</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Update Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{itemType} Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand</Text>
              <TextInput style={styles.input} value={brand} onChangeText={setBrand} />
            </View>

            {itemType === 'Oil' ? (
              <View>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, {flex: 1, marginRight: 10}]}>
                    <Text style={styles.label}>Viscosity</Text>
                    <TextInput style={styles.input} value={viscosity} onChangeText={setViscosity} />
                  </View>
                  <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.label}>Capacity</Text>
                    <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} />
                  </View>
                </View>

                <Text style={styles.label}>Engine Type</Text>
                <View style={styles.engineRow}>
                  {['Petrol', 'Diesel', 'Hybrid'].map(type => (
                    <TouchableOpacity 
                      key={type} 
                      onPress={() => setEngineType(type)}
                      style={[styles.engineOption, engineType === type && styles.engineSelected]}
                    >
                      <Text style={[styles.engineOptionText, engineType === type && {color: '#FFF'}]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Model</Text>
                <TextInput style={styles.input} value={vehicleModel} onChangeText={setVehicleModel} />
              </View>
            )}

            <View style={[styles.inputGroup, {marginTop: 10}]}>
              <Text style={styles.label}>Price (PKR)</Text>
              <TextInput 
                style={[styles.input, styles.priceInput]} 
                keyboardType="numeric" 
                value={price} 
                onChangeText={setPrice} 
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
              <Text style={styles.saveBtnText}>UPDATE NOW</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles same as before
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: { padding: 20, backgroundColor: '#FFF', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerLine: { height: 3, width: 35, backgroundColor: '#4CAF50', marginTop: 5 },
  scrollContent: { padding: 20 },
  lockContainer: { marginBottom: 20 },
  lockLabel: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 6 },
  lockBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#E8E8E8', padding: 15, borderRadius: 12 },
  lockText: { fontWeight: 'bold', color: '#555' },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, backgroundColor: '#FAFAFA' },
  row: { flexDirection: 'row' },
  priceInput: { borderColor: '#4CAF50', backgroundColor: '#F1F8F1', color: '#2E7D32', fontWeight: 'bold' },
  engineRow: { flexDirection: 'row', marginTop: 5 },
  engineOption: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#EEE', alignItems: 'center', borderRadius: 8, marginRight: 5 },
  engineSelected: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  engineOptionText: { fontSize: 12, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default updateoilandfilter;