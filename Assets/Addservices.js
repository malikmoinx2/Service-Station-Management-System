import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, ScrollView, StatusBar,
  ActivityIndicator, Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const Addservices = () => {
  const { User } = useContext(UserContext);
  const [stations, setstations]       = useState([]);
  const [allBays, setallBays]         = useState([]);
  const [loading, setLoading]         = useState(true);

  // Form States
  const [selectedStation, setSelectedStation]     = useState(null);
  const [selectedBayIds, setSelectedBayIds]       = useState([]);
  const [serviceName, setServiceName]             = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [isCustomService, setIsCustomService]     = useState(false);
  const [description, setDescription]             = useState('');

  // 4 Price Fields
  const [normalPriceSmall, setNormalPriceSmall] = useState('');
  const [normalPriceLarge, setNormalPriceLarge] = useState('');
  const [vipPriceSmall, setVipPriceSmall]       = useState('');
  const [vipPriceLarge, setVipPriceLarge]       = useState('');

  const [duration, setDuration]                 = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [serviceOptions, setserviceOptions]     = useState([]);
  const [filteredBays, setFilteredBays]         = useState([]);

  // ── Effects ──────────────────────────────────────────────
  useEffect(() => { loadInitialData(); }, []);

  useEffect(() => {
    if (selectedStation) {
      setFilteredBays(allBays.filter(b => (b.stationId || b.StationId) === selectedStation));
    } else {
      setFilteredBays([]);
    }
  }, [selectedStation, allBays]);

  // ── Load Data ─────────────────────────────────────────────
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [stationRes, baysRes, serviceNamesRes] = await Promise.all([
        fetch(`${BASE_URL}/Station/getstationlist/${User?.id}`),
        fetch(`${BASE_URL}/Station/getalluserbays/${User?.id}`),
        fetch(`${BASE_URL}/Station/getservicenames`)
      ]);
      const stationResult      = await stationRes.json();
      const baysResult         = await baysRes.json();
      const serviceNamesResult = await serviceNamesRes.json();

      console.log("=== STATIONS ===", JSON.stringify(stationResult, null, 2));
      console.log("=== BAYS ===", JSON.stringify(baysResult, null, 2));
      console.log("=== SERVICE NAMES ===", JSON.stringify(serviceNamesResult, null, 2));

      if (stationResult.status === "success")      setstations(stationResult.data);
      if (baysResult.status === "success")         setallBays(baysResult.data);
      if (serviceNamesResult.status === "success") setserviceOptions(serviceNamesResult.data);
    } catch (e) {
      console.log("=== LOAD ERROR ===", e.message);
      Alert.alert("Error", "Initial data loading error");
    } finally {
      setLoading(false);
    }
  };

  // ── Picker Change ─────────────────────────────────────────
  const handleServiceChange = (value) => {
    if (value === '__other__') {
      setServiceName('__other__');
      setIsCustomService(true);
      setIsCustomDuration(true);
      setCustomServiceName('');
      setDuration('');
    } else {
      setServiceName(value);
      setIsCustomService(false);
      setCustomServiceName('');
      const found = serviceOptions.find(opt => opt.serviceName === value);
      setDuration(found ? found.defaultDuration.toString() : '');
      setIsCustomDuration(false);
    }
  };

  // ── Bay Toggle ────────────────────────────────────────────
  const toggleBaySelection = (id) => {
    setSelectedBayIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ── Save ──────────────────────────────────────────────────
  const handleSave = async () => {
  const finalName     = isCustomService ? customServiceName.trim() : serviceName;
  const finalDuration = duration ? parseInt(duration) : null;

  if (!selectedStation) { Alert.alert("Error", "Please select a station."); return; }
  if (selectedBayIds.length === 0) { Alert.alert("Error", "Please select at least one bay."); return; }
  if (!finalName) { Alert.alert("Error", "Please enter a service name."); return; }
  if (!normalPriceSmall || !normalPriceLarge) {
    Alert.alert("Error", "Normal Price (Small & Large) are required.");
    return;
  }

  try {
    setLoading(true);

    // ── Helper: safe JSON parse ──
    const safeJson = async (res, label) => {
      const text = await res.text();
      console.log(`=== ${label} RAW RESPONSE ===`, text);
      try {
        return JSON.parse(text);
      } catch (e) {
        console.log(`=== ${label} JSON PARSE FAILED ===`, e.message);
        return null;
      }
    };

    // ── Step 1: ServiceNames ──
    if (isCustomService && customServiceName.trim()) {
      const serviceNamePayload = {
        ServiceName:     customServiceName.trim(),
        DefaultDuration: finalDuration ?? 30,
      };
      console.log("=== STEP 1 REQUEST ===", JSON.stringify(serviceNamePayload, null, 2));

      const serviceNameRes    = await fetch(`${BASE_URL}/Station/addservicename`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(serviceNamePayload),
      });
      const serviceNameResult = await safeJson(serviceNameRes, "STEP 1");

      if (!serviceNameResult || serviceNameResult.status !== "success") {
        Alert.alert("Error", "Failed to save service name: " + (serviceNameResult?.message || "Empty response"));
        return;
      }
    }

    // ── Step 2: Services ──
    const servicePayload = {
      ServiceName:      finalName,
      NormalPriceSmall: parseInt(normalPriceSmall) || 0,
      NormalPriceLarge: parseInt(normalPriceLarge) || 0,
      VIPPriceSmall:    parseInt(vipPriceSmall)    || 0,
      VIPPriceLarge:    parseInt(vipPriceLarge)    || 0,
      Duration:         finalDuration,
      Description:      description,
      StationId:        selectedStation,
    };
    console.log("=== STEP 2 REQUEST ===", JSON.stringify(servicePayload, null, 2));

    const serviceRes    = await fetch(`${BASE_URL}/Station/addnewservice`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(servicePayload),
    });
    const serviceResult = await safeJson(serviceRes, "STEP 2");

    if (!serviceResult || serviceResult.status !== "success") {
      Alert.alert("Error", serviceResult?.message || "Failed to add service — empty response");
      return;
    }

    // ── Step 3: BayServices ──
    const newServiceId       = serviceResult.serviceId;
    const bayServicesPayload = selectedBayIds.map(bayId => ({
      ServiceId: newServiceId,
      BayId:     bayId,
    }));
    console.log("=== STEP 3 REQUEST ===", JSON.stringify(bayServicesPayload, null, 2));

    const junctionRes    = await fetch(`${BASE_URL}/Station/assignservices`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(bayServicesPayload),
    });
    const junctionResult = await safeJson(junctionRes, "STEP 3");

    if (junctionResult && junctionResult.status === "success") {
      Alert.alert("Success", "Service added successfully!");
      setServiceName('');
      setCustomServiceName('');
      setIsCustomService(false);
      setNormalPriceSmall('');
      setNormalPriceLarge('');
      setVipPriceSmall('');
      setVipPriceLarge('');
      setDuration('');
      setDescription('');
      setSelectedBayIds([]);
      setIsCustomDuration(false);
    } else {
      Alert.alert("Error", junctionResult?.message || "Failed to assign bays");
    }

  } catch (e) {
    console.log("=== SAVE ERROR ===", e.message);
    Alert.alert("Error", "Something went wrong: " + e.message);
  } finally {
    setLoading(false);
  }
};
  // ── Loading Screen ────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="deepskyblue" />
        <Text style={{ marginTop: 12, color: 'gray', fontWeight: 'bold' }}>Loading...</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Services</Text>
        <View style={styles.headerLine} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── STATION ── */}
        <Text style={styles.label}>Select Station </Text>
        <FlatList
          horizontal
          data={stations}
          keyExtractor={item => item.stationId.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, selectedStation === item.stationId && styles.selectedStationChip]}
              onPress={() => { setSelectedStation(item.stationId); setSelectedBayIds([]); }}
            >
              <Text style={[styles.chipText, selectedStation === item.stationId && styles.whiteText]}>
                {item.stationName}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalList}
        />

        {/* ── BAYS ── */}
        {selectedStation && (
          <View>
            <Text style={styles.label}>Select Bays </Text>
            <FlatList
              horizontal
              data={filteredBays}
              keyExtractor={item => item.bayId.toString()}
              renderItem={({ item }) => {
                const isSel = selectedBayIds.includes(item.bayId);
                return (
                  <TouchableOpacity
                    style={[styles.chip, isSel && styles.selectedBayChip]}
                    onPress={() => toggleBaySelection(item.bayId)}
                  >
                    <Text style={[styles.chipText, isSel && styles.whiteText]}>
                      {item.bayName} {isSel ? "✓" : ""}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalList}
              ListEmptyComponent={<Text style={styles.emptyText}>No bays found.</Text>}
            />
          </View>
        )}

        {/* ── SERVICE NAME PICKER ── */}
        <Text style={styles.label}>Select Service </Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={serviceName}
            onValueChange={handleServiceChange}
            dropdownIconColor="springgreen"
            mode="dropdown"
            style={{ color: 'black', height: 50 }}
          >
            <Picker.Item label="Click to Select Service." value="" color="gray" />
            {serviceOptions.map((opt, i) => (
              <Picker.Item key={i} label={opt.serviceName} value={opt.serviceName} />
            ))}
            <Picker.Item label="➕ Other (Enter manually)" value="__other__" color="royalblue" />
          </Picker>
        </View>

        {/* ── CUSTOM SERVICE NAME ── */}
        {isCustomService && (
          <View style={styles.customBox}>
            <Text style={styles.customBoxLabel}>✏️ Custom Service Name </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Full Engine Flush"
              value={customServiceName}
              onChangeText={setCustomServiceName}
            />
          </View>
        )}

        {/* ── PRICES GRID ── */}
        <View style={styles.pricingBox}>
          <Text style={styles.pricingBoxTitle}>💰 Pricing (PKR)</Text>

          {/* Normal Prices */}
          <View style={styles.priceHeaderRow}>
            <View style={styles.priceHeaderCell}>
              <Text style={styles.priceHeaderText}>🟢 Normal — Small Car</Text>
            </View>
            <View style={styles.priceHeaderCell}>
              <Text style={styles.priceHeaderText}>🟢 Normal — Large Car</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flexHalf}>
              <TextInput
                style={styles.priceInput}
                placeholder="e.g. 800"
                keyboardType="numeric"
                value={normalPriceSmall}
                onChangeText={setNormalPriceSmall}
              />
            </View>
            <View style={[styles.flexHalf, { marginLeft: 10 }]}>
              <TextInput
                style={styles.priceInput}
                placeholder="e.g. 1200"
                keyboardType="numeric"
                value={normalPriceLarge}
                onChangeText={setNormalPriceLarge}
              />
            </View>
          </View>

          <View style={styles.priceDivider} />

          {/* VIP Prices */}
          <View style={styles.priceHeaderRow}>
            <View style={styles.priceHeaderCell}>
              <Text style={[styles.priceHeaderText, { color: '#b8860b' }]}>🌟 VIP — Small Car</Text>
            </View>
            <View style={styles.priceHeaderCell}>
              <Text style={[styles.priceHeaderText, { color: '#b8860b' }]}>🌟 VIP — Large Car</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flexHalf}>
              <TextInput
                style={[styles.priceInput, styles.vipInput]}
                placeholder="e.g. 1200"
                keyboardType="numeric"
                value={vipPriceSmall}
                onChangeText={setVipPriceSmall}
              />
            </View>
            <View style={[styles.flexHalf, { marginLeft: 10 }]}>
              <TextInput
                style={[styles.priceInput, styles.vipInput]}
                placeholder="e.g. 1800"
                keyboardType="numeric"
                value={vipPriceLarge}
                onChangeText={setVipPriceLarge}
              />
            </View>
          </View>
        </View>

        {/* ── DURATION ── */}
        <Text style={styles.label}>Duration (Minutes)</Text>
        <TextInput
          style={[
            styles.input,
            !isCustomDuration && { backgroundColor: '#eeeeee', color: '#555' }
          ]}
          placeholder={isCustomDuration ? "Enter duration in minutes" : "Auto-filled from service"}
          value={duration}
          onChangeText={isCustomDuration ? setDuration : undefined}
          editable={isCustomDuration}
          keyboardType="numeric"
        />
        {!isCustomDuration && (
          <Text style={styles.hintText}>Duration is auto-filled based on the selected service.</Text>
        )}

        {/* ── DESCRIPTION ── */}
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Service details..."
          multiline
          value={description}
          onChangeText={setDescription}
        />

        {/* ── SUBMIT ── */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
          <Text style={styles.submitBtnText}>💾 Save Service Plan</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: 'white' },
  loaderContainer:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  header:              { padding: 20, alignItems: 'center' },
  headerTitle:         { fontSize: 22, fontWeight: 'bold' },
  headerLine:          { height: 4, width: 30, backgroundColor: 'springgreen', marginTop: 5, borderRadius: 2 },
  scrollContent:       { padding: 20, paddingBottom: 40 },
  label:               { fontSize: 13, fontWeight: 'bold', color: '#444', marginBottom: 8 },
  horizontalList:      { marginBottom: 20 },
  chip:                { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  selectedStationChip: { backgroundColor: 'springgreen', borderColor: 'springgreen' },
  selectedBayChip:     { backgroundColor: 'deepskyblue', borderColor: 'deepskyblue' },
  chipText:            { fontSize: 13, fontWeight: '600', color: '#777' },
  whiteText:           { color: 'white' },
  pickerContainer:     { backgroundColor: '#f9f9f9', borderRadius: 12, borderWidth: 1, borderColor: '#ddd', marginBottom: 20, overflow: 'hidden' },

  customBox:      { backgroundColor: '#EEF6FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#90CAF9', marginBottom: 16 },
  customBoxLabel: { fontSize: 13, fontWeight: 'bold', color: 'royalblue', marginBottom: 8 },

  pricingBox:      { backgroundColor: '#fcfcfc', padding: 14, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  pricingBoxTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  priceHeaderRow:  { flexDirection: 'row', marginBottom: 6 },
  priceHeaderCell: { flex: 1 },
  priceHeaderText: { fontSize: 12, fontWeight: '700', color: '#2e7d32' },
  row:             { flexDirection: 'row', marginBottom: 4 },
  flexHalf:        { flex: 1 },
  priceInput:      { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ccc', textAlign: 'center' },
  vipInput:        { borderColor: '#FFD700', backgroundColor: '#FFFDE7' },
  priceDivider:    { height: 1, backgroundColor: '#EEE', marginVertical: 12 },

  input:    { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', marginBottom: 20 },
  textArea: { height: 70, textAlignVertical: 'top' },
  hintText: { fontSize: 11, color: '#aaa', marginTop: -14, marginBottom: 16, marginLeft: 4 },

  submitBtn:     { backgroundColor: 'limegreen', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 3 },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emptyText:     { color: 'gray', fontStyle: 'italic', marginLeft: 10 }
});

export default Addservices;