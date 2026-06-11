import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity, Image,
  SafeAreaView, Alert, ActivityIndicator, Modal, Dimensions,
  StatusBar, ScrollView
} from 'react-native';
import { UserContext } from './UserContext';
import { BASE_URL } from "./Constants";
import { getDistance } from "geolib";

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const formatToISODate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  } catch { return dateStr; }
};

const convertTo24Hour = (timeStr) => {
  if (!timeStr) return "";
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes]   = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  return `${hours.toString().padStart(2,'0')}:${minutes}`;
};

const shiftTime = (timeStr24, deltaHours) => {
  const [h, m] = timeStr24.split(':').map(Number);
  let newH = Math.min(23, Math.max(0, h + deltaHours));
  return `${String(newH).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const Viewnearbystation = ({ navigation }) => {
  const {
    usercoordinate, setstationid, bookingData,
    setselectedbayid, setBookingData, setdestinationcoordinate
  } = useContext(UserContext);

  // ── Raw API data ──────────────────────────────────────────────────────────
  const [allFreeStations, setAllFreeStations] = useState([]);
  const [allBusyStations, setAllBusyStations] = useState([]);
 const[avergagestationRating,setavergagestationRating]=useState()


  // ── Filtered display lists ────────────────────────────────────────────────
  const [freeDisplayList, setFreeDisplayList] = useState([]);
  const [busyDisplayList, setBusyDisplayList] = useState([]);

  // ── Services map { [stationId]: [...] } ──────────────────────────────────
  const [stationServicesMap, setStationServicesMap] = useState({});
  const [loadingServicesFor, setLoadingServicesFor] = useState(null);

  // ── Slots map { [stationId]: [...] } ─────────────────────────────────────
  const [availableSlotsMap, setAvailableSlotsMap] = useState({});

  // ── Modal state ───────────────────────────────────────────────────────────
  // Step 1: bay picker modal
  const [bayPickerStation, setBayPickerStation]   = useState(null); // which station
  const [isBayPickerVisible, setIsBayPickerVisible] = useState(false);

  // Step 2: slot modal  (mode: null | 'options' | 'shift' | 'all')
  const [slotModalStation,  setSlotModalStation]  = useState(null);
  const [slotModalBay,      setSlotModalBay]      = useState(null); // { bayId, bayName }
  const [slotModalMode,     setSlotModalMode]     = useState(null);
  const [slotHourShift,     setSlotHourShift]     = useState(0);
  const [shiftedSlots,      setShiftedSlots]      = useState([]);
  const [shiftLoading,      setShiftLoading]      = useState(false);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [viewState, setViewState] = useState('loading');

  // ── Filters ──────────────────────────────────────────────────────────────
  const [maxRange,       setMaxRange]       = useState(5);
  const [maxPrice,       setMaxPrice]       = useState(null);
  const [priceSort,      setPriceSort]      = useState(null);
  const [minRating,      setMinRating]      = useState(0);
  const [minSvcRating,   setMinSvcRating]   = useState(0);

  const [isRangeModalVisible,  setIsRangeModalVisible]  = useState(false);
  const [isPriceModalVisible,  setIsPriceModalVisible]  = useState(false);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [isSvcRatingModalVisible, setIsSvcRatingModalVisible] = useState(false);

  const serverUrl = BASE_URL.replace('/api', '');

  // ────────────────────────────────────────────────────────────────────────
  // INITIAL LOAD
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (bookingData?.date && bookingData?.startTime)
      {
      fetchInitialStations(); 
      
    }
    else setViewState('ready');
  }, []);
   

  const fetchInitialStations = async () => {
    try {
      setViewState('loading');
      const payload = {
        ServiceNames: bookingData?.serviceNames || [],
        BookingDate:  formatToISODate(bookingData.date),
        StartTime:    convertTo24Hour(bookingData?.startTime),
        EndTime:      convertTo24Hour(bookingData?.endTime),
        StationNames: []
      };
      const res    = await fetch(`${BASE_URL}/Customer/check-availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        const free = result.freeStations || [];
        const busy = result.busyStations || [];
        setAllFreeStations(free);
        setAllBusyStations(busy);
        applyAllFilters(free, busy, maxRange, maxPrice, minRating, minSvcRating, priceSort);

        // Background fetch services for all stations to get service ratings
        [...free, ...busy].forEach(st => {
          const sId = st.stationId || st.StationId;
          fetchServicesForStation(sId);
        });
      } else {
        setViewState('ready');
      }
    } catch { setViewState('ready'); }
  };

  // ────────────────────────────────────────────────────────────────────────
  // SERVICES API (lazy per card)
  // ────────────────────────────────────────────────────────────────────────
  const fetchServicesForStation = useCallback(async (stationId) => {
    if (stationServicesMap[stationId] !== undefined) return;
    setLoadingServicesFor(stationId);

    try {
      const res  = await fetch(`${BASE_URL}/Station/getservicesbystation/${stationId}`);
      const data = await res.json();
      
      const raw  = (data.status === 'success' && data.data) ? data.data : [];
      console.log(raw)
      const selectedNames = bookingData?.serviceNames || [];
      const isVip   = bookingData?.isVip   || false;
      const carType = (bookingData?.carType || '').toLowerCase();

      const matched = raw
        .filter(s => selectedNames.includes(s.serviceName || s.ServiceName))
        .map(s => {
          const hasDiscount = !!(s.hasDiscount || s.HasDiscount);
          const discountLabel = s.discountLabel || s.DiscountLabel || '';
          setavergagestationRating(s.Newaveragerating);


          // ── 4-way original prices ───────────────────────────────────────
          const oNS = s.originalNormalSmall || s.OriginalNormalSmall || s.normalPriceSmall || s.NormalPriceSmall || 0;
          const oNL = s.originalNormalLarge || s.OriginalNormalLarge || s.normalPriceLarge || s.NormalPriceLarge || 0;
          const oVS = s.originalVIPSmall    || s.OriginalVIPSmall    || s.vipPriceSmall    || s.VipPriceSmall    || 0;
          const oVL = s.originalVIPLarge    || s.OriginalVIPLarge    || s.vipPriceLarge    || s.VipPriceLarge    || 0;

          // ── 4-way final prices ──────────────────────────────────────────
          const fNS = s.finalNormalSmall || s.FinalNormalSmall || oNS;
          const fNL = s.finalNormalLarge || s.FinalNormalLarge || oNL;
          const fVS = s.finalVIPSmall    || s.FinalVIPSmall    || oVS;
          const fVL = s.finalVIPLarge    || s.FinalVIPLarge    || oVL;

          let originalPrice = 0;
          let finalPrice = 0;

          if (!isVip && carType === 'small') { originalPrice = oNS; finalPrice = fNS; }
          if (!isVip && carType === 'large') { originalPrice = oNL; finalPrice = fNL; }
          if ( isVip && carType === 'small') { originalPrice = oVS; finalPrice = fVS; }
          if ( isVip && carType === 'large') { originalPrice = oVL; finalPrice = fVL; }
          
          
          return {
            serviceId:     s.serviceId   || s.ServiceId,
            serviceName:   s.serviceName || s.ServiceName,
            duration:      s.duration    || s.Duration,
            averageRating: parseFloat(s.averageRating || s.AverageRating || 0),
            totalReviews:  parseInt(s.totalReviews    || s.TotalReviews  || 0),
            price:         finalPrice, // This will be used as the default selected price
            originalPrice,
            finalPrice,
            hasDiscount,
            discountLabel,
            
            // Keep base prices for recalculation in slots
            oNS, oNL, oVS, oVL,
            fNS, fNL, fVS, fVL
          };
        
        });
      setStationServicesMap(prev => ({ ...prev, [stationId]: matched }));
    } catch {
      setStationServicesMap(prev => ({ ...prev, [stationId]: [] }));
    } finally { setLoadingServicesFor(null); }
  }, [bookingData]); // Removed stationServicesMap from deps to avoid infinite loops if calling set within it, but actually it's fine as we use functional update

  useEffect(() => {
    if (allFreeStations.length > 0 || allBusyStations.length > 0) {
      applyAllFilters(allFreeStations, allBusyStations, maxRange, maxPrice, minRating, minSvcRating, priceSort);
    }
  }, [stationServicesMap]);

  // ────────────────────────────────────────────────────────────────────────
  // FILTER ENGINE
  // ────────────────────────────────────────────────────────────────────────
  const calcDistance = (s) => {
    const uLat = usercoordinate?.userlatitude;
    const uLon = usercoordinate?.userlongitude;
    const lat  = s.latitude  || s.Latitude;
    const lon  = s.longitude || s.Longitude;
    if (!uLat || !uLon || !lat || !lon) return 999;
    return parseFloat((getDistance(
      { latitude: parseFloat(uLat), longitude: parseFloat(uLon) },
      { latitude: parseFloat(lat),  longitude: parseFloat(lon)  }
    ) / 1000).toFixed(2));
  };

  const enrichList = (list, isAlternative) =>
    list.map(s => ({
      ...s,
      stationId:         s.stationId  || s.StationId,
      distance:          calcDistance(s),
      isAlternativeMode: isAlternative,
      lat:               s.latitude   || s.Latitude,
      lon:               s.longitude  || s.Longitude,
      rating:            parseFloat(s.rating       || s.Rating       || 0),
      totalReviews:      s.totalReviews || s.TotalReviews || 0,
      // busy bays list from API
      busyBays:          s.busyBays   || s.BusyBays   || [],
    }));

  const applyAllFilters = (
    freeList, busyList, range, priceLimit, ratingMin, ratingSvcMin,
    priceSortDir = priceSort
  ) => {
    let eF = enrichList(freeList, false).filter(s => s.distance <= range);
    let eB = enrichList(busyList,  true).filter(s => s.distance <= range);

    const getAvgSvcRating = (st) => {
      const svcs = stationServicesMap[st.stationId];
      if (!svcs || svcs.length === 0) return 0; 
      return svcs.reduce((a, s) => a + (s.averageRating || 0), 0) / svcs.length;
    };

    if (priceLimit !== null) {
      const pass = (st) => {
        const svc = stationServicesMap[st.stationId];
        if (!svc) return true;
        return svc.reduce((a, s) => a + parseFloat(s.price || 0), 0) <= priceLimit;
      };
      eF = eF.filter(pass);
      eB = eB.filter(pass);
    }
    if (ratingMin > 0) {
      eF = eF.filter(s => s.rating >= ratingMin);
      eB = eB.filter(s => s.rating >= ratingMin);
    }
    if (ratingSvcMin > 0) {
      eF = eF.filter(s => getAvgSvcRating(s) >= ratingSvcMin);
      eB = eB.filter(s => getAvgSvcRating(s) >= ratingSvcMin);
    }
    const getTotal = (st) => {
      const svc = stationServicesMap[st.stationId];
      return svc ? svc.reduce((a, s) => a + parseFloat(s.price || 0), 0) : 0;
    };
    const sortFn =
      priceSortDir==='asc'  ? (a,b) => getTotal(a)-getTotal(b) :
      priceSortDir==='desc' ? (a,b) => getTotal(b)-getTotal(a) :
                              (a,b) => a.distance-b.distance;
    eF.sort(sortFn);
    eB.sort(sortFn);
    setFreeDisplayList(eF);
    setBusyDisplayList(eB);
    setViewState('ready');
  };

  const applyRange     = (r)   => { setMaxRange(r);    setIsRangeModalVisible(false);  applyAllFilters(allFreeStations,allBusyStations,r,maxPrice,minRating,minSvcRating,priceSort); };
  const applyPrice     = (p)   => { setMaxPrice(p);    setIsPriceModalVisible(false);  applyAllFilters(allFreeStations,allBusyStations,maxRange,p,minRating,minSvcRating,priceSort); };
  const applyPriceSort = (dir) => { setPriceSort(dir); setIsPriceModalVisible(false);  applyAllFilters(allFreeStations,allBusyStations,maxRange,maxPrice,minRating,minSvcRating,dir); };
  const applyRating    = (rt)  => { setMinRating(rt);  setIsRatingModalVisible(false); applyAllFilters(allFreeStations,allBusyStations,maxRange,maxPrice,rt,minSvcRating,priceSort); };
  const applySvcRating = (rt)  => { setMinSvcRating(rt); setIsSvcRatingModalVisible(false); applyAllFilters(allFreeStations,allBusyStations,maxRange,maxPrice,minRating,rt,priceSort); };

  // ────────────────────────────────────────────────────────────────────────
  // STEP 1: BAY PICKER — open when "VIEW SLOTS" tapped on busy station
  // ────────────────────────────────────────────────────────────────────────
  const openBayPicker = (station) => {
    setBayPickerStation(station);
    setIsBayPickerVisible(true);
  };

  const onBaySelected = (bay) => {
    // bay = { bayId, bayName }
    setIsBayPickerVisible(false);
    // small delay so modal closes smoothly
    setTimeout(() => {
      setSlotModalStation(bayPickerStation);
      setSlotModalBay(bay);
      setSlotModalMode('options');
      setSlotHourShift(0);
      setShiftedSlots([]);
    }, 300);
  };

  // ────────────────────────────────────────────────────────────────────────
  // STEP 2: SLOTS API — now passes BayId to backend
  // ────────────────────────────────────────────────────────────────────────
  const buildSlotPayload = (station, bay, startOverride = null) => ({
    BookingDate:   formatToISODate(bookingData.date),
    StationIds:    [station.stationId],
    TotalDuration: bookingData.duration || 60,
    BayType:       "General",
    BayId:         bay?.bayId  || bay?.BayId  || null,   // ← specific bay
    StartTime:     startOverride || null,                 // ← shifted time
  });

  const fetchAllSlots = async (station, bay) => {
    try {
      const res    = await fetch(`${BASE_URL}/Customer/get-free-slots`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSlotPayload(station, bay))
      });
      const result = await res.json();
      if (result.status === "success" && result.data?.length > 0) {
        const map = {};
        result.data.forEach(item => {
          map[item.stationId || item.StationId] = item.availableSlots || item.AvailableSlots;
        });
        setAvailableSlotsMap(prev => ({ ...prev, ...map }));
      }
    } catch { /* silent */ }
  };

  const fetchShiftedSlots = async (station, bay, shiftHours) => {
    setShiftLoading(true);
    setShiftedSlots([]);
    try {
      const base24  = convertTo24Hour(bookingData?.startTime);
      const shifted = shiftTime(base24, shiftHours);
      const res    = await fetch(`${BASE_URL}/Customer/get-free-slots`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSlotPayload(station, bay, shifted))
      });
      const result = await res.json();
      if (result.status === "success" && result.data?.length > 0) {
        setShiftedSlots(result.data[0]?.availableSlots || result.data[0]?.AvailableSlots || []);
      } else {
        setShiftedSlots([]);
      }
    } catch { setShiftedSlots([]); }
    finally  { setShiftLoading(false); }
  };

  // ────────────────────────────────────────────────────────────────────────
  // SLOT MODAL CONTROLS
  // ────────────────────────────────────────────────────────────────────────
  const goToShiftMode = () => { setSlotModalMode('shift'); setSlotHourShift(0); setShiftedSlots([]); };

  const goToAllSlotsMode = async () => {
    setSlotModalMode('all');
    await fetchAllSlots(slotModalStation, slotModalBay);
  };

  const handleShiftChange = (delta) => {
    const next = slotHourShift + delta;
    if (next < -12 || next > 12) return;
    setSlotHourShift(next);
    if (next !== 0) fetchShiftedSlots(slotModalStation, slotModalBay, next);
    else setShiftedSlots([]);
  };

  const closeSlotModal = () => {
    setSlotModalStation(null);
    setSlotModalBay(null);
    setSlotModalMode(null);
    setShiftedSlots([]);
    setSlotHourShift(0);
  };

  // ────────────────────────────────────────────────────────────────────────
  // PROCEED helpers
  // ────────────────────────────────────────────────────────────────────────
  const proceedWithFreeStation = (item) => {
    const svcList = stationServicesMap[item.stationId] || [];
    const bId     = item.availableBayId || item.AvailableBayId;
    setBookingData({
      ...bookingData,
      stationId:            item.stationId,
      stationName:          item.stationName,
      availableBayId:       bId,
      serviceIds:           svcList.map(s => s.serviceId),
      totalAmount:          svcList.reduce((a,s) => a + parseFloat(s.price||0), 0),
      selectedServicesList: svcList,
    });
    setstationid(item.stationId);
    setselectedbayid(bId);
    navigation.navigate('Addbookingdetail');
  };

  const proceedWithSlot = (slot) => {
    const isNewSlotVip = slot.start?.startsWith('13:') || (slot.start?.toUpperCase().startsWith('1:') && slot.start?.toUpperCase().includes('PM')) || (slot.start?.toUpperCase().startsWith('01:') && slot.start?.toUpperCase().includes('PM'));
    const carType = (bookingData?.carType || '').toLowerCase();

    const updatedSvcList = (stationServicesMap[slotModalStation?.stationId] || []).map(s => {
      let p = s.finalPrice;
      if (isNewSlotVip && carType === 'small') p = s.fVS;
      if (isNewSlotVip && carType === 'large') p = s.fVL;
      if (!isNewSlotVip && carType === 'small') p = s.fNS;
      if (!isNewSlotVip && carType === 'large') p = s.fNL;
      return { ...s, price: p };
    });

    setBookingData({
      ...bookingData,
      startTime:            slot.start,
      endTime:              slot.end,
      stationId:            slotModalStation.stationId,
      stationName:          slotModalStation.stationName,
      availableBayId:       slot.bayId || slot.BayId,
      serviceIds:           updatedSvcList.map(s => s.serviceId),
      totalAmount:          updatedSvcList.reduce((a,s) => a + parseFloat(s.price||0), 0),
      selectedServicesList: updatedSvcList,
      isVip:                !!isNewSlotVip,
    });
    setstationid(slotModalStation.stationId);
    setselectedbayid(slot.bayId || slot.BayId);
    closeSlotModal();
    navigation.navigate('Addbookingdetail');
  };

  // ────────────────────────────────────────────────────────────────────────
  // STATION CARD
  // ────────────────────────────────────────────────────────────────────────
  const renderStationItem = ({ item }) => {
    const sId          = item.stationId;
    const services     = stationServicesMap[sId];
    const isLoadingSvc = loadingServicesFor === sId;
    const totalSvcPrice = services
      ? services.reduce((a,s) => a + parseFloat(s.price||0), 0) : null;
    const isAlternative = item.isAlternativeMode;
    const busyBays      = item.busyBays || [];

    if (services === undefined && !isLoadingSvc) fetchServicesForStation(sId);

    return (
      <View style={styles.card}>

        {/* ── TOP ── */}
        <View style={styles.cardTop}>
          <View style={styles.imageColumn}>
            <TouchableOpacity
              style={styles.blackRatingBadge}
              // onPress={() => navigation.navigate('displaybookingreview', { item })}
            >
              <Text style={styles.starIcon}>Priority</Text>
              <Text style={styles.ratingText}>
                {item.rating > 0 ? item.rating.toFixed(1) :0.0.toFixed(1) }
              </Text>
              
            </TouchableOpacity>
            <Image
              source={{
                uri: (!item.imagePath && !item.ImagePath)
                  ? 'https://via.placeholder.com/150'
                  : `${serverUrl}/station_images/${item.imagePath || item.ImagePath}`
              }}
              style={styles.stationImg}
            />
            {/* <Text style={styles.ratingText}> AvgStation
                {avergagestationRating > 0 ? avergagestationRating.toFixed(1) : 2.3.toFixed(1) }⭐
              </Text> */}
          </View>

          <View style={styles.details}>
            <View style={styles.rowJustify}>
              <Text style={styles.name} numberOfLines={1}>{item.stationName}</Text>
              <View style={[styles.statusPill,
                { backgroundColor: isAlternative ? '#FFF3CD' : '#E8F5E9' }]}>
                <Text style={[styles.statusPillText,
                  { color: isAlternative ? '#D48806' : '#2E7D32' }]}>
                  {isAlternative ? "BUSY" : "FREE"}
                </Text>
              </View>
            </View>
            <Text style={styles.addr}    numberOfLines={1}>📍 {item.address}</Text>
            <Text style={styles.contact}>📞 {item.contact}</Text>
            <Text style={styles.contact}>📧 {item.email}</Text>
          </View>
        </View>

        {/* ── BUSY BAYS LIST (only for busy stations) ── */}
        {/* {isAlternative && busyBays.length > 0 && (
          <View style={styles.busyBaysPanel}>
            <Text style={styles.busyBaysPanelTitle}>🔴 Occupied Bays at your time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {busyBays.map((bay, i) => (
                <View key={i} style={styles.busyBayChip}>
                  <Text style={styles.busyBayChipText}>{bay.bayName || bay.BayName}</Text>
                  <Text style={styles.busyBayChipSub}>Occupied</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )} */}

        {/* ── SERVICES PANEL ── */}
        <View style={styles.servicesPanel}>
          <Text style={styles.servicesPanelTitle}>🔧 Selected Services     </Text>
           
          {isLoadingSvc ? (
            <ActivityIndicator size="small" color="royalblue" style={{ marginVertical: 6 }} />
          ) : services && services.length > 0 ? (
            <>
              {services.map((s, idx) => (
                <View key={idx} style={styles.serviceRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      
                      <Text style={styles.serviceName}>{s.serviceName}</Text>
                      {s.hasDiscount && s.discountLabel ? (
                        <Text style={styles.discountLabelText}> ({s.discountLabel})</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.svcRatingBtn}
                      onPress={() => navigation.navigate('ShowServiceReview', {
                        serviceId: s.serviceId, serviceName: s.serviceName
                      })}
                    >
                      {[1,2,3,4,5].map(star => (
                        <Text key={star} style={[styles.svcStar,
                          { color: star <= Math.round(s.averageRating) ? '#F5A623' : '#DDD' }]}>★</Text>
                      ))}
                      <Text style={styles.svcRatingNum}>
                        {s.averageRating > 0 ? s.averageRating.toFixed(1) : 'New'}
                      </Text>
                      <Text style={styles.svcReviewCount}>({s.totalReviews})</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.serviceRight}>
                    <Text style={styles.serviceDuration}>⏱ {s.duration}m</Text>
                    {s.hasDiscount ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.originalPriceText}>RS {s.originalPrice}</Text>
                        <Text style={styles.servicePrice}>RS {Math.round(s.finalPrice)}</Text>
                      </View>
                    ) : (
                      <Text style={styles.servicePrice}>RS {Math.round(s.price)}</Text>
                    )}
                  </View>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>RS {totalSvcPrice}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.noServiceText}>Services not configured for this station</Text>
          )}
        </View>

        {/* ── BOTTOM BUTTONS ── */}
        <View style={styles.cardBottom}>
          <TouchableOpacity
            style={styles.distBtn}
            onPress={() => {
              setdestinationcoordinate({ destinationlatitude: item.lat, destinationlongitude: item.lon });
              navigation.navigate('directionmap');
            }}
          >
            <Text style={styles.distBtnText}>📍 {item.distance} KM</Text>
          </TouchableOpacity>

          {!isAlternative ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: 'royalblue' }]}
              onPress={() => proceedWithFreeStation(item)}
            >
              <Text style={styles.actionBtnText}>BOOK NOW</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#D48806' }]}
              onPress={() => openBayPicker(item)}
            >
              <Text style={styles.actionBtnText}>VIEW SLOTS</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ────────────────────────────────────────────────────────────────────────
  // SECTION HEADER
  // ────────────────────────────────────────────────────────────────────────
  const SectionHeader = ({ title, count, color, icon }) => (
    <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
      <Text style={styles.sectionHeaderIcon}>{icon}</Text>
      <Text style={[styles.sectionHeaderTitle, { color }]}>{title}</Text>
      <View style={[styles.sectionCountBadge, { backgroundColor: color }]}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
  );

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────
  const base24Preview  = convertTo24Hour(bookingData?.startTime || '00:00');
  const shiftPreview   = shiftTime(base24Preview, slotHourShift);
  const allSlotsModal  = availableSlotsMap[slotModalStation?.stationId] || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headTitle}>Select Station</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            <TouchableOpacity onPress={() => setIsRangeModalVisible(true)} style={styles.filterChip}>
              <Text style={styles.filterChipText}>📍 {maxRange} KM ▾</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsPriceModalVisible(true)}
              style={[styles.filterChip, (maxPrice || priceSort) && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, (maxPrice||priceSort) && styles.filterChipTextActive]}>
                💰 {priceSort==='asc'?'Low→High':priceSort==='desc'?'High→Low':maxPrice?`≤ RS ${maxPrice}`:'Price'} ▾
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsRatingModalVisible(true)}
              style={[styles.filterChip, minRating > 0 && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, minRating>0 && styles.filterChipTextActive]}>
                ⭐ {minRating>0?`${minRating}+`:'Priority Rating'} ▾
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsSvcRatingModalVisible(true)}
              style={[styles.filterChip, minSvcRating > 0 && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, minSvcRating > 0 && styles.filterChipTextActive]}>
                🔧 {minSvcRating > 0 ? `${minSvcRating}+` : 'Service Rating'} ▾
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── CONTENT ── */}
      {viewState === 'loading' ? (
        <View style={styles.center}><ActivityIndicator size="large" color="royalblue" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
          <SectionHeader title="Available Stations" count={freeDisplayList.length} color="#2E7D32" icon="✅" />
          {freeDisplayList.length > 0 ? (
            <FlatList data={freeDisplayList} renderItem={renderStationItem}
              keyExtractor={(item,i) => `free-${item.stationId||i}`} scrollEnabled={false} />
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No available stations in {maxRange} KM range.</Text>
            </View>
          )}

          <SectionHeader title="Busy Stations" count={busyDisplayList.length} color="#D48806" icon="🕐" />
          {busyDisplayList.length > 0 ? (
            <FlatList data={busyDisplayList} renderItem={renderStationItem}
              keyExtractor={(item,i) => `busy-${item.stationId||i}`} scrollEnabled={false} />
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No busy stations in {maxRange} KM range.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL 1: BAY PICKER
      ════════════════════════════════════════════════════════ */}
      <Modal visible={isBayPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>{bayPickerStation?.stationName}</Text>
            <Text style={styles.modalSubtitle}>
              Select a bay to check available slots:
            </Text>

            {/* List of busy bays */}
            {(bayPickerStation?.busyBays || []).map((bay, i) => (
              <TouchableOpacity
                key={i}
                style={styles.bayPickerRow}
                onPress={() => onBaySelected({ bayId: bay.bayId || bay.BayId, bayName: bay.bayName || bay.BayName })}
              >
                <View style={styles.bayPickerIcon}>
                  <Text style={{ fontSize: 20 }}>🔧</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bayPickerName}>{bay.bayName || bay.BayName}</Text>
                  <Text style={styles.bayPickerSub}>Tap to find free slots for this bay</Text>
                </View>
                <Text style={styles.slotOptionArrow}>›</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setIsBayPickerVisible(false)}>
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          MODAL 2: SLOT OPTIONS  (options | shift | all)
      ════════════════════════════════════════════════════════ */}
      <Modal visible={!!slotModalMode} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />

            {/* ── OPTIONS ── */}
            {slotModalMode === 'options' && (
              <>
                <Text style={styles.modalTitle}>{slotModalStation?.stationName}</Text>
                {/* Selected bay badge */}
                <View style={styles.selectedBayBadge}>
                  <Text style={styles.selectedBayBadgeText}>
                    🔧 Bay: {slotModalBay?.bayName}
                  </Text>
                </View>
                <Text style={styles.modalSubtitle}>
                  This bay is busy at your selected time. Choose an option:
                </Text>

                <TouchableOpacity style={styles.slotOptionCard} onPress={goToShiftMode}>
                  <View style={styles.slotOptionIcon}><Text style={{ fontSize: 26 }}>🕐</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotOptionTitle}>Specific Time Slot</Text>
                    <Text style={styles.slotOptionDesc}>
                      Shift your time +/− hours and check if this bay is free.
                    </Text>
                  </View>
                  <Text style={styles.slotOptionArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.slotOptionCard} onPress={goToAllSlotsMode}>
                  <View style={styles.slotOptionIcon}><Text style={{ fontSize: 26 }}>📋</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotOptionTitle}>View All Available Slots</Text>
                    <Text style={styles.slotOptionDesc}>
                      See all free time slots for this bay today.
                    </Text>
                  </View>
                  <Text style={styles.slotOptionArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelModalBtn} onPress={closeSlotModal}>
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── SHIFT ── */}
            {slotModalMode === 'shift' && (
              <>
                <TouchableOpacity onPress={() => setSlotModalMode('options')} style={styles.backInModal}>
                  <Text style={styles.backInModalText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Adjust Time</Text>
                <View style={styles.selectedBayBadge}>
                  <Text style={styles.selectedBayBadgeText}>🔧 Bay: {slotModalBay?.bayName}</Text>
                </View>
                <Text style={styles.hourShiftSub}>Original: {bookingData?.startTime}</Text>
                <Text style={styles.hourShiftPreview}>{shiftPreview}</Text>

                <View style={styles.stepperRow}>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => handleShiftChange(-1)}>
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>
                    {slotHourShift >= 0 ? '+' : ''}{slotHourShift}h
                  </Text>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => handleShiftChange(1)}>
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {shiftLoading ? (
                  <ActivityIndicator size="small" color="royalblue" style={{ marginTop: 16 }} />
                ) : shiftedSlots.length > 0 ? (
                  <>
                    <Text style={styles.shiftResultLabel}>
                      ✅ {slotModalBay?.bayName} is free at {shiftPreview}:
                    </Text>
                    <ScrollView style={{ maxHeight: 160 }}>
                      {shiftedSlots.map((slot, i) => {
                        const isVip = slot.start?.startsWith('13:') || (slot.start?.toUpperCase().startsWith('1:') && slot.start?.toUpperCase().includes('PM')) || (slot.start?.toUpperCase().startsWith('01:') && slot.start?.toUpperCase().includes('PM'));
                        return (
                        <TouchableOpacity key={i} style={[styles.shiftSlotRow, isVip && {borderColor: '#FFD700', borderWidth: 1, backgroundColor: '#FFFDF0'}]} onPress={() => proceedWithSlot(slot)}>
                          <Text style={styles.shiftSlotTime}>
                            {slot.display || `${slot.start} – ${slot.end}`}
                            {isVip && <Text style={{color: '#B8860B', fontWeight: 'bold', fontSize: 12}}>  ⭐ VIP</Text>}
                          </Text>
                          <Text style={styles.shiftSlotBay}>Bay {slot.bayName}</Text>
                          <View style={styles.shiftSlotBookBtn}>
                            <Text style={{ color:'white', fontWeight:'bold', fontSize:12 }}>Book</Text>
                          </View>
                        </TouchableOpacity>
                      )})}
                    </ScrollView>
                  </>
                ) : (
                  <Text style={styles.noShiftSlots}>
                    {slotHourShift === 0
                      ? 'Use + / − to shift time and check this bay.'
                      : `${slotModalBay?.bayName} is not free at ${shiftPreview}. Try ± another hour.`}
                  </Text>
                )}

                <TouchableOpacity style={styles.cancelModalBtn} onPress={closeSlotModal}>
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── ALL SLOTS ── */}
            {slotModalMode === 'all' && (
              <>
                <TouchableOpacity onPress={() => setSlotModalMode('options')} style={styles.backInModal}>
                  <Text style={styles.backInModalText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>All Available Slots</Text>
                <View style={styles.selectedBayBadge}>
                  <Text style={styles.selectedBayBadgeText}>🔧 Bay: {slotModalBay?.bayName}</Text>
                </View>
                <Text style={styles.modalSubtitle}>{slotModalStation?.stationName}</Text>

                {allSlotsModal.length === 0 ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="royalblue" />
                    <Text style={{ color: '#999', marginTop: 10 }}>Loading slots...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={allSlotsModal}
                    keyExtractor={(item, i) => i.toString()}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    style={{ maxHeight: 320 }}
                    renderItem={({ item }) => {
                      const isVip = item.start?.startsWith('13:') || (item.start?.toUpperCase().startsWith('1:') && item.start?.toUpperCase().includes('PM')) || (item.start?.toUpperCase().startsWith('01:') && item.start?.toUpperCase().includes('PM'));
                      return (
                      <TouchableOpacity style={[styles.slotItem, isVip && {borderColor: '#FFD700', borderWidth: 1, backgroundColor: '#FFFDF0'}]} onPress={() => proceedWithSlot(item)}>
                        <Text style={styles.slotTime}>
                          {item.display?.split(' - ')[0] || item.start}
                        </Text>
                        {isVip && <Text style={{color: '#B8860B', fontWeight: 'bold', fontSize: 12, marginBottom: 2}}>⭐ VIP Slot</Text>}
                        <Text style={styles.slotTap}>Bay {item.bayName}</Text>
                      </TouchableOpacity>
                    )}}
                  />
                )}

                <TouchableOpacity style={styles.cancelModalBtn} onPress={closeSlotModal}>
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── FILTER MODALS ── */}
      <Modal visible={isRangeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.filterSheet}>
            <Text style={styles.sheetTitle}>Search Range</Text>
            {[5,10,20,50,100,200].map(km => (
              <TouchableOpacity key={km} style={[styles.sheetOption, maxRange===km && styles.sheetOptionActive]} onPress={() => applyRange(km)}>
                <Text style={[styles.sheetOptionText, maxRange===km && {color:'white',fontWeight:'bold'}]}>{km} Kilometers</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setIsRangeModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isPriceModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.filterSheet}>
            <Text style={styles.sheetTitle}>Price Filter & Sort</Text>
            <Text style={styles.sectionLabel}>Sort By Price</Text>
            <View style={styles.sortRow}>
              <TouchableOpacity style={[styles.sortBtn, priceSort==='asc' && styles.sortBtnActive]} onPress={() => applyPriceSort(priceSort==='asc'?null:'asc')}>
                <Text style={[styles.sortBtnText, priceSort==='asc' && styles.sortBtnTextActive]}>↑ Low → High</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sortBtn, priceSort==='desc' && styles.sortBtnActive]} onPress={() => applyPriceSort(priceSort==='desc'?null:'desc')}>
                <Text style={[styles.sortBtnText, priceSort==='desc' && styles.sortBtnTextActive]}>↓ High → Low</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionLabel, {marginTop:14}]}>Max Total Price</Text>
            {[null,500,1000,1500,2000,3000,5000].map((p,i) => (
              <TouchableOpacity key={i} style={[styles.sheetOption, maxPrice===p && styles.sheetOptionActive]} onPress={() => applyPrice(p)}>
                <Text style={[styles.sheetOptionText, maxPrice===p && {color:'white',fontWeight:'bold'}]}>{p===null?'No Limit':`Up to RS ${p}`}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setIsPriceModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isRatingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.filterSheet}>
            <Text style={styles.sheetTitle}>Filter by Station Rating</Text>
            <Text style={styles.modalSubtitle}>Show stations with at least:</Text>
            
            <View style={styles.starSelectionRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => applyRating(star)}
                  style={styles.starSelectionBtn}
                >
                  <Text style={[styles.starSelectionIcon, { color: star <= minRating ? '#F5A623' : '#DDD' }]}>★</Text>
                  <Text style={[styles.starSelectionLabel, { color: star <= minRating ? '#F5A623' : '#999' }]}>{star}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.clearRatingBtn} onPress={() => applyRating(0)}>
              <Text style={styles.clearRatingText}>{minRating === 0 ? 'Showing All Ratings' : 'Clear Filter (Show All)'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsRatingModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isSvcRatingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.filterSheet}>
            <Text style={styles.sheetTitle}>Filter by Service Rating</Text>
            <Text style={styles.modalSubtitle}>Show stations with at least:</Text>
            
            <View style={styles.starSelectionRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => applySvcRating(star)}
                  style={styles.starSelectionBtn}
                >
                  <Text style={[styles.starSelectionIcon, { color: star <= minSvcRating ? '#F5A623' : '#DDD' }]}>★</Text>
                  <Text style={[styles.starSelectionLabel, { color: star <= minSvcRating ? '#F5A623' : '#999' }]}>{star}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.clearRatingBtn} onPress={() => applySvcRating(0)}>
              <Text style={styles.clearRatingText}>{minSvcRating === 0 ? 'Showing All Ratings' : 'Clear Filter (Show All)'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsSvcRatingModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#F0F2F5' },
  header:               { flexDirection:'row', alignItems:'flex-start', padding:12, backgroundColor:'white', borderBottomWidth:1, borderBottomColor:'#EEE', paddingBottom:10 },
  backBtn:              { padding:5, marginTop:2 },
  headerTitleContainer: { flex:1, alignItems:'center' },
  headTitle:            { fontSize:18, fontWeight:'bold' },
  filterChip:           { backgroundColor:'#F0F0F0', paddingHorizontal:12, paddingVertical:6, borderRadius:20, marginRight:8, borderWidth:1, borderColor:'#DDD' },
  filterChipActive:     { backgroundColor:'royalblue', borderColor:'royalblue' },
  filterChipText:       { fontSize:12, color:'#444', fontWeight:'600' },
  filterChipTextActive: { color:'white' },
  center:               { flex:1, justifyContent:'center', alignItems:'center' },

  sectionHeader:        { flexDirection:'row', alignItems:'center', paddingVertical:10, paddingLeft:12, borderLeftWidth:4, marginBottom:10, marginTop:6, backgroundColor:'white', borderRadius:8, elevation:1 },
  sectionHeaderIcon:    { fontSize:18, marginRight:8 },
  sectionHeaderTitle:   { fontSize:15, fontWeight:'bold', flex:1 },
  sectionCountBadge:    { borderRadius:12, paddingHorizontal:10, paddingVertical:3, marginRight:10 },
  sectionCountText:     { color:'white', fontWeight:'bold', fontSize:13 },
  emptySection:         { backgroundColor:'white', borderRadius:12, padding:18, alignItems:'center', marginBottom:15 },
  emptySectionText:     { color:'#999', fontSize:13 },

  card:                 { backgroundColor:'white', borderRadius:16, marginBottom:15, padding:15, elevation:3 },
  cardTop:              { flexDirection:'row', alignItems:'flex-start' },
  imageColumn:          { alignItems:'center' },
  blackRatingBadge:     { backgroundColor:'#faf7f7', flexDirection:'row', alignItems:'center', paddingHorizontal:8, paddingVertical:4, borderRadius:6, marginBottom:6 },
  stationImg:           { width:78, height:78, borderRadius:12, backgroundColor:'#eee' },
  starIcon:             { fontSize:10, marginRight:3 },
  ratingText:           { fontSize:11, fontWeight:'bold', color:'#FFD700' },
  details:              { flex:1, marginLeft:12 },
  rowJustify:           { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  name:                 { fontSize:16, fontWeight:'bold', color:'#222', flex:1, marginRight:6 },
  statusPill:           { paddingHorizontal:8, paddingVertical:3, borderRadius:10 },
  statusPillText:       { fontSize:10, fontWeight:'bold' },
  addr:                 { fontSize:12, color:'#777', marginTop:3 },
  contact:              { fontSize:11, color:'#888', marginTop:1 },

  // Busy bays panel
  busyBaysPanel:        { backgroundColor:'#FFF8F0', borderRadius:10, padding:10, marginTop:10, borderWidth:1, borderColor:'#FFDDB0' },
  busyBaysPanelTitle:   { fontSize:12, fontWeight:'bold', color:'#C05500', marginBottom:8 },
  busyBayChip:          { backgroundColor:'#FFE5C8', borderRadius:8, paddingHorizontal:14, paddingVertical:8, marginRight:8, alignItems:'center', borderWidth:1, borderColor:'#FFCC88' },
  busyBayChipText:      { fontSize:13, fontWeight:'bold', color:'#A03800' },
  busyBayChipSub:       { fontSize:10, color:'#C05500', marginTop:2 },

  servicesPanel:        { backgroundColor:'#F8F9FA', borderRadius:10, padding:10, marginTop:12, borderWidth:1, borderColor:'#EFEFEF' },
  servicesPanelTitle:   { fontSize:12, fontWeight:'bold', color:'#444', marginBottom:6 },
  serviceRow:           { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:6, borderBottomWidth:1, borderBottomColor:'#F0F0F0' },
  serviceName:          { fontSize:13, color:'#333' },
  serviceRight:         { flexDirection:'row', alignItems:'center', gap:8 },
  serviceDuration:      { fontSize:11, color:'#888' },
  servicePrice:         { fontSize:13, fontWeight:'bold', color:'#e53935' },
  discountLabelText:    { fontSize:12, fontWeight:'bold', color:'#e53935' },
  originalPriceText:    { fontSize:11, color:'#999', textDecorationLine:'line-through', marginBottom:-2 },
  totalRow:             { flexDirection:'row', justifyContent:'space-between', marginTop:6, paddingTop:6 },
  totalLabel:           { fontSize:13, fontWeight:'bold', color:'#333' },
  totalValue:           { fontSize:15, fontWeight:'bold', color:'#000' },
  noServiceText:        { fontSize:12, color:'#AAA', textAlign:'center', paddingVertical:6 },
  svcRatingBtn:         { flexDirection:'row', alignItems:'center', marginTop:3, backgroundColor:'#FFFBF0', paddingHorizontal:6, paddingVertical:2, borderRadius:6, alignSelf:'flex-start', borderWidth:1, borderColor:'#FFE082' },
  svcStar:              { fontSize:10, marginRight:1 },
  svcRatingNum:         { fontSize:11, fontWeight:'bold', color:'#E65100', marginLeft:2, marginRight:2 },
  svcReviewCount:       { fontSize:10, color:'#999' },

  cardBottom:           { flexDirection:'row', marginTop:12, alignItems:'center', gap:8 },
  distBtn:              { backgroundColor:'#EEEEEE', paddingHorizontal:12, paddingVertical:9, borderRadius:8 },
  distBtnText:          { fontSize:12, fontWeight:'bold', color:'#333' },
  actionBtn:            { flex:1, paddingVertical:11, borderRadius:8, alignItems:'center' },
  actionBtnText:        { color:'white', fontWeight:'bold', fontSize:13, letterSpacing:0.5 },

  // Modals shared
  modalOverlay:         { flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'flex-end' },
  modalSheet:           { backgroundColor:'white', borderTopLeftRadius:26, borderTopRightRadius:26, padding:22, paddingBottom:34, maxHeight:'82%' },
  handle:               { width:40, height:4, backgroundColor:'#DDD', borderRadius:2, alignSelf:'center', marginBottom:14 },
  modalTitle:           { fontSize:17, fontWeight:'bold', textAlign:'center', color:'#111' },
  modalSubtitle:        { fontSize:13, color:'#777', textAlign:'center', marginTop:4, marginBottom:18 },

  // Bay picker rows
  bayPickerRow:         { flexDirection:'row', alignItems:'center', backgroundColor:'#F8F9FA', borderRadius:14, padding:16, marginBottom:10, borderWidth:1, borderColor:'#EEE' },
  bayPickerIcon:        { width:46, height:46, borderRadius:12, backgroundColor:'#FFF3E0', justifyContent:'center', alignItems:'center', marginRight:14 },
  bayPickerName:        { fontSize:15, fontWeight:'bold', color:'#222' },
  bayPickerSub:         { fontSize:12, color:'#888', marginTop:2 },

  // Selected bay badge
  selectedBayBadge:     { alignSelf:'center', backgroundColor:'#FFF3E0', paddingHorizontal:14, paddingVertical:6, borderRadius:20, marginTop:6, marginBottom:4, borderWidth:1, borderColor:'#FFCC80' },
  selectedBayBadgeText: { fontSize:13, fontWeight:'bold', color:'#E65100' },

  // Slot option cards
  slotOptionCard:       { flexDirection:'row', alignItems:'center', backgroundColor:'#F8F9FA', borderRadius:14, padding:16, marginBottom:12, borderWidth:1, borderColor:'#EEE' },
  slotOptionIcon:       { width:50, height:50, borderRadius:14, backgroundColor:'#EEF3FF', justifyContent:'center', alignItems:'center', marginRight:14 },
  slotOptionTitle:      { fontSize:15, fontWeight:'bold', color:'#222', marginBottom:3 },
  slotOptionDesc:       { fontSize:12, color:'#888', lineHeight:17 },
  slotOptionArrow:      { fontSize:22, color:'#AAA', marginLeft:8 },

  cancelModalBtn:       { marginTop:14, padding:12, alignItems:'center' },
  cancelModalText:      { color:'red', fontWeight:'bold', fontSize:15 },
  backInModal:          { marginBottom:8 },
  backInModalText:      { color:'royalblue', fontWeight:'bold', fontSize:14 },

  hourShiftSub:         { fontSize:13, color:'#666', textAlign:'center', marginTop:6 },
  hourShiftPreview:     { fontSize:32, fontWeight:'bold', color:'royalblue', textAlign:'center', marginVertical:10 },
  stepperRow:           { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:24, marginBottom:16 },
  stepperBtn:           { width:54, height:54, borderRadius:27, backgroundColor:'royalblue', justifyContent:'center', alignItems:'center', elevation:3 },
  stepperBtnText:       { fontSize:28, color:'white', lineHeight:32 },
  stepperValue:         { fontSize:26, fontWeight:'bold', color:'#333', minWidth:64, textAlign:'center' },
  shiftResultLabel:     { fontSize:13, fontWeight:'bold', color:'#444', marginBottom:8 },
  shiftSlotRow:         { flexDirection:'row', alignItems:'center', backgroundColor:'#F0F7FF', borderRadius:10, padding:12, marginBottom:8, borderWidth:1, borderColor:'#BBDEFB' },
  shiftSlotTime:        { flex:1, fontSize:14, fontWeight:'bold', color:'#1565C0' },
  shiftSlotBay:         { fontSize:12, color:'#555', marginRight:10 },
  shiftSlotBookBtn:     { backgroundColor:'royalblue', paddingHorizontal:14, paddingVertical:6, borderRadius:8 },
  noShiftSlots:         { textAlign:'center', color:'#999', marginTop:12, fontSize:13, paddingHorizontal:10 },
  slotItem:             { backgroundColor:'#F8F9FA', width:'48%', paddingVertical:16, borderRadius:12, marginBottom:12, alignItems:'center', borderWidth:1, borderColor:'#EEE' },
  slotTime:             { fontSize:15, fontWeight:'bold', color:'#000' },
  slotTap:              { fontSize:12, color:'royalblue', marginTop:3 },

  modalOverlayCenter:   { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  filterSheet:          { backgroundColor:'white', borderRadius:20, padding:22, width:'82%', maxHeight:'80%' },
  sheetTitle:           { fontSize:17, fontWeight:'bold', textAlign:'center', marginBottom:14 },
  sheetOption:          { paddingVertical:13, paddingHorizontal:10, borderRadius:8, marginBottom:4 },
  sheetOptionActive:    { backgroundColor:'royalblue' },
  sheetOptionText:      { fontSize:15, textAlign:'center', color:'#333' },
  cancelBtn:            { marginTop:8, padding:10 },
  cancelText:           { color:'royalblue', textAlign:'center', fontWeight:'bold' },
  sectionLabel:         { fontSize:12, fontWeight:'bold', color:'#888', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8, marginTop:4 },
  sortRow:              { flexDirection:'row', gap:10, marginBottom:4 },
  sortBtn:              { flex:1, paddingVertical:10, borderRadius:10, borderWidth:1.5, borderColor:'#DDD', alignItems:'center' },
  sortBtnActive:        { backgroundColor:'royalblue', borderColor:'royalblue' },
  sortBtnText:          { fontSize:13, fontWeight:'600', color:'#555' },
  sortBtnTextActive:    { color:'white' },

  // New Rating Filter Styles
  starSelectionRow:     { flexDirection:'row', justifyContent:'center', gap:10, marginVertical:20 },
  starSelectionBtn:     { alignItems:'center', padding:5 },
  starSelectionIcon:    { fontSize:36 },
  starSelectionLabel:   { fontSize:12, fontWeight:'bold', marginTop:2 },
  clearRatingBtn:       { paddingVertical:12, borderTopWidth:1, borderTopColor:'#EEE', marginTop:10 },
  clearRatingText:      { textAlign:'center', color:'royalblue', fontWeight:'bold', fontSize:14 },
});

export default Viewnearbystation;