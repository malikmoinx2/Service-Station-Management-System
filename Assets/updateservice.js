import React, { useState, useEffect, useContext } from 'react';
import {StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, StatusBar, ActivityIndicator, Alert} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const updateservice = () => {
  const { servicedata } = useContext(UserContext);
  const [allBays, setAllBays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [station, setstation] = useState(null);

  // 4 price fields
  const [normalPriceSmall, setnormalPriceSmall] = useState(servicedata?.originalNormalSmall?.toString() || "0");
  const [normalPriceLarge, setnormalPriceLarge] = useState(servicedata?.originalNormalLarge?.toString() || "0");
  const [vipPriceSmall, setvipPriceSmall] = useState(servicedata?.originalVIPSmall?.toString() || "0");
  const [vipPriceLarge, setvipPriceLarge] = useState(servicedata?.originalVIPLarge?.toString() || "0");
  const [duration, setduration] = useState(servicedata?.duration?.toString() || "0");
  const [description, setdescription] = useState(servicedata?.description || "No description");

  useEffect(() => {
    fetchStationsAndBays();
    console.log(servicedata)
  }, []);

  const updateservice = async () => {
    if (!normalPriceSmall || !normalPriceLarge || !vipPriceSmall || !vipPriceLarge || !duration) {
      Alert.alert("Error", "Please fill all price fields");
      return;
    }
    setLoading(true);
    try {
      const dataitem = {
        normalPriceSmall: parseInt(normalPriceSmall),
        normalPriceLarge: parseInt(normalPriceLarge),
        vipPriceSmall:    parseInt(vipPriceSmall),
        vipPriceLarge:    parseInt(vipPriceLarge),
        duration:         parseInt(duration),
        description:      description,
      };
      const url = `${BASE_URL}/Station/updateservicebyserviceid/${servicedata?.serviceId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataitem),
      });
      const serviceresult = await response.json();
      if (response.ok && serviceresult.status === "success") {
        Alert.alert("Success", "Service Updated Successfully");
      } else {
        Alert.alert("Failed", "Failed to Update Service: " + (serviceresult.message || "Unknown error"));
      }
    } catch (e) {
      Alert.alert("Error", "Network Request Failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStationsAndBays = async () => {
    try {
      setLoading(true);
      const stationRes = await fetch(`${BASE_URL}/Station/getstationbyid/${servicedata?.stationId}`);
      const stationResult = await stationRes.json();
      if (stationResult.status === "success") setstation(stationResult.data);

      const baysRes = await fetch(`${BASE_URL}/Station/getassignedbays/${servicedata?.serviceId}`);
      const baysResult = await baysRes.json();
      if (baysResult.status === "success") setAllBays(baysResult.data);
    } catch (error) {
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
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Update Service</Text>
        <View style={styles.headerLine} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Read-only card */}
        <View style={styles.lockedCard}>
          <Text style={styles.sectionLabel}>Plan Details (Read Only)</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Station</Text>
            <Text style={styles.infoValue}>{station?.stationName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service Name</Text>
            <Text style={styles.serviceText}>{servicedata?.serviceName || "Loading..."}</Text>
          </View>
          <Text style={styles.infoLabel}>Active On Bays</Text>
          <View style={styles.bayContainer}>
            {allBays.map((bay, index) => (
              <View key={index} style={styles.bayChip}>
                <Text style={styles.bayChipText}>{bay.bayName}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.lockNote}>🔒 Station, Name and Bays are locked</Text>
        </View>

        {/* Editable Section */}
        <View style={styles.editSection}>
          <Text style={styles.sectionLabel}>Modify Pricing & Time</Text>

          {/* Normal Prices Row */}
          <Text style={styles.groupLabel}>Normal Price</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Small (PKR)</Text>
              <TextInput
                style={styles.input}
                value={normalPriceSmall}
                onChangeText={setnormalPriceSmall}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 15 }} />
            <View style={styles.flex1}>
              <Text style={styles.label}>Large (PKR)</Text>
              <TextInput
                style={styles.input}
                value={normalPriceLarge}
                onChangeText={setnormalPriceLarge}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* VIP Prices Row */}
          <Text style={styles.groupLabel}>VIP Price ✨</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Small (PKR)</Text>
              <TextInput
                style={styles.input}
                value={vipPriceSmall}
                onChangeText={setvipPriceSmall}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 15 }} />
            <View style={styles.flex1}>
              <Text style={styles.label}>Large (PKR)</Text>
              <TextInput
                style={styles.input}
                value={vipPriceLarge}
                onChangeText={setvipPriceLarge}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Duration & Description */}
          <Text style={styles.label}>Service Duration (Minutes)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setduration}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setdescription}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity style={styles.updateBtn} activeOpacity={0.8} onPress={() => updateservice()}>
            <Text style={styles.updateBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { padding: 20, alignItems: 'center', backgroundColor: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerLine: { height: 3, width: 40, backgroundColor: '#00C853', marginTop: 5, borderRadius: 10 },
  scrollContent: { padding: 16 },

  lockedCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#9E9E9E', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
  infoRow: { marginBottom: 15 },
  infoLabel: { fontSize: 11, color: '#757575', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#424242' },
  serviceText: { fontSize: 18, fontWeight: 'bold', color: '#00C853' },
  bayContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  bayChip: { backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#EEEEEE' },
  bayChipText: { fontSize: 12, fontWeight: 'bold', color: '#616161' },
  lockNote: { fontSize: 10, color: '#BDBDBD', fontStyle: 'italic', marginTop: 5 },

  editSection: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  groupLabel: { fontSize: 13, fontWeight: 'bold', color: '#888', marginBottom: 8, marginTop: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  flex1: { flex: 1 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#424242', marginBottom: 8 },
  input: { backgroundColor: '#F9F9F9', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 18, color: '#212121' },
  textArea: { height: 80, textAlignVertical: 'top' },

  updateBtn: { backgroundColor: '#00C853', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 5 },
  updateBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default updateservice;