import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  StatusBar, Animated
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { UserContext } from './UserContext';
import { BASE_URL } from './Constants';

const addbookingdetail = ({ navigation }) => {
  const { bookingData, setBookingData, User } = useContext(UserContext);

  const [step, setStep] = useState(1); // 1 = details, 2 = confirm
  const [carModel, setCarModel] = useState(bookingData?.vehicleName || '');
  const [regNo, setRegNo] = useState(bookingData?.regNo || '');
  const [description, setDescription] = useState('');

  const [oils, setOils]                           = useState([]);
  const [filters, setFilters]                     = useState([]);
  const [selectedOilId, setSelectedOilId]         = useState(null);
  const [selectedFilterId, setSelectedFilterId]   = useState(null);
  const [loadingProducts, setLoadingProducts]     = useState(false);
  const [loading, setLoading]                     = useState(false);

  const isOilService = bookingData?.serviceNames?.some(n =>
    n.toLowerCase().includes("oil change")
  );

  useEffect(() => {
    if (isOilService && bookingData?.stationId) fetchProducts();
  }, [bookingData?.stationId]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res    = await fetch(`${BASE_URL}/Customer/get-oil-filter?stationId=${bookingData.stationId}`);
      const result = await res.json();
      if (result.status === "success") {
        setOils(result.oils || result.Oils || []);
        setFilters(result.filters || result.Filters || []);
      }
    } catch {
      Alert.alert("Error", "Unable to load products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const currentOil    = oils.find(o => (o.oilId    || o.OilId)    === selectedOilId);
  const currentFilter = filters.find(f => (f.filterId || f.FilterId) === selectedFilterId);

  const oilPrice    = currentOil    ? (currentOil.price    || currentOil.Price    || 0) : 0;
  const filterPrice = currentFilter ? (currentFilter.price || currentFilter.Price || 0) : 0;
  const servicesTotal = bookingData?.totalAmount || 0;
  const grandTotal    = servicesTotal + oilPrice + filterPrice;

  const handleProceed = () => {
    if (!carModel.trim() || !regNo.trim()) {
      Alert.alert("Missing Details", "Please enter Car Model and Registration Number.");
      return;
    }
    setStep(2);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const payload = {
        CustomerId:  User?.id,
        StationId:   bookingData.stationId,
        BayId:       bookingData.availableBayId,
        BookingDate: bookingData.date,
        StartTime:   bookingData.startTime,
        EndTime:     bookingData.endTime,
        TotalAmount: grandTotal,
        CarNumber:   regNo,
        CarModel:    carModel,
        Description: description,
        OilId:       selectedOilId,
        FilterId:    selectedFilterId,
        SelectedServices: bookingData.selectedServicesList.map(s => ({
          ServiceId: s.serviceId,
          Price:     s.price,
          Duration:  s.duration,
        })),
      };
          console.log(payload)
      const res    = await fetch(`${BASE_URL}/Customer/confirm-booking`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const result = await res.json();
      console.log(res)
      if (res.ok && result.status === "success") {
        Alert.alert("Booking Confirmed!", "Your appointment has been scheduled.");
        setBookingData({
          serviceIds: [], serviceNames: [], selectedServicesList: [],
          date: null, startTime: null, endTime: null, totalAmount: 0,
          carModel: '', carNumber: '', selectedOilId: null, selectedFilterId: null,
          oilName: '', filterName: '', oilPrice: 0, filterPrice: 0,
        });
        navigation.replace('Customerhome');
      } else {
        Alert.alert("Error", result.message || "Booking failed.");
      }
    } catch {
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Reusable small components ───────────────────────────────────────────

  const SectionLabel = ({ icon, text }) => (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabelIcon}>{icon}</Text>
      <Text style={styles.sectionLabelText}>{text}</Text>
    </View>
  );

  const InfoRow = ({ label, value }) =>
    value ? (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    ) : null;

  const SummaryServiceRow = ({ name, price }) => (
    <View style={styles.summaryServiceRow}>
      <View style={styles.summaryDot} />
      <Text style={styles.summaryServiceName} numberOfLines={1}>{name}</Text>
      <Text style={styles.summaryServicePrice}>RS {price}</Text>
    </View>
  );

  // ─── Booking Summary Card (shared between both steps) ────────────────────

  const BookingSummaryCard = () => (
    <View style={styles.summaryCard}>
      {/* Station */}
      {bookingData?.stationName && (
        <View style={styles.summaryTopRow}>
          <Text style={styles.summaryStationIcon}>🏪</Text>
          <View>
            <Text style={styles.summaryStationLabel}>Station</Text>
            <Text style={styles.summaryStationName}>{bookingData.stationName}</Text>
          </View>
        </View>
      )}

      <View style={styles.summaryDivider} />

      {/* Date / Time / Bay / Type row */}
      <View style={styles.summaryMetaGrid}>
        <View style={styles.summaryMetaCell}>
          <Text style={styles.summaryMetaIcon}>📅</Text>
          <Text style={styles.summaryMetaLabel}>Date</Text>
          <Text style={styles.summaryMetaVal}>{bookingData?.date || '—'}</Text>
        </View>
        <View style={styles.summaryMetaCellDivider} />
        <View style={styles.summaryMetaCell}>
          <Text style={styles.summaryMetaIcon}>🕐</Text>
          <Text style={styles.summaryMetaLabel}>Time</Text>
          <Text style={styles.summaryMetaVal}>{bookingData?.startTime} → {bookingData?.endTime}</Text>
        </View>
        <View style={styles.summaryMetaCellDivider} />
        <View style={styles.summaryMetaCell}>
          <Text style={styles.summaryMetaIcon}>🚗</Text>
          <Text style={styles.summaryMetaLabel}>Type</Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.summaryMetaVal}>{bookingData?.carType || '—'}</Text>
            {bookingData?.isVip && (
              <View style={styles.vipBadge}><Text style={styles.vipText}>✨ VIP</Text></View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.summaryDivider} />

      {/* Services */}
      {bookingData?.selectedServicesList?.length > 0 && (
        <View style={styles.summaryServicesBlock}>
          <Text style={styles.summaryServicesTitle}>🔧  Services</Text>
          {bookingData.selectedServicesList.map((s, i) => (
            <SummaryServiceRow key={i} name={s.serviceName} price={s.price} />
          ))}
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Services Total</Text>
            <Text style={styles.summaryTotalVal}>RS {servicesTotal}</Text>
          </View>
        </View>
      )}
    </View>
  );

  // ─── STEP 1 ───────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <>
      {/* Car Info */}
      <SectionLabel icon="🚘" text="Vehicle Information" />
      <View style={styles.inputCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Car Model</Text>
         <TextInput
          style={[styles.input, styles.inputReadonly]}
          value={carModel}
          editable={false}
            />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Registration Number</Text>
          <TextInput
          style={[styles.input, styles.inputReadonly]}
          value={regNo}
          editable={false}
            />
        </View>
        <View style={[styles.inputGroup, { marginBottom: 0 }]}>
          <Text style={styles.inputLabel}>Additional Notes  <Text style={styles.optionalTag}>(Optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Describe any specific issues or requests..."
            placeholderTextColor="#bbb"
          />
        </View>
      </View>

      {/* Oil & Filter */}
      {isOilService && (
        <>
          <SectionLabel icon="🛢️" text="Product Selection  (Optional)" />
          {loadingProducts ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#222" />
              <Text style={styles.loaderText}>Loading products...</Text>
            </View>
          ) : (
            <View style={styles.inputCard}>

              {/* Engine Oil */}
              <Text style={styles.inputLabel}>Engine Oil</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={selectedOilId} onValueChange={setSelectedOilId} style={styles.picker}>
                  <Picker.Item label="— Select Engine Oil —" value={null} />
                  {oils.map((o, i) => (
                    <Picker.Item
                      key={i}
                      label={`${o.oilName || o.OilName}  •  RS ${o.price || o.Price || 0}`}
                      value={o.oilId || o.OilId}
                    />
                  ))}
                </Picker>
              </View>
              {currentOil && (
                <View style={styles.productDetailCard}>
                  <Text style={styles.productDetailTitle}>{currentOil.oilName || currentOil.OilName}</Text>
                  <View style={styles.productDetailGrid}>
                    <InfoRow label="Brand"       value={currentOil.brand      || currentOil.Brand} />
                    <InfoRow label="Viscosity"   value={currentOil.viscosity  || currentOil.Viscosity} />
                    <InfoRow label="Engine Type" value={currentOil.engineType || currentOil.EngineType} />
                    <InfoRow label="Capacity"    value={currentOil.capacity   || currentOil.Capacity} />
                  </View>
                  <View style={styles.productPriceRow}>
                    <Text style={styles.productPriceLabel}>Price</Text>
                    <Text style={styles.productPriceVal}>RS {currentOil.price || currentOil.Price || 0}</Text>
                  </View>
                </View>
              )}

              <View style={styles.productSeparator} />

              {/* Oil Filter */}
              <Text style={styles.inputLabel}>Oil Filter</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={selectedFilterId} onValueChange={setSelectedFilterId} style={styles.picker}>
                  <Picker.Item label="— Select Oil Filter —" value={null} />
                  {filters.map((f, i) => (
                    <Picker.Item
                      key={i}
                      label={`${f.filterName || f.FilterName}  •  RS ${f.price || f.Price || 0}`}
                      value={f.filterId || f.FilterId}
                    />
                  ))}
                </Picker>
              </View>
              {currentFilter && (
                <View style={styles.productDetailCard}>
                  <Text style={styles.productDetailTitle}>{currentFilter.filterName || currentFilter.FilterName}</Text>
                  <View style={styles.productDetailGrid}>
                    <InfoRow label="Brand"         value={currentFilter.brand        || currentFilter.Brand} />
                    <InfoRow label="Vehicle Model" value={currentFilter.vehicleModel  || currentFilter.VehicleModel} />
                    <InfoRow label="Part Number"   value={currentFilter.partNumber    || currentFilter.PartNumber} />
                  </View>
                  <View style={styles.productPriceRow}>
                    <Text style={styles.productPriceLabel}>Price</Text>
                    <Text style={styles.productPriceVal}>RS {currentFilter.price || currentFilter.Price || 0}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* Booking Summary */}
      <SectionLabel icon="📋" text="Booking Summary" />
      <BookingSummaryCard />

      <TouchableOpacity style={styles.primaryBtn} onPress={handleProceed}>
        <Text style={styles.primaryBtnText}>Review & Confirm  →</Text>
      </TouchableOpacity>
    </>
  );

  // ─── STEP 2 ───────────────────────────────────────────────────────────────

  const renderStep2 = () => (
    <>
      {/* Vehicle recap */}
      <SectionLabel icon="🚘" text="Vehicle Details" />
      <View style={styles.recapCard}>
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>Car</Text>
          <Text style={styles.recapVal}>{carModel}  ({regNo})</Text>
        </View>
        {description ? (
          <View style={[styles.recapRow, { alignItems: 'flex-start' }]}>
            <Text style={styles.recapLabel}>Notes</Text>
            <Text style={[styles.recapVal, { flex: 1, textAlign: 'right' }]}>{description}</Text>
          </View>
        ) : null}
      </View>

      {/* Products recap (only if oil service) */}
      {isOilService && (currentOil || currentFilter) && (
        <>
          <SectionLabel icon="🛢️" text="Selected Products" />
          <View style={styles.recapCard}>
            {currentOil && (
              <View style={styles.recapRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recapVal}>{currentOil.oilName || currentOil.OilName}</Text>
                  <Text style={styles.recapSubLabel}>Engine Oil</Text>
                </View>
                <Text style={styles.recapPrice}>RS {oilPrice}</Text>
              </View>
            )}
            {currentFilter && (
              <View style={styles.recapRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recapVal}>{currentFilter.filterName || currentFilter.FilterName}</Text>
                  <Text style={styles.recapSubLabel}>Oil Filter</Text>
                </View>
                <Text style={styles.recapPrice}>RS {filterPrice}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Booking summary */}
      <SectionLabel icon="📋" text="Booking Summary" />
      <BookingSummaryCard />

      {/* Grand total */}
      <View style={styles.totalCard}>
        {isOilService && (currentOil || currentFilter) && (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalRowLabel}>Services</Text>
              <Text style={styles.totalRowVal}>RS {servicesTotal}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalRowLabel}>Products</Text>
              <Text style={styles.totalRowVal}>RS {oilPrice + filterPrice}</Text>
            </View>
            <View style={styles.totalDivider} />
          </>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalGrandLabel}>Total Amount</Text>
          <Text style={styles.totalGrandVal}>RS {grandTotal}</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.confirmBtnRow}>
        <TouchableOpacity style={styles.backBtn2} onPress={() => setStep(1)} disabled={loading}>
          <Text style={styles.backBtn2Text}>← Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && { opacity: 0.6 }]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.confirmBtnText}>Confirm Booking</Text>
          }
        </TouchableOpacity>
      </View>
    </>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(1)} style={styles.backArrow}>
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Vehicle Details' : 'Confirm Booking'}
          </Text>
          {/* Step indicator */}
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? renderStep1() : renderStep2()}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F4F5F8' },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EBEBEB', elevation: 3 },
  backArrow:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F5F8', justifyContent: 'center', alignItems: 'center' },
  backArrowText:{ fontSize: 18, color: '#222' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },

  // Step indicator
  stepRow:      { flexDirection: 'row', alignItems: 'center' },
  stepDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D0D0D0' },
  stepDotActive:{ backgroundColor: '#111' },
  stepLine:     { width: 32, height: 2, backgroundColor: '#D0D0D0', marginHorizontal: 4 },
  stepLineActive:{ backgroundColor: '#111' },

  scrollContent:{ padding: 18 },

  // Section label
  sectionLabelRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10 },
  sectionLabelIcon: { fontSize: 15, marginRight: 7 },
  sectionLabelText: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6 },

  // Input card
  inputCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 18, elevation: 2, borderWidth: 1, borderColor: '#EFEFEF' },
  inputGroup:   { marginBottom: 18 },
  inputLabel:   { fontSize: 11, fontWeight: '700', color: '#AAA', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.4 },
  optionalTag:  { fontSize: 10, fontWeight: '400', color: '#CCC' },
  input:        { borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111', backgroundColor: '#FAFAFA' },
  inputMultiline:{ height: 80, textAlignVertical: 'top' },
  inputReadonly: { backgroundColor: '#F0F0F0', color: '#888' },

  // Picker
  pickerWrapper:{ borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 10, backgroundColor: '#FAFAFA', overflow: 'hidden', marginBottom: 10 },
  picker:       { color: '#111' },

  // Product detail card
  productDetailCard:  { backgroundColor: '#F0F6FF', borderRadius: 12, padding: 14, marginTop: 4, marginBottom: 4, borderWidth: 1, borderColor: '#D8EAFF' },
  productDetailTitle: { fontSize: 14, fontWeight: '700', color: '#1A3A6E', marginBottom: 10 },
  productDetailGrid:  { marginBottom: 4 },
  productPriceRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#D8EAFF' },
  productPriceLabel:  { fontSize: 12, fontWeight: '700', color: '#666' },
  productPriceVal:    { fontSize: 16, fontWeight: '800', color: '#1A3A6E' },
  productSeparator:   { height: 1, backgroundColor: '#EFEFEF', marginVertical: 18 },

  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  infoLabel:    { fontSize: 12, color: '#999', fontWeight: '600' },
  infoValue:    { fontSize: 12, color: '#333', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },

  // Loader
  loaderBox:    { backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 18 },
  loaderText:   { marginTop: 10, color: '#999', fontSize: 13 },

  // Summary card
  summaryCard:  { backgroundColor: '#fff', borderRadius: 16, marginBottom: 18, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: '#EFEFEF' },
  summaryTopRow:{ flexDirection: 'row', alignItems: 'center', padding: 16 },
  summaryStationIcon:{ fontSize: 22, marginRight: 12 },
  summaryStationLabel:{ fontSize: 10, fontWeight: '700', color: '#AAA', textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryStationName: { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 2 },
  summaryDivider:{ height: 1, backgroundColor: '#F0F0F0' },

  summaryMetaGrid:{ flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 8 },
  summaryMetaCell:{ flex: 1, alignItems: 'center' },
  summaryMetaCellDivider:{ width: 1, backgroundColor: '#EFEFEF', marginVertical: 4 },
  summaryMetaIcon:{ fontSize: 16, marginBottom: 4 },
  summaryMetaLabel:{ fontSize: 9, color: '#AAA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  summaryMetaVal: { fontSize: 11, fontWeight: '700', color: '#222', textAlign: 'center' },
  vipBadge:     { backgroundColor: '#FFF8E1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 3, borderWidth: 1, borderColor: '#FFD54F' },
  vipText:      { fontSize: 9, color: '#E6A800', fontWeight: '700' },

  summaryServicesBlock:{ padding: 16 },
  summaryServicesTitle:{ fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryServiceRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  summaryDot:          { width: 5, height: 5, borderRadius: 3, backgroundColor: '#999', marginRight: 8 },
  summaryServiceName:  { flex: 1, fontSize: 13, color: '#333', fontWeight: '500' },
  summaryServicePrice: { fontSize: 13, fontWeight: '700', color: '#2255CC' },
  summaryTotalRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  summaryTotalLabel:   { fontSize: 12, fontWeight: '700', color: '#666' },
  summaryTotalVal:     { fontSize: 14, fontWeight: '800', color: '#111' },

  // Primary button
  primaryBtn:     { backgroundColor: '#111', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 6, elevation: 3 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  // Recap card (step 2)
  recapCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 18, elevation: 2, borderWidth: 1, borderColor: '#EFEFEF' },
  recapRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  recapLabel:   { fontSize: 12, color: '#AAA', fontWeight: '600' },
  recapVal:     { fontSize: 13, color: '#111', fontWeight: '700' },
  recapSubLabel:{ fontSize: 10, color: '#2255CC', fontWeight: '600', marginTop: 2 },
  recapPrice:   { fontSize: 14, fontWeight: '800', color: '#2255CC' },

  // Total card
  totalCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 18, elevation: 2, borderWidth: 1, borderColor: '#EFEFEF' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalRowLabel:{ fontSize: 13, color: '#888' },
  totalRowVal:  { fontSize: 13, color: '#333', fontWeight: '600' },
  totalDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  totalGrandLabel:{ fontSize: 15, fontWeight: '700', color: '#111' },
  totalGrandVal:  { fontSize: 22, fontWeight: '800', color: '#111' },

  // Confirm buttons row
  confirmBtnRow:{ flexDirection: 'row', gap: 12, marginBottom: 6 },
  backBtn2:     { flex: 0.4, paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: '#F0F0F0' },
  backBtn2Text: { fontSize: 14, fontWeight: '700', color: '#555' },
  confirmBtn:   { flex: 0.6, paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: '#111', elevation: 3 },
  confirmBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});

export default addbookingdetail;