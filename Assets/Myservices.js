import React, { useState, useEffect, useContext } from 'react';
import {StyleSheet,View,Text,FlatList,TouchableOpacity,SafeAreaView,StatusBar,ActivityIndicator,Dimensions,Alert} from 'react-native';
const { width } = Dimensions.get('window');
import { BASE_URL } from "./Constants"
import { UserContext } from "./UserContext";

const MyServices = ({navigation}) => {
  const { User, setservicedata, setbayservice, servicedata, bayservice } = useContext(UserContext);

  const [selectedStationId, setSelectedStationId] = useState(1);
  const [loading, setloading]                     = useState(false);
  const [stations, setstations]                   = useState([]);
  const [services, setServices]                   = useState([]);

  const handleStationPress = (id) => {
    setSelectedStationId(id);
    fetchServices(id);
  };

  useEffect(() => { fetchStations(); }, []);

  const fetchStations = async () => {
    try {
      setloading(true);
      const response = await fetch(`${BASE_URL}/Station/getstationlist/${User?.id}`);
      const result   = await response.json();
      if (result.status === "success") {
        setstations(result.data);
        console.log("STATIONS:", result.data);
        if (result.data.length > 0) {
          const firstId = result.data[0].stationId;
          setSelectedStationId(firstId);
          fetchServices(firstId);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Stations loading failed. Please check your connection.");
    } finally {
      setloading(false);
    }
  };

  const fetchServices = async (stationId) => {
    try {
      setloading(true);
      const response = await fetch(`${BASE_URL}/Station/getservicesbystation/${stationId}`);
      const result   = await response.json();
      console.log("SERVICES:", result.data);
      if (result.status === "success") {
        setServices(result.data);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.log("Services Error:", error);
    } finally {
      setloading(false);
    }
  };

  const DeleteService = (Id) => {
    Alert.alert(
      "Delete Service",
      "This will permanently delete your Service data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDeleteService(Id) }
      ]
    );
  };

  const handleDeleteService = async (serviceId) => {
    try {
      const response = await fetch(`${BASE_URL}/Station/deleteservice/${serviceId}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.status === "success") {
        Alert.alert("Deleted", "Service has been removed.");
        fetchServices(selectedStationId);
      } else {
        Alert.alert("Error", result.message || "Failed to delete");
      }
    } catch (error) {
      console.log("Delete Error:", error);
      Alert.alert("Error", "Server connection failed");
    }
  };

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

  const PriceBox = ({ label, original, final, isVip }) => {
    // Robust check for discount (handle undefined/null/equal)
    const hasDiscount = final !== undefined && final !== null && final !== original && final > 0;
    const displayPrice = hasDiscount ? final : original;

    return (
      <View style={styles.priceBox}>
        <Text style={[styles.priceLabel, isVip && styles.vipLabel]}>
          {isVip ? '✨ ' : ''}{label}
        </Text>
        <View style={{ alignItems: 'center' }}>
          {hasDiscount && (
            <Text style={styles.originalPriceCut}>
              {original}
            </Text>
          )}
          <Text style={[styles.priceValue, isVip && styles.vipValue, hasDiscount && styles.discountedPrice]}>
            {displayPrice ?? '0'} <Text style={styles.currency}>PKR</Text>
          </Text>
        </View>
      </View>
    );
  };

  const renderServiceItem = ({ item }) => {
    // Extracting prices with both PascalCase and camelCase support
    const prices = {
      nsOrig: item.OriginalNormalSmall ?? item.originalNormalSmall ?? item.normalPriceSmall,
      nsFinal: item.FinalNormalSmall ?? item.finalNormalSmall,
      nlOrig: item.OriginalNormalLarge ?? item.originalNormalLarge ?? item.normalPriceLarge,
      nlFinal: item.FinalNormalLarge ?? item.finalNormalLarge,
      vsOrig: item.OriginalVIPSmall ?? item.originalVIPSmall ?? item.vipPriceSmall,
      vsFinal: item.FinalVIPSmall ?? item.finalVIPSmall,
      vlOrig: item.OriginalVIPLarge ?? item.originalVIPLarge ?? item.vipPriceLarge,
      vlFinal: item.FinalVIPLarge ?? item.finalVIPLarge,
    };

    return (
      <View style={styles.card}>
  
        {/* ── Header ── */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.serviceTitle}>{item.serviceName}</Text>
              {(item.HasDiscount || item.hasDiscount) && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{item.DiscountLabel || item.discountLabel || 'OFFER'}</Text>
                </View>
              )}
            </View>
            <Text style={styles.durationText}>⏱ Duration: {item.duration ?? '—'} mins</Text>
          </View>
        </View>
  
        {/* ── Rating Row ── */}
        {/* <View style={styles.ratingRow}>
          <View style={styles.starsWrap}>
            {[1,2,3,4,5].map(star => (
              <Text key={star} style={[styles.star,
                {color: star <= Math.round(item.averageRating) ? '#F5A623' : '#E0E0E0'}]}>
                ★
              </Text>
            ))}
          </View>
          <Text style={styles.ratingNum}>
            {item.averageRating > 0 ? item.averageRating.toFixed(1) : 'No ratings'}
          </Text>
          <Text style={styles.reviewCount}>
            ({item.totalReviews} {item.totalReviews === 1 ? 'review' : 'reviews'})
          </Text>
          <TouchableOpacity
            style={styles.svcRatingBtn}
            onPress={() => navigation.navigate('ShowServiceReview', {
              serviceId:   item.serviceId,
              serviceName: item.serviceName
            })}
          >
            <Text style={styles.svcRatingBtnText}>Reviews</Text>
          </TouchableOpacity>
        </View> */}
  
        {/* ── 4 Price Grid ── */}
        <View style={styles.priceGrid}>
          {/* Row 1: Normal Prices */}
          <View style={styles.priceRow}>
            <PriceBox label="NORMAL — SMALL" original={prices.nsOrig} final={prices.nsFinal} />
            <View style={styles.verticalDivider} />
            <PriceBox label="NORMAL — LARGE" original={prices.nlOrig} final={prices.nlFinal} />
          </View>
  
          <View style={styles.horizontalDivider} />
  
          {/* Row 2: VIP Prices */}
          <View style={styles.priceRow}>
            <PriceBox label="VIP — SMALL" original={prices.vsOrig} final={prices.vsFinal} isVip />
            <View style={styles.verticalDivider} />
            <PriceBox label="VIP — LARGE" original={prices.vlOrig} final={prices.vlFinal} isVip />
          </View>
        </View>
  
        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => { setservicedata(item); navigation.navigate('updateservice'); }}
          >
            <Text style={styles.editBtnText}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => DeleteService(item.serviceId)}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Station Services</Text>
      </View>

      {/* Station Chips */}
      <View style={styles.stationListWrapper}>
        <FlatList
          horizontal
          data={stations}
          renderItem={renderStationChip}
          keyExtractor={(item) => item.stationId.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 15 }}
        />
      </View>

      {/* Services List */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="black" />
          <Text style={{ marginTop: 10, color: 'gray' }}>Updating List...</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          renderItem={renderServiceItem}
          keyExtractor={item => item.serviceId?.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.centerLoader}>
              <Text style={styles.emptyText}>No services found for this station.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fcfcfc' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginLeft: 80 },

  stationListWrapper: { paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  chip:         { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, backgroundColor: '#f5f5f5', marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  selectedChip: { backgroundColor: '#000', borderColor: '#000' },
  chipText:     { fontSize: 13, fontWeight: '600', color: '#777' },
  whiteText:    { color: 'white' },

  listContainer: { padding: 15 },
  card: {
    backgroundColor: 'white', borderRadius: 18, padding: 18, marginBottom: 15,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    borderWidth: 1, borderColor: '#f0f0f0'
  },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  serviceTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  durationText: { fontSize: 12, color: 'gray', marginTop: 4 },

  // ── 4 Price Grid ──
  priceGrid: {
    backgroundColor: '#F9FAFB', borderRadius: 12,
    marginTop: 15, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  priceRow:        { flexDirection: 'row' },
  priceBox:        { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
  verticalDivider: { width: 1, backgroundColor: '#E5E7EB' },
  horizontalDivider: { height: 1, backgroundColor: '#E5E7EB' },
  priceLabel:      { fontSize: 9, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 5, textAlign: 'center' },
  priceValue:      { fontSize: 16, fontWeight: '800', color: '#374151' },
  vipLabel:        { color: '#D4AF37' },
  vipValue:        { color: '#000' },
  currency:        { fontSize: 10, fontWeight: 'normal' },

  actionRow:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  editBtn:      { flex: 0.48, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#f5f5f5' },
  deleteBtn:    { flex: 0.48, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#FFF5F5' },
  editBtnText:  { fontSize: 13, fontWeight: 'bold', color: '#444' },
  deleteBtnText:{ fontSize: 13, fontWeight: 'bold', color: '#FF4444' },

  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText:    { color: '#999', fontSize: 14 },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  starsWrap:   { flexDirection: 'row', marginRight: 6 },
  star:        { fontSize: 16, marginRight: 1 },
  ratingNum:   { fontSize: 13, fontWeight: 'bold', color: '#333', marginRight: 4 },
  reviewCount: { fontSize: 12, color: '#999' },
  svcRatingBtn: { marginLeft: 'auto', backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20},
  svcRatingBtnText: { fontSize: 11, fontWeight: 'bold', color: '#555'},
  originalPriceCut: { fontSize: 10, color: '#999', textDecorationLine: 'line-through', marginBottom: -2 },
  discountedPrice: { color: '#e53935' },
  discountBadge: { backgroundColor: '#e53935', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 10 },
  discountBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
});

export default MyServices;