import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
  ScrollView, TextInput, Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BASE_URL } from './Constants';
import { UserContext } from './UserContext';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const SCOPES = [
  { key: 'SingleService', label: '🔧 Single Service', desc: 'Discount on a specific service' },
  { key: 'SingleProduct', label: '📦 Single Product', desc: 'Discount on a specific product' },
  { key: 'AllServices',   label: '🔧🔧 All Services',  desc: 'Applies to all station services' },
  { key: 'AllProducts',   label: '📦📦 All Products',  desc: 'Applies to all station products' },
  { key: 'StationWide',   label: '🏪 Station Wide',   desc: 'Applies to entire station — services + products' },
];

/* ─────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────── */
const offers = ({ navigation }) => {
  const { User } = useContext(UserContext);

  /* ── state ── */
  const [stations,    setStations]    = useState([]);
  const [selectedStn, setSelectedStn] = useState(null);
  const [services,    setServices]    = useState([]);
  const [products,    setProducts]    = useState([]);
  const [discounts,   setDiscounts]   = useState([]);
  const [loading,     setLoading]     = useState(false);

  /* form */
  const [scope,           setScope]           = useState('SingleService');
  const [selectedId,      setSelectedId]      = useState(null);
  const [discountType,    setDiscountType]    = useState('Percentage');
  const [discountVal,     setDiscountVal]     = useState('');
  const [label,           setLabel]           = useState('');
  const [startDate,       setStartDate]       = useState(new Date());
  const [endDate,         setEndDate]         = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  /* modals */
  const [showForm,      setShowForm]      = useState(false);
  const [showScopePick, setShowScopePick] = useState(false); // scope selector
  const [showItemPick,  setShowItemPick]  = useState(false); // service/product picker

  /* ── fetch ── */
  useEffect(() => { fetchStations(); }, []);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const res    = await fetch(`${BASE_URL}/Station/getstationlist/${User?.id}`);
      const result = await res.json();
      if (result.status === 'success' && result.data.length > 0) {
        console.log(result.data)
        setStations(result.data);
        const first = result.data[0].stationId;
        setSelectedStn(first);
        fetchAll(first);
      }
    } catch { Alert.alert('Error', 'Could not load stations.'); }
    finally  { setLoading(false); }
  };

  const fetchAll = async (stnId) => {
    setLoading(true);

    // Services — independent call
    try {
      const svcRes = await fetch(`${BASE_URL}/Station/getservicesbystation/${stnId}`);
      const svcJ   = await svcRes.json();
      console.log('Services:', svcJ);
      setServices(svcJ.status === 'success' ? svcJ.data : []);
    } catch (e) { console.log('Services fetch error:', e); }

    // Products — independent call
    try {
      const prdRes = await fetch(`${BASE_URL}/Station/getproductsbystation/${stnId}`);
      const prdJ   = await prdRes.json();
      console.log('Products:', prdJ);
      setProducts(prdJ.status === 'success' ? prdJ.data : []);
    } catch (e) { console.log('Products fetch error:', e); }

    // Discounts — independent call
    try {
      const discRes = await fetch(`${BASE_URL}/Station/getdiscount/${stnId}`);
      const discJ   = await discRes.json();
      console.log('Discounts:', discJ);
      setDiscounts(Array.isArray(discJ) ? discJ : []);
    } catch (e) { console.log('Discounts fetch error:', e); }

    setLoading(false);
  };

  const handleStationPress = (id) => {
    setSelectedStn(id);
    fetchAll(id);
  };

  /* ── scope helpers ── */
  const needsItemPick = scope === 'SingleService' || scope === 'SingleProduct';
  const pickList      = scope === 'SingleService' ? services : products;
  const pickIdKey     = scope === 'SingleService' ? 'serviceId'   : 'productId';
  const pickNmKey     = scope === 'SingleService' ? 'serviceName' : 'productName';
  const selectedName  = pickList.find(x => x[pickIdKey] === selectedId)?.[pickNmKey];
  const scopeLabel    = SCOPES.find(s => s.key === scope)?.label ?? scope;

  /* ── submit ── */
  const handleSubmit = async () => {
    if (needsItemPick && !selectedId)
      return Alert.alert('Missing', 'Please select an item.');
    if (!discountVal)
      return Alert.alert('Missing', 'Please enter a discount value.');
    if (endDate <= startDate)
      return Alert.alert('Error', 'End date must be after the start date.');

    const body = {
      stationId:     selectedStn,
      scope,
      serviceId:     scope === 'SingleService' ? selectedId : null,
      productId:     scope === 'SingleProduct' ? selectedId : null,
      discountType,
      discountValue: parseFloat(discountVal),
      label:         label || null,
      startDate:     startDate.toISOString().slice(0, 10) + 'T00:00:00',
      endDate:       endDate.toISOString().slice(0, 10)   + 'T23:59:59',
      isActive:      true,
    };

    try {
      setLoading(true);
      const res    = await fetch(`${BASE_URL}/Station/AddDiscount`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const result = await res.json();
      console.log(res)
      if (res.ok) {
        Alert.alert('✓ Done', 'Discount added successfully!');
        resetForm();
        setShowForm(false);
        fetchAll(selectedStn);
      } else {
        Alert.alert('Error', result.message || 'Something went wrong.');
      }
    } catch { Alert.alert('Error', 'Failed to connect to server.'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setScope('SingleService'); setSelectedId(null);
    setDiscountType('Percentage'); setDiscountVal('');
    setLabel('');
    setStartDate(new Date()); setEndDate(new Date());
  };

  const handleDeactivate = (discountId) => {
    Alert.alert('Confirm', 'Do you want to deactivate this discount?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Deactivate', style: 'destructive',
        onPress: async () => {
          try {
          const res=  await fetch(
              `${BASE_URL}/Station/deactivate/${discountId}`,
              { method: 'PUT' }
            );
            const result = await res.json();
            if (result.status ==='success') {
           Alert.alert('✓ Done', result.message);
            }
            fetchAll(selectedStn);
            console.log(res)
          } catch { Alert.alert('Error', 'Could not deactivate.'); }
        },
      },
    ]);
  };

  const activeDiscounts   = discounts.filter(d => d.isActive);
  const inactiveDiscounts = discounts.filter(d => !d.isActive);

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  if (loading && !showForm) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={s.loaderTxt}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Discounts</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          <Text style={s.addBtnTxt}>+ Set Offer</Text>
        </TouchableOpacity>
      </View>

      {/* ── Station Chips ── */}
      <View style={s.chipsWrapper}>
        <FlatList
          horizontal data={stations} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 15 }}
          keyExtractor={i => i.stationId.toString()}
          renderItem={({ item }) => {
            const sel = item.stationId === selectedStn;
            return (
              <TouchableOpacity
                style={[s.chip, sel && s.chipSel]}
                onPress={() => handleStationPress(item.stationId)}
              >
                <Text style={[s.chipTxt, sel && s.chipTxtSel]}>{item.stationName}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Discounts List ── */}
      <ScrollView contentContainerStyle={s.listPad} showsVerticalScrollIndicator={false}>

        {discounts.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏷️</Text>
            <Text style={s.emptyTxt}>No discounts have been set yet.</Text>
            <Text style={s.emptyHint}>Tap "+ Set Offer" above to add a new discount.</Text>
          </View>
        )}

        {activeDiscounts.length > 0 && (
          <>
            <Text style={s.sectionHead}>ACTIVE OFFERS</Text>
            {activeDiscounts.map(d => (
              <DiscountCard key={d.discountId} discount={d} onDeactivate={handleDeactivate} />
            ))}
          </>
        )}

        {inactiveDiscounts.length > 0 && (
          <>
            <Text style={[s.sectionHead, { color: '#aaa', marginTop: 20 }]}>
              EXPIRED / INACTIVE
            </Text>
            {inactiveDiscounts.map(d => (
              <DiscountCard key={d.discountId} discount={d} inactive />
            ))}
          </>
        )}

      </ScrollView>

      {/* ═══════════════════════════════════════
          ADD DISCOUNT MODAL
      ══════════════════════════════════════ */}
      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={s.modal}>

          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={s.backTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Discount</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={s.formPad} showsVerticalScrollIndicator={false}>

            {/* ── Scope Selector ── */}
            <Text style={s.fieldLabel}>Discount Scope</Text>
            <TouchableOpacity
              style={s.pickerTrigger}
              onPress={() => setShowScopePick(true)}
            >
              <Text style={s.pickerVal}>{scopeLabel}</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>

            {/* ── Service / Product Picker (only for Single scope) ── */}
            {needsItemPick && (
              <>
                <Text style={s.fieldLabel}>
                  {scope === 'SingleService' ? 'Choose a Service' : 'Choose a Product'}
                </Text>
                <TouchableOpacity
                  style={s.pickerTrigger}
                  onPress={() => setShowItemPick(true)}
                >
                  <Text style={selectedName ? s.pickerVal : s.pickerPlaceholder}>
                    {selectedName ||
                      (scope === 'SingleService'
                        ? 'Tap to select service...'
                        : 'Tap to select product...')}
                  </Text>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Wide scope info box ── */}
            {!needsItemPick && (
              <View style={s.infoBox}>
                <Text style={s.infoBoxTxt}>
                  {scope === 'AllServices'
                    ? '🔧  This discount will apply to ALL services at this station.'
                    : scope === 'AllProducts'
                    ? '📦  This discount will apply to ALL products at this station.'
                    : '🏪  This discount will apply to the entire station — both services and products.'}
                </Text>
              </View>
            )}

            {/* ── Discount Type Radio ── */}
            <Text style={s.fieldLabel}>Discount Type</Text>
            <View style={s.radioRow}>
              {['Percentage', 'Flat'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={s.radioOpt}
                  onPress={() => setDiscountType(t)}
                >
                  <View style={[s.radioCircle, discountType === t && s.radioFilled]}>
                    {discountType === t && <View style={s.radioDot} />}
                  </View>
                  <View>
                    <Text style={s.radioLabel}>
                      {t === 'Percentage' ? 'Percentage (%)' : 'Flat Amount'}
                    </Text>
                    <Text style={s.radioHint}>
                      {t === 'Percentage' ? 'e.g. 20% off on price' : 'e.g. Rs. 500 off'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Discount Value ── */}
            <Text style={s.fieldLabel}>
              {discountType === 'Percentage' ? 'Percentage Value (0–100)' : 'Amount (Rs.)'}
            </Text>
            <View style={s.inputWrap}>
              <Text style={s.inputPrefix}>
                {discountType === 'Percentage' ? '%' : 'Rs.'}
              </Text>
              <TextInput
                style={s.input}
                placeholder={discountType === 'Percentage' ? '20' : '500'}
                value={discountVal}
                onChangeText={setDiscountVal}
                keyboardType="numeric"
                placeholderTextColor="#bbb"
              />
            </View>

            {/* ── Label ── */}
            <Text style={s.fieldLabel}>
              Offer Label  <Text style={s.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[s.input, s.inputFull]}
              placeholder="e.g.  Eid Sale, Friday Offer, Mega Sale..."
              value={label}
              onChangeText={setLabel}
              placeholderTextColor="#bbb"
            />

            {/* ── Start Date ── */}
            <Text style={s.fieldLabel}>Start Date</Text>
            <TouchableOpacity
              style={s.pickerTrigger}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={s.pickerVal}>📅  {startDate.toDateString()}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="calendar"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}

            {/* ── End Date ── */}
            <Text style={s.fieldLabel}>End Date</Text>
            <TouchableOpacity
              style={s.pickerTrigger}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={s.pickerVal}>📅  {endDate.toDateString()}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="calendar"
                minimumDate={startDate}
                onChange={(event, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}

            {/* ── Submit ── */}
            <TouchableOpacity
              style={[s.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitTxt}>Apply Discount</Text>
              }
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════
          SCOPE PICKER MODAL
      ══════════════════════════════════════ */}
      <Modal
        visible={showScopePick}
        animationType="slide"
        onRequestClose={() => setShowScopePick(false)}
      >
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowScopePick(false)}>
              <Text style={s.backTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Select Scope</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 15 }}>
            {SCOPES.map(sc => {
              const isChosen = sc.key === scope;
              return (
                <TouchableOpacity
                  key={sc.key}
                  style={[s.scopeItem, isChosen && s.scopeItemSel]}
                  onPress={() => {
                    setScope(sc.key);
                    setSelectedId(null);
                    setShowScopePick(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.scopeItemLabel, isChosen && s.scopeItemLabelSel]}>
                      {sc.label}
                    </Text>
                    <Text style={s.scopeItemDesc}>{sc.desc}</Text>
                  </View>
                  {isChosen && <Text style={s.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════
          SERVICE / PRODUCT ITEM PICKER MODAL
      ══════════════════════════════════════ */}
      <Modal
        visible={showItemPick}
        animationType="slide"
        onRequestClose={() => setShowItemPick(false)}
      >
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowItemPick(false)}>
              <Text style={s.backTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>
              {scope === 'SingleService' ? 'Select Service' : 'Select Product'}
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <FlatList
            data={pickList}
            keyExtractor={i => i[pickIdKey].toString()}
            contentContainerStyle={{ padding: 15 }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyTxt}>
                  No {scope === 'SingleService' ? 'services' : 'products'} found.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isChosen = item[pickIdKey] === selectedId;
              return (
                <TouchableOpacity
                  style={[s.pickItem, isChosen && s.pickItemSel]}
                  onPress={() => { setSelectedId(item[pickIdKey]); setShowItemPick(false); }}
                >
                  <Text style={[s.pickItemTxt, isChosen && s.pickItemTxtSel]}>
                    {item[pickNmKey]}
                  </Text>
                  {isChosen && <Text style={s.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

/* ─────────────────────────────────────────────
   DISCOUNT CARD COMPONENT
───────────────────────────────────────────── */
const SCOPE_META = {
  SingleService: { icon: '🔧', label: 'Single Service' },
  SingleProduct: { icon: '📦', label: 'Single Product' },
  AllServices:   { icon: '🔧🔧', label: 'All Services'  },
  AllProducts:   { icon: '📦📦', label: 'All Products'  },
  StationWide:   { icon: '🏪', label: 'Station Wide'  },
};

const DiscountCard = ({ discount: d, onDeactivate, inactive }) => {
  const isPercent = d.discountType === 'Percentage';
  const valueStr  = isPercent ? `${d.discountValue}% OFF` : `Rs. ${d.discountValue} OFF`;
  const meta      = SCOPE_META[d.scope] ?? { icon: '🏷️', label: d.scope };
  const start     = d.startDate?.slice(0, 10);
  const end       = d.endDate?.slice(0, 10);

  return (
    <View style={[dc.card, inactive && dc.cardInactive]}>

      {/* Top row: badge + value */}
      <View style={dc.topRow}>
        <View style={[dc.badge, inactive && dc.badgeInactive]}>
          <Text style={[dc.badgeTxt, inactive && dc.badgeTxtInactive]}>
            {inactive ? 'Inactive' : '🟢 Active'}
          </Text>
        </View>
        <Text style={[dc.value, inactive && dc.valueInactive]}>{valueStr}</Text>
      </View>

      {/* Label */}
      {d.label && <Text style={dc.labelTxt}>🏷️  {d.label}</Text>}

      {/* Scope pill */}
      <View style={dc.scopePill}>
        <Text style={dc.scopeTxt}>{meta.icon}  {meta.label}</Text>
      </View>

      {/* Dates */}
      <View style={dc.infoRow}>
        <Text style={dc.infoTxt}>📅 {start} → {end}</Text>
      </View>

      {/* Deactivate */}
      {!inactive && onDeactivate && (
        <TouchableOpacity
          style={dc.deactBtn}
          onPress={() => onDeactivate(d.discountId)}
        >
          <Text style={dc.deactTxt}>Deactivate</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fcfcfc' },
  loader:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  loaderTxt:   { marginTop: 12, color: 'gray', fontWeight: 'bold' },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  addBtn:      { backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22 },
  addBtnTxt:   { color: '#fff', fontWeight: '700', fontSize: 13 },

  chipsWrapper: { paddingVertical: 14, backgroundColor: 'white',
                  borderBottomWidth: 1, borderColor: '#eee' },
  chip:         { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 25,
                  backgroundColor: '#f5f5f5', marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  chipSel:      { backgroundColor: '#000', borderColor: '#000' },
  chipTxt:      { fontSize: 13, fontWeight: '600', color: '#777' },
  chipTxtSel:   { color: '#fff' },

  listPad:     { padding: 15, paddingBottom: 40 },
  sectionHead: { fontSize: 12, fontWeight: '800', color: '#555',
                 letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },

  empty:       { alignItems: 'center', marginTop: 80 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyTxt:    { fontSize: 15, color: '#888', fontWeight: '600' },
  emptyHint:   { fontSize: 12, color: '#bbb', marginTop: 6 },

  modal:       { flex: 1, backgroundColor: '#fafafa' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
                 borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle:  { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  backTxt:     { fontSize: 20, color: '#555', width: 32, textAlign: 'center' },
  formPad:     { padding: 20 },

  fieldLabel:  { fontSize: 12, fontWeight: '700', color: '#555', marginTop: 20,
                 marginBottom: 8, letterSpacing: 0.5 },
  optional:    { fontWeight: '400', color: '#bbb' },

  pickerTrigger:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                       borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 12,
                       paddingHorizontal: 14, paddingVertical: 14, backgroundColor: 'white' },
  pickerVal:         { fontSize: 14, color: '#1a1a1a', fontWeight: '600', flex: 1 },
  pickerPlaceholder: { fontSize: 14, color: '#bbb', flex: 1 },
  chevron:           { fontSize: 20, color: '#aaa' },

  infoBox:    { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: '#bae6fd', marginTop: 4 },
  infoBoxTxt: { fontSize: 13, color: '#0369a1', fontWeight: '500', lineHeight: 20 },

  radioRow:    { gap: 12 },
  radioOpt:    { flexDirection: 'row', alignItems: 'center', gap: 12,
                 backgroundColor: 'white', borderRadius: 12, padding: 14,
                 borderWidth: 1.5, borderColor: '#eee' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                 borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  radioFilled: { borderColor: '#000' },
  radioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#000' },
  radioLabel:  { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  radioHint:   { fontSize: 11, color: '#999', marginTop: 2 },

  inputWrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
                 borderColor: '#e5e5e5', borderRadius: 12, backgroundColor: 'white',
                 paddingHorizontal: 14, paddingVertical: 4 },
  inputPrefix: { fontSize: 16, fontWeight: '800', color: '#555', marginRight: 8 },
  input:       { flex: 1, fontSize: 16, color: '#1a1a1a', paddingVertical: 12 },
  inputFull:   { borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 12,
                 backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 14,
                 fontSize: 14, color: '#1a1a1a' },

  submitBtn:   { backgroundColor: '#000', paddingVertical: 16, borderRadius: 14,
                 alignItems: 'center', marginTop: 28 },
  submitTxt:   { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  /* scope picker items */
  scopeItem:      { padding: 16, borderRadius: 12, backgroundColor: 'white',
                    marginBottom: 10, borderWidth: 1.5, borderColor: '#eee',
                    flexDirection: 'row', alignItems: 'center' },
  scopeItemSel:   { borderColor: '#000', backgroundColor: '#f8f8f8' },
  scopeItemLabel: { fontSize: 14, fontWeight: '700', color: '#333' },
  scopeItemLabelSel: { color: '#000' },
  scopeItemDesc:  { fontSize: 12, color: '#999', marginTop: 3 },

  /* item picker */
  pickItem:       { padding: 16, borderRadius: 12, backgroundColor: 'white',
                    marginBottom: 8, borderWidth: 1.5, borderColor: '#eee',
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickItemSel:    { borderColor: '#000', backgroundColor: '#f8f8f8' },
  pickItemTxt:    { fontSize: 14, color: '#333', fontWeight: '600' },
  pickItemTxtSel: { color: '#000' },
  checkmark:      { fontSize: 18, color: '#000', fontWeight: 'bold' },
});

const dc = StyleSheet.create({
  card:             { backgroundColor: 'white', borderRadius: 16, padding: 16,
                      marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0',
                      elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  cardInactive:     { backgroundColor: '#fafafa', borderColor: '#ebebeb' },
  topRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge:            { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeInactive:    { backgroundColor: '#f3f4f6' },
  badgeTxt:         { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  badgeTxtInactive: { color: '#9ca3af' },
  value:            { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },
  valueInactive:    { color: '#aaa' },
  labelTxt:         { fontSize: 13, color: '#555', marginTop: 6, fontWeight: '500' },
  scopePill:        { alignSelf: 'flex-start', backgroundColor: '#f3f4f6', borderRadius: 20,
                      paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  scopeTxt:         { fontSize: 11, fontWeight: '700', color: '#374151' },
  infoRow:          { marginTop: 8 },
  infoTxt:          { fontSize: 11, color: '#999' },
  deactBtn:         { marginTop: 12, backgroundColor: '#fff5f5', paddingVertical: 9,
                      borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  deactTxt:         { fontSize: 13, fontWeight: '700', color: '#ef4444' },
});

export default offers;
