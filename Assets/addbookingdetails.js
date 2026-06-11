import React, { useState, useEffect, useContext } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    SafeAreaView, ScrollView, Alert, ActivityIndicator,
    StatusBar, Animated
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { UserContext } from './UserContext';
import { BASE_URL } from './Constants';

const addbookingdetails = ({ navigation }) => {
    const { bookingData, setBookingData, User } = useContext(UserContext);

    const [step, setStep] = useState(1); // 1 = details, 2 = confirm
    const [vehicleDataMap, setVehicleDataMap] = useState({}); // { index: { oilId, filterId, description } }

    const [oils, setOils] = useState([]);
    const [filters, setFilters] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loading, setLoading] = useState(false);

    const isOilService = bookingData?.serviceNames?.some(n =>
        n.toLowerCase().includes("oil change")
    );

    useEffect(() => {
        if (bookingData?.selectedVehicles) {
            const initialMap = {};
            bookingData.selectedVehicles.forEach((_, i) => {
                initialMap[i] = { oilId: null, filterId: null, description: "" };
            });
            setVehicleDataMap(initialMap);
        }
    }, [bookingData?.selectedVehicles]);

    useEffect(() => {
        if (isOilService && bookingData?.stationId) fetchProducts();
    }, [bookingData?.stationId]);

    const fetchProducts = async () => {
        try {
            setLoadingProducts(true);
            const res = await fetch(`${BASE_URL}/Customer/get-oil-filter?stationId=${bookingData.stationId}`);
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

    const getGrandTotal = () => {
        let total = bookingData?.totalAmount || 0;
        Object.values(vehicleDataMap).forEach(v => {
            const o = oils.find(oil => (oil.oilId || oil.OilId) === v.oilId);
            const f = filters.find(fil => (fil.filterId || fil.FilterId) === v.filterId);
            total += (o?.price || o?.Price || 0) + (f?.price || f?.Price || 0);
        });
        return total;
    };

    const handleProceed = () => {
        setStep(2);
    };

    const handleConfirm = async () => {
        try {
            setLoading(true);
            const selectedVehicles = bookingData?.selectedVehicles || [];
            const vehicleCount = selectedVehicles.length || 1;
            const results = [];

            for (let i = 0; i < vehicleCount; i++) {
                const vehicle = selectedVehicles[i] || {};
                const vData = vehicleDataMap[i] || {};

                const vOil = oils.find(o => (o.oilId || o.OilId) === vData.oilId);
                const vFilter = filters.find(f => (f.filterId || f.FilterId) === vData.filterId);
                const vOilPrice = vOil ? (vOil.price || vOil.Price || 0) : 0;
                const vFilterPrice = vFilter ? (vFilter.price || vFilter.Price || 0) : 0;

                let startTime = bookingData.startTime;
                let endTime = bookingData.endTime;
                let bayId = bookingData.availableBayId;

                if (vehicleCount > 1) {
                    const baseDuration = bookingData.duration || 60;
                    if (bookingData.bookingMode === 'sequential') {
                        const start24 = convertTo24Hour(bookingData.startTime);
                        const shiftedStart = shiftTime(start24, (i * baseDuration) / 60);
                        const shiftedEnd = shiftTime(start24, ((i + 1) * baseDuration) / 60);
                        startTime = formatTimeFrom24(shiftedStart);
                        endTime = formatTimeFrom24(shiftedEnd);
                        bayId = bookingData.availableBays[0]?.bayId || bookingData.availableBays[0]?.BayId;
                    } else if (bookingData.bookingMode === 'parallel') {
                        bayId = bookingData.availableBays[i]?.bayId || bookingData.availableBays[i]?.BayId || bookingData.availableBayId;
                    }
                }

                const vehicleServices = (bookingData.selectedServicesList || []).map(s => ({
                    ServiceId: s.serviceId,
                    Price: s.vehiclePrices?.[i]?.price || s.price,
                    Duration: s.duration,
                }));
                const vehicleTotalAmount = vehicleServices.reduce((a, s) => a + s.Price, 0) + vOilPrice + vFilterPrice;

                const payload = {
                    CustomerId: User?.id,
                    StationId: bookingData.stationId,
                    BayId: bayId,
                    BookingDate: bookingData.date,
                    StartTime: startTime,
                    EndTime: endTime,
                    TotalAmount: vehicleTotalAmount,
                    CarNumber: vehicle.numberPlate,
                    CarModel: `${vehicle.carCompany} ${vehicle.carModel}`,
                    Description: vData.description,
                    OilId: vData.oilId,
                    FilterId: vData.filterId,
                    SelectedServices: vehicleServices,
                };

                console.log(`Payload for vehicle ${i + 1}:`, payload);
                const res = await fetch(`${BASE_URL}/Customer/confirm-booking`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const result = await res.json();
                results.push({ ok: res.ok, status: result.status, message: result.message });
            }

            const allSuccess = results.every(r => r.ok && r.status === "success");
            if (allSuccess) {
                Alert.alert("Booking Confirmed!", `${vehicleCount} vehicle(s) scheduled successfully.`);
                setBookingData({
                    serviceIds: [], serviceNames: [], selectedServicesList: [],
                    date: null, startTime: null, endTime: null, totalAmount: 0,
                    carModel: '', carNumber: '', selectedOilId: null, selectedFilterId: null,
                    oilName: '', filterName: '', oilPrice: 0, filterPrice: 0,
                    selectedVehicles: []
                });
                navigation.replace('Customerhome');
            } else {
                const errorMsg = results.find(r => !r.ok || r.status !== "success")?.message || "Some bookings failed.";
                Alert.alert("Partial Failure", errorMsg);
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Server connection failed.");
        } finally {
            setLoading(false);
        }
    };

    // Helper for time formatting
    const convertTo24Hour = (timeStr) => {
        if (!timeStr) return "00:00";
        const normalized = timeStr.toUpperCase().replace(/\s/g, '');
        const modifier = normalized.match(/AM|PM/)?.[0];
        let timePart = normalized.replace(/AM|PM/, '');
        let [hours, minutes] = timePart.split(':');
        let h = parseInt(hours, 10) || 0;
        if (modifier === 'PM' && h < 12) h += 12;
        if (modifier === 'AM' && h === 12) h = 0;
        return `${h.toString().padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
    };

    const shiftTime = (timeStr24, deltaHours) => {
        if (!timeStr24 || timeStr24.includes('NaN')) return "00:00";
        const [h, m] = timeStr24.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return "00:00";
        let totalMinutes = h * 60 + m + Math.round(deltaHours * 60);
        let newH = Math.floor(totalMinutes / 60) % 24;
        let newM = totalMinutes % 60;
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    };

    const formatTimeFrom24 = (time24) => {
        if (!time24 || time24.includes('NaN')) return "12:00 AM";
        let [h, m] = time24.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return "12:00 AM";
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        const displayM = String(m).padStart(2, '0');
        return `${displayH}:${displayM} ${ampm}`;
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

    const BookingSummaryCard = ({ vehicle, vIdx, vData }) => {
        let vStartTime = bookingData?.startTime || '00:00';
        let vEndTime = bookingData?.endTime || '00:00';
        
        if (bookingData?.bookingMode === 'sequential') {
            const baseDuration = bookingData.duration || 60;
            const start24 = convertTo24Hour(bookingData.startTime);
            const vStart24 = shiftTime(start24, (baseDuration * vIdx) / 60);
            const vEnd24 = shiftTime(vStart24, baseDuration / 60);
            vStartTime = formatTimeFrom24(vStart24);
            vEndTime = formatTimeFrom24(vEnd24);
        } else if (bookingData?.bookingMode === 'parallel') {
            const baseDuration = bookingData.duration || 60;
            const start24 = convertTo24Hour(bookingData.startTime);
            const vEnd24 = shiftTime(start24, baseDuration / 60);
            vEndTime = formatTimeFrom24(vEnd24);
        }

        const currentOil = oils.find(o => (o.oilId || o.OilId) === vData?.oilId);
        const currentFilter = filters.find(f => (f.filterId || f.FilterId) === vData?.filterId);
        const oilPrice = currentOil ? (currentOil.price || currentOil.Price || 0) : 0;
        const filterPrice = currentFilter ? (currentFilter.price || currentFilter.Price || 0) : 0;
        
        const vehicleServices = (bookingData?.selectedServicesList || []).map(s => ({
            name: s.serviceName,
            price: s.vehiclePrices?.[vIdx]?.price || s.price,
        }));
        
        const vehicleTotal = vehicleServices.reduce((a, s) => a + s.price, 0) + oilPrice + filterPrice;

        return (
            <View style={styles.summaryCard}>
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
                        <Text style={styles.summaryMetaVal}>{vStartTime} → {vEndTime}</Text>
                    </View>
                    <View style={styles.summaryMetaCellDivider} />
                    <View style={styles.summaryMetaCell}>
                        <Text style={styles.summaryMetaIcon}>🚗</Text>
                        <Text style={styles.summaryMetaLabel}>Vehicle</Text>
                        <Text style={styles.summaryMetaVal}>{vehicle.carCompany} {vehicle.carModel}</Text>
                        {bookingData?.isVip && (
                            <View style={styles.vipBadge}><Text style={styles.vipText}>✨ VIP</Text></View>
                        )}
                    </View>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryServicesBlock}>
                    <Text style={styles.summaryServicesTitle}>🔧  Services & Products</Text>
                    {vehicleServices.map((s, i) => (
                        <SummaryServiceRow key={i} name={s.name} price={s.price} />
                    ))}
                    {currentOil && <SummaryServiceRow name={`Oil: ${currentOil.oilName || currentOil.OilName}`} price={oilPrice} />}
                    {currentFilter && <SummaryServiceRow name={`Filter: ${currentFilter.filterName || currentFilter.FilterName}`} price={filterPrice} />}
                    <View style={styles.summaryTotalRow}>
                        <Text style={styles.summaryTotalLabel}>Vehicle Total</Text>
                        <Text style={styles.summaryTotalVal}>RS {vehicleTotal}</Text>
                    </View>
                </View>
            </View>
        );
    };

    // ─── STEP 1 ───────────────────────────────────────────────────────────────

    const renderStep1 = () => (
        <>
            {bookingData?.selectedVehicles?.map((vehicle, vIdx) => {
                const vData = vehicleDataMap[vIdx] || { oilId: null, filterId: null, description: "" };
                const updateVData = (key, val) => {
                    setVehicleDataMap(prev => ({ ...prev, [vIdx]: { ...prev[vIdx], [key]: val } }));
                };

                return (
                    <View key={vIdx} style={styles.inputCard}>
                        <Text style={[styles.sectionLabelText, { marginBottom: 10, color: 'royalblue' }]}>
                            Vehicle #{vIdx + 1}: {vehicle.carCompany} {vehicle.carModel}
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={styles.inputLabel}>Reg No: {vehicle.numberPlate}</Text>
                            <Text style={styles.vipText}>{vehicle.carType.toUpperCase()}</Text>
                        </View>
                        
                        <SectionLabel icon="📝" text="Description / Problem" />
                        <TextInput
                            style={[styles.input, styles.inputMultiline, {marginBottom: 15}]}
                            placeholder="Enter issues or requirements..."
                            multiline
                            value={vData.description}
                            onChangeText={(t) => updateVData('description', t)}
                        />

                        {isOilService && (
                            <View style={{marginTop: 5, marginBottom: 15}}>
                                <SectionLabel icon="🛢️" text="Product Selection" />
                                <Text style={styles.inputLabel}>Engine Oil</Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker selectedValue={vData.oilId} onValueChange={(val) => updateVData('oilId', val)} style={styles.picker}>
                                        <Picker.Item label="— Select Oil —" value={null} />
                                        {oils.map((o, i) => <Picker.Item key={i} label={`${o.oilName || o.OilName} - RS ${o.price || o.Price}`} value={o.oilId || o.OilId} />)}
                                    </Picker>
                                </View>
                                <Text style={styles.inputLabel}>Oil Filter</Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker selectedValue={vData.filterId} onValueChange={(val) => updateVData('filterId', val)} style={styles.picker}>
                                        <Picker.Item label="— Select Filter —" value={null} />
                                        {filters.map((f, i) => <Picker.Item key={i} label={`${f.filterName || f.FilterName} - RS ${f.price || f.Price}`} value={f.filterId || f.FilterId} />)}
                                    </Picker>
                                </View>
                            </View>
                        )}
                        
                        <SectionLabel icon="📋" text={`Summary`} />
                        <BookingSummaryCard vehicle={vehicle} vIdx={vIdx} vData={vData} />
                    </View>
                );
            })}

            <View style={styles.grandTotalCard}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalVal}>RS {getGrandTotal()}</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleProceed}>
                <Text style={styles.primaryBtnText}>Review & Confirm  →</Text>
            </TouchableOpacity>
        </>
    );

    const renderStep2 = () => (
        <>
            <SectionLabel icon="🚘" text="Vehicles Recap" />
            {bookingData?.selectedVehicles?.map((vehicle, vIdx) => {
                const vData = vehicleDataMap[vIdx] || { oilId: null, filterId: null, description: "" };
                return (
                    <View key={vIdx} style={{marginBottom: 15}}>
                        <BookingSummaryCard vehicle={vehicle} vIdx={vIdx} vData={vData} />
                    </View>
                );
            })}

            <View style={styles.grandTotalCard}>
                <Text style={styles.grandTotalLabel}>Grand Total (All Vehicles)</Text>
                <Text style={styles.grandTotalVal}>RS {getGrandTotal()}</Text>
            </View>

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
    container: { flex: 1, backgroundColor: '#F4F5F8' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EBEBEB', elevation: 3 },
    backArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F5F8', justifyContent: 'center', alignItems: 'center' },
    backArrowText: { fontSize: 18, color: '#222' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },

    // Step indicator
    stepRow: { flexDirection: 'row', alignItems: 'center' },
    stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D0D0D0' },
    stepDotActive: { backgroundColor: '#111' },
    stepLine: { width: 32, height: 2, backgroundColor: '#D0D0D0', marginHorizontal: 4 },
    stepLineActive: { backgroundColor: '#111' },

    scrollContent: { padding: 18 },

    // Section label
    sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10 },
    sectionLabelIcon: { fontSize: 15, marginRight: 7 },
    sectionLabelText: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6 },

    // Input card
    inputCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 18, elevation: 2, borderWidth: 1, borderColor: '#EFEFEF' },
    inputGroup: { marginBottom: 18 },
    inputLabel: { fontSize: 11, fontWeight: '700', color: '#AAA', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.4 },
    optionalTag: { fontSize: 10, fontWeight: '400', color: '#CCC' },
    input: { borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111', backgroundColor: '#FAFAFA' },
    inputMultiline: { height: 80, textAlignVertical: 'top' },
    inputReadonly: { backgroundColor: '#F0F0F0', color: '#888' },

    // Picker
    pickerWrapper: { borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 10, backgroundColor: '#FAFAFA', overflow: 'hidden', marginBottom: 10 },
    picker: { color: '#111' },

    // Product detail card
    productDetailCard: { backgroundColor: '#F0F6FF', borderRadius: 12, padding: 14, marginTop: 4, marginBottom: 4, borderWidth: 1, borderColor: '#D8EAFF' },
    productDetailTitle: { fontSize: 14, fontWeight: '700', color: '#1A3A6E', marginBottom: 10 },
    productDetailGrid: { marginBottom: 4 },
    productPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#D8EAFF' },
    productPriceLabel: { fontSize: 12, fontWeight: '700', color: '#666' },
    productPriceVal: { fontSize: 16, fontWeight: '800', color: '#1A3A6E' },
    productSeparator: { height: 1, backgroundColor: '#EFEFEF', marginVertical: 18 },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    infoLabel: { fontSize: 12, color: '#999', fontWeight: '600' },
    infoValue: { fontSize: 12, color: '#333', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },

    // Loader
    loaderBox: { backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 18 },
    loaderText: { marginTop: 10, color: '#999', fontSize: 13 },

    // Summary card
    summaryCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 18, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: '#EFEFEF' },
    summaryTopRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    summaryStationIcon: { fontSize: 22, marginRight: 12 },
    summaryStationLabel: { fontSize: 10, fontWeight: '700', color: '#AAA', textTransform: 'uppercase', letterSpacing: 0.4 },
    summaryStationName: { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 2 },
    summaryDivider: { height: 1, backgroundColor: '#F0F0F0' },

    summaryMetaGrid: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 8 },
    summaryMetaCell: { flex: 1, alignItems: 'center' },
    summaryMetaCellDivider: { width: 1, backgroundColor: '#EFEFEF', marginVertical: 4 },
    summaryMetaIcon: { fontSize: 16, marginBottom: 4 },
    summaryMetaLabel: { fontSize: 9, color: '#AAA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
    summaryMetaVal: { fontSize: 11, fontWeight: '700', color: '#222', textAlign: 'center' },
    vipBadge: { backgroundColor: '#FFF8E1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 3, borderWidth: 1, borderColor: '#FFD54F' },
    vipText: { fontSize: 9, color: '#E6A800', fontWeight: '700' },

    summaryServicesBlock: { padding: 16 },
    summaryServicesTitle: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
    summaryServiceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    summaryDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#999', marginRight: 8 },
    summaryServiceName: { flex: 1, fontSize: 13, color: '#333', fontWeight: '500' },
    summaryServicePrice: { fontSize: 13, fontWeight: '700', color: '#2255CC' },
    summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    summaryTotalLabel: { fontSize: 12, fontWeight: '700', color: '#666' },
    summaryTotalVal: { fontSize: 14, fontWeight: '800', color: '#111' },

    // Primary button
    primaryBtn: { backgroundColor: '#111', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 6, elevation: 3 },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

    // Confirm buttons row
    confirmBtnRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
    backBtn2: { flex: 0.4, paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: '#F0F0F0' },
    backBtn2Text: { fontSize: 14, fontWeight: '700', color: '#555' },
    confirmBtn: { flex: 0.6, paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: '#111', elevation: 3 },
    confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

    // Grand total card
    grandTotalCard: { backgroundColor: '#111', borderRadius: 16, padding: 18, marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3 },
    grandTotalLabel: { fontSize: 14, color: '#fff', fontWeight: '600' },
    grandTotalVal: { fontSize: 20, fontWeight: '800', color: '#fff' },

    // Multi-vehicle blocks
    vehicleInputBlock: { marginBottom: 25, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3, borderWidth: 1, borderColor: '#EBEBEB' },
    vehicleBlockTitle: { fontSize: 16, fontWeight: '700', color: '#1A3A6E', marginBottom: 4 },
    vehicleRegText: { fontSize: 13, color: '#666', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
    productSeparator: { height: 1, backgroundColor: '#EBEBEB', marginVertical: 15 },
});

export default addbookingdetails;