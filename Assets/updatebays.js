import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const UpdateBays = () => {
  const { User, baydata} = useContext(UserContext); // 
  
  const [loading, setLoading] = useState(true);
  
  // States - Editable Fields (Initial values from context or props)
  const [bayName,setbayName] = useState(baydata?.bayName||"Bay Identifier"); 
  const [stationName,setstationName] = useState( "Current Station");
  const [bayType, setBayType] = useState(baydata?.bayType || 'Without Lifter'); 
  const [description, setDescription] = useState(baydata?.description || ''); 
  const [status, setStatus] = useState(baydata?.status ?? 1); 
   const[station,setstation] =useState()      


  useEffect(() => {
        fetchStations();
      }, []);



  useEffect(() => {
      
        if (!station ) {
          setLoading(true);
        } else {
          setLoading(false);
          console.log(station)
          console.log(baydata)
        }
      }, [ station,baydata ]);
        

  const handleUpdateBay = async () => {
    if(!bayType)
      return

    setLoading(true);
    const dataitem = {BayType: bayType,Description: description, Status: status};

    try {
      const url = `${BASE_URL}/Station/updatebay/${baydata?.bayId}`; 
      console.log(url)
      const response = await fetch(url, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataitem)
      });
      const result = await response.json();

      if (result.status === "success") {
        Alert.alert("Success", "Bay updated successfully!");
      } else {
        Alert.alert("Failed", result.message);
      }
    } catch (error) {
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      setLoading(true);
      const stationUrl = `${BASE_URL}/Station/getstationbyid/${baydata?.stationId}`;
      const stationRes = await fetch(stationUrl);
      const stationResult = await stationRes.json();
      if (stationResult.status === "success") {
          setstation(stationResult.data);
          setstationName(stationResult.data.stationName) 
          
      }
     
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Server connection failed");
    } finally {
      setLoading(false);
    }
  };


   if (loading) {
          return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
              <ActivityIndicator size="large" color="deepskyblue" />
              <Text style={{ marginTop: 12, color: 'gray', fontWeight: 'bold' }}>Fetching Data...</Text>
            </View>
          );
        }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Update Bay</Text>
        <View style={styles.headerLine} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
        
        {/* --- READ ONLY SECTION (Locked) --- */}
        <View style={styles.lockedCard}>
          <Text style={styles.sectionLabel}>Identification (Read Only 🔒)</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Station</Text>
            <Text style={styles.lockedValue}>{stationName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bay Name</Text>
            <Text style={styles.lockedValue}>{bayName}</Text>
          </View>
        </View>

        {/* --- EDITABLE SECTION --- */}
        <View style={styles.editCard}>
          <Text style={styles.sectionLabel}>Modify Configurations</Text>

          <Text style={styles.label}>Bay Type</Text>
          <View style={styles.typeRow}>
            {['With Lifter', 'Without Lifter'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, bayType === type && styles.selectedTypeBtn]}
                onPress={() => setBayType(type)}
                activeOpacity={0.7}
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
            placeholderTextColor="silver"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <View style={styles.statusBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Bay Status</Text>
              <Text style={[styles.statusSubText, { color: status === 1 ? 'limegreen' : 'tomato' }]}>
                ● {status === 1 ? 'Available (Active)' : 'Maintenance (Offline)'}
              </Text>
            </View>
            <Switch
              trackColor={{ false: 'silver', true: 'palegreen' }}
              thumbColor={status === 1 ? 'limegreen' : 'white'}
              onValueChange={(value) => setStatus(value ? 1 : 0)}
              value={status === 1}
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, loading && { opacity: 0.7 }]} 
            onPress={()=>handleUpdateBay()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'whitesmoke' },
  header: { padding: 20, alignItems: 'center', backgroundColor: 'white' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'black' },
  headerLine: { height: 3, width: 40, backgroundColor: 'limegreen', marginTop: 5, borderRadius: 10 },
  
  scrollPadding: { padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: 'gray', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },

  // Locked Card Styles
  lockedCard: { 
    backgroundColor: 'white', padding: 16, borderRadius: 15, 
    marginBottom: 20, borderWidth: 1, borderColor: 'lightgrey' 
  },
  infoRow: { marginBottom: 12 },
  infoLabel: { fontSize: 11, color: 'darkgray', marginBottom: 2 },
  lockedValue: { fontSize: 16, fontWeight: 'bold', color: 'dimgray' },

  // Editable Card Styles
  editCard: { 
    backgroundColor: 'white', padding: 16, borderRadius: 15, 
    borderWidth: 1, borderColor: 'lightgrey', elevation: 3 
  },
  label: { fontSize: 14, fontWeight: 'bold', color: 'darkslategrey', marginBottom: 10 },
  
  input: {
    backgroundColor: 'whitesmoke', borderRadius: 12, padding: 15,
    borderWidth: 1, borderColor: 'silver', marginBottom: 20, fontSize: 15, color: 'black'
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  
  typeRow: { flexDirection: 'row', marginBottom: 20 },
  typeBtn: {
    flex: 1, padding: 12, borderRadius: 10, backgroundColor: 'whitesmoke',
    alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: 'lightgrey'
  },
  selectedTypeBtn: { backgroundColor: 'limegreen', borderColor: 'limegreen' },
  typeBtnText: { fontWeight: 'bold', fontSize: 12, color: 'gray' },
  whiteText: { color: 'white' },

  statusBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'whitesmoke',
    padding: 15, borderRadius: 12, marginBottom: 25, borderWidth: 1, borderColor: 'lightgrey'
  },
  statusSubText: { fontSize: 13, fontWeight: 'bold' },

  saveButton: {
    backgroundColor: 'limegreen', padding: 18, borderRadius: 15,
    alignItems: 'center', elevation: 4
  },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default UpdateBays;