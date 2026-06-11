import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  SafeAreaView, StatusBar, LayoutAnimation, Platform, 
  UIManager, ActivityIndicator, Alert, TextInput, Image,
  ScrollView, Modal
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UserContext } from './UserContext'; 
import { BASE_URL } from './Constants'; 

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const formatToISODate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  } catch { return dateStr; }
};

const defaultBookingReview = () => ({
  showReview: false, rating: 0, comment: '', selectedImages: []
});
const defaultServiceReview = () => ({
  show: false, rating: 0, comment: '', selectedImages: []
});

// ── Star display helper ──
const renderStars = (rating) => {
  const filled = Math.round(parseFloat(rating) || 0);
  return Array.from({ length: 5 }, (_, i) => (
    <Text key={i} style={{ fontSize: 11, color: i < filled ? '#FFA000' : '#DDD' }}>★</Text>
  ));
};

// ────────────────────────────────────────────────────────────────────────
// REUSABLE REVIEW FORM
// ────────────────────────────────────────────────────────────────────────
const ReviewForm = ({
  rating, comment, selectedImages,
  onRating, onComment, onPickCamera, onPickGallery, onRemoveImg, onSubmit,
  submitLabel = "Submit Feedback"
}) => (
  <View style={styles.reviewContainer}>
    <View style={styles.starRow}>
      {[1,2,3,4,5].map(star => (
        <TouchableOpacity key={star} onPress={() => onRating(star)}>
          <Text style={[styles.starIcon, { color: star <= rating ? 'orange' : 'lightgray' }]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
    <View style={styles.imageActionRow}>
      <TouchableOpacity style={styles.imgActionBtn} onPress={onPickCamera}>
        <Text>📸 Camera</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.imgActionBtn} onPress={onPickGallery}>
        <Text>🖼️ Gallery</Text>
      </TouchableOpacity>
    </View>
    {selectedImages.length > 0 && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScroll}>
        {selectedImages.map((uri, idx) => (
          <View key={idx} style={styles.imgWrapper}>
            <Image source={{ uri }} style={styles.thumbImg} />
            <TouchableOpacity style={styles.delImg} onPress={() => onRemoveImg(idx)}>
              <Text style={{ color:'white', fontSize:10, fontWeight:'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    )}
    <TextInput
      style={styles.commentInput} placeholder="Share your experience..."
      multiline value={comment} onChangeText={onComment}
    />
    <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
      <Text style={styles.submitText}>{submitLabel}</Text>
    </TouchableOpacity>
  </View>
);


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const Mybooking = ({ navigation }) => {
  const { User, setBookingData, setstationid, setselectedbayid } = useContext(UserContext);

  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState(null);
  const [activeTab, setActiveTab]     = useState('Confirmed');
  const [serviceReviews, setServiceReviews] = useState({});

  // ── Re-book modal state ──────────────────────────────────────────────────
  const [rebookModalVisible,  setRebookModalVisible]  = useState(false);
  const [rebookBooking,       setRebookBooking]       = useState(null);
  const [rebookSlots,         setRebookSlots]         = useState([]);
  const [rebookLoading,       setRebookLoading]       = useState(false);
  const [rebookStep,          setRebookStep]          = useState('date');
  const [rebookDate,          setRebookDate]          = useState('');
  const [rebookSelectedSlot,  setRebookSelectedSlot]  = useState(null);
  const [vehicles,            setVehicles]            = useState([]);
  const [vehicleLoading,      setVehicleLoading]      = useState(false);
  const [showDatePicker,      setShowDatePicker]      = useState(false);

  useEffect(() => { fetchBookings(); }, []);

  // ────────────────────────────────────────────────────────────────────────
  // FETCH BOOKINGS
  // ────────────────────────────────────────────────────────────────────────
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/Customer/my-bookings/${User.id}`);
      const data     = await response.json();
      if (response.ok) {
        console.log(response.data)
        setBookings(data.map(item => ({ ...item, ...defaultBookingReview() })));
      }
    } catch { Alert.alert("Error", "Server connection failed."); }
    finally  { setLoading(false); }
  };

  const filteredBookings = bookings.filter(b => {
    const s = b.status.toLowerCase();
    if (activeTab === 'Confirmed') return s === 'confirmed';
    if (activeTab === 'Done')      return s === 'completed' || s === 'done';
    return true;
  });

  // ────────────────────────────────────────────────────────────────────────
  // RE-BOOK
  // ────────────────────────────────────────────────────────────────────────
  const openRebook = (item) => {
    setRebookBooking(item);
    setRebookSlots([]);
    setRebookSelectedSlot(null);
    setVehicles([]);
    const today = formatToISODate(new Date().toISOString());
    setRebookDate(today);
    setRebookStep('date');
    setRebookModalVisible(true);
  };

  const fetchSlotsForDate = async (item, dateStr) => {
    setRebookLoading(true);
    setRebookSlots([]);
    try {
      const res = await fetch(`${BASE_URL}/Customer/get-free-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          BookingDate:   dateStr,
          StationIds:    [parseInt(item.stationId)],
          TotalDuration: item.bookingServices?.reduce((a, s) => a + (s.duration || 0), 0) || 60,
          BayType:       'General',
        }),
      });
      const result = await res.json();
      if (result.status === 'success' && result.data?.length > 0) {
        setRebookSlots(result.data[0]?.availableSlots || []);
      } else { setRebookSlots([]); }
    } catch { setRebookSlots([]); }
    finally { setRebookLoading(false); }
  };

  const fetchVehicles = async () => {
    setVehicleLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/Customer/GetVehiclesByUserId/${User.id}`);
      const result = await res.json();
      if (result.status === 'success') setVehicles(result.data || []);
      else setVehicles([]);
    } catch { setVehicles([]); }
    finally { setVehicleLoading(false); }
  };

  const confirmRebook = async (vehicle) => {
    const item = rebookBooking;
    const slot = rebookSelectedSlot;
    const [slotHour] = (slot.start || '00:00').split(':').map(Number);
    const isVip = slotHour === 13;
    const carTypeLower = (vehicle.carType || '').toLowerCase();
    const isLarge = carTypeLower.includes('suv') || carTypeLower.includes('van')
                  || carTypeLower.includes('truck') || carTypeLower.includes('large');
    const carTypeStr = isLarge ? 'large' : 'small';

    let svcList = (item.bookingServices || []).map(s => ({
      serviceId: s.serviceId, serviceName: s.serviceName,
      price: s.price, duration: s.duration,
    }));

    try {
      const res  = await fetch(`${BASE_URL}/Station/getservicesbystation/${item.stationId}`);
      const data = await res.json();
      console.log(result.data)
      const raw  = (data.status === 'success' && data.data) ? data.data : [];
      if (raw.length > 0) {
        const selectedNames = svcList.map(s => s.serviceName);
        let discountInfoList = [];

        const matched = raw
          .filter(s => selectedNames.includes(s.serviceName || s.ServiceName))
          .map(s => {
            let price = 0;
            let originalPrice = 0;
            const hasDiscount = s.HasDiscount || s.hasDiscount || false;
            const discountLabel = s.DiscountLabel || s.discountLabel || "";

            // Use Final prices if available, otherwise fallback to original prices
            if (!isVip && carTypeStr === 'small') {
              price = s.FinalNormalSmall ?? s.finalNormalSmall ?? s.NormalPriceSmall ?? s.normalPriceSmall ?? 0;
              originalPrice = s.OriginalNormalSmall ?? s.originalNormalSmall ?? s.NormalPriceSmall ?? s.normalPriceSmall ?? 0;
            } else if (!isVip && carTypeStr === 'large') {
              price = s.FinalNormalLarge ?? s.finalNormalLarge ?? s.NormalPriceLarge ?? s.normalPriceLarge ?? 0;
              originalPrice = s.OriginalNormalLarge ?? s.originalNormalLarge ?? s.NormalPriceLarge ?? s.normalPriceLarge ?? 0;
            } else if (isVip && carTypeStr === 'small') {
              price = s.FinalVIPSmall ?? s.finalVIPSmall ?? s.VipPriceSmall ?? s.vipPriceSmall ?? 0;
              originalPrice = s.OriginalVIPSmall ?? s.originalVIPSmall ?? s.VipPriceSmall ?? s.vipPriceSmall ?? 0;
            } else if (isVip && carTypeStr === 'large') {
              price = s.FinalVIPLarge ?? s.finalVIPLarge ?? s.VipPriceLarge ?? s.vipPriceLarge ?? 0;
              originalPrice = s.OriginalVIPLarge ?? s.originalVIPLarge ?? s.VipPriceLarge ?? s.vipPriceLarge ?? 0;
            }

            if (hasDiscount) {
              discountInfoList.push({
                name: s.ServiceName || s.serviceName,
                label: discountLabel,
                original: originalPrice,
                final: price
              });
            }

            return { serviceId: s.serviceId || s.ServiceId, serviceName: s.serviceName || s.ServiceName, price };
          });

        if (discountInfoList.length > 0) {
          let msg = "Great news! Discounts have been applied to your services:\n\n";
          discountInfoList.forEach(d => {
            msg += `• ${d.name}\n  Offer: ${d.label}\n  Original: Rs. ${d.original}\n  Discounted: Rs. ${d.final}\n\n`;
          });
          Alert.alert("Special Discounts Applied!", msg);
        }

        svcList = svcList.map(s => {
          const match = matched.find(m => m.serviceId === s.serviceId || m.serviceName === s.serviceName);
          return match ? { ...s, price: Number(match.price) } : s;
        });
      }
    } catch (e) { console.warn('getservicesbystation error:', e); }

    const newBookingData = {
      stationId: parseInt(item.stationId), stationName: item.stationName,
      availableBayId: slot.bayId || slot.BayId, availableBayName: slot.bayName || slot.BayName,
      date: rebookDate, startTime: slot.start, endTime: slot.end,
      serviceNames: svcList.map(s => s.serviceName), serviceIds: svcList.map(s => s.serviceId),
      selectedServicesList: svcList,
      totalAmount: svcList.reduce((a, s) => a + parseFloat(s.price || 0), 0),
      vehicleName: `${vehicle.carCompany} ${vehicle.carModel}`,
      regNo: vehicle.numberPlate, carType: vehicle.carType || '', isVip,
    };

    setBookingData(newBookingData);
    setstationid(parseInt(item.stationId));
    setselectedbayid(slot.bayId || slot.BayId);
    setRebookModalVisible(false);
    navigation.navigate('Addbookingdetail');
  };

  // ────────────────────────────────────────────────────────────────────────
  // BOOKING REVIEW helpers
  // ────────────────────────────────────────────────────────────────────────
  const toggleBookingReview = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBookings(prev => prev.map(item =>
      item.bookingId === id ? { ...item, showReview: !item.showReview } : item
    ));
  };

  const updateBooking = (id, patch) =>
    setBookings(prev => prev.map(b => b.bookingId === id ? { ...b, ...patch } : b));

  const handlePickImageBooking = (id, type) => {
    const method = type === 'camera' ? launchCamera : launchImageLibrary;
    method({ mediaType: 'photo', quality: 0.6 }, (res) => {
      if (!res.didCancel && !res.errorCode) {
        const uri = res.assets[0].uri;
        setBookings(prev => prev.map(b => {
          if (b.bookingId !== id) return b;
          if (b.selectedImages.length >= 4) { Alert.alert("Limit", "Max 4 images."); return b; }
          return { ...b, selectedImages: [...b.selectedImages, uri] };
        }));
      }
    });
  };

  const submitBookingReview = async (item) => {
    if (item.rating === 0) { Alert.alert("Wait", "Please select stars!"); return; }
    const fd = new FormData();
    fd.append('BookingId',    item.bookingId);
    fd.append('FromUserId',   User?.id);
    fd.append('ToUserId',     item.stationId);
    fd.append('Rating',       item.rating);
    fd.append('Comment',      item.comment || "");
    fd.append('ReviewerRole', User?.role || "Customer");
    (item.selectedImages || []).forEach((uri, i) => {
      fd.append('Images', {
        uri:  Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        type: 'image/jpeg', name: `review_${item.bookingId}_${i}.jpg`
      });
    });
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/Customer/submit-booking-review`, {
        method: 'POST', headers: { 'Content-Type': 'multipart/form-data' }, body: fd
      });
      if (res.ok) { Alert.alert("Success", "Review submitted!"); fetchBookings(); }
      else        { Alert.alert("Error",   "Failed to submit review."); }
    } catch { Alert.alert("Error", "Check your internet."); }
    finally  { setLoading(false); }
  };

  // ────────────────────────────────────────────────────────────────────────
  // SERVICE REVIEW helpers
  // ────────────────────────────────────────────────────────────────────────
  const getSvcReview = (bookingId, serviceId) =>
    serviceReviews[bookingId]?.[serviceId] || defaultServiceReview();

  const updateSvcReview = (bookingId, serviceId, patch) => {
    setServiceReviews(prev => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || {}),
        [serviceId]: { ...getSvcReview(bookingId, serviceId), ...patch }
      }
    }));
  };

  const toggleSvcReview = (bookingId, serviceId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const cur = getSvcReview(bookingId, serviceId);
    updateSvcReview(bookingId, serviceId, { show: !cur.show });
  };

  const handlePickImageService = (bookingId, serviceId, type) => {
    const method = type === 'camera' ? launchCamera : launchImageLibrary;
    method({ mediaType: 'photo', quality: 0.6 }, (res) => {
      if (!res.didCancel && !res.errorCode) {
        const uri = res.assets[0].uri;
        const cur = getSvcReview(bookingId, serviceId);
        if (cur.selectedImages.length >= 4) { Alert.alert("Limit", "Max 4 images."); return; }
        updateSvcReview(bookingId, serviceId, { selectedImages: [...cur.selectedImages, uri] });
      }
    });
  };

  const submitServiceReview = async (item, service) => {
    const svcRev = getSvcReview(item.bookingId, service.serviceId);
    if (svcRev.rating === 0) { Alert.alert("Wait", "Please select stars!"); return; }
    const fd = new FormData();
    fd.append('ServiceId',  service.serviceId);
    fd.append('CustomerId', User?.id);
    fd.append('Rating',     svcRev.rating);
    fd.append('Comment',    svcRev.comment || "");
    (svcRev.selectedImages || []).forEach((uri, i) => {
      fd.append('Images', {
        uri:  Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        type: 'image/jpeg', name: `svc_review_${service.serviceId}_${i}.jpg`
      });
    });
    try {
      setLoading(true);
      const res    = await fetch(`${BASE_URL}/Customer/addservicereview`, {
        method: 'POST', headers: { 'Content-Type': 'multipart/form-data' }, body: fd
      });
      const result = await res.json();
      if (result.status === "success") {
        Alert.alert("✅ Success", `Review for "${service.serviceName}" submitted!`);
        updateSvcReview(item.bookingId, service.serviceId, {
          show: false, rating: 0, comment: '', selectedImages: []
        });
      } else {
        Alert.alert("❌ Error", result.message || "Failed.");
      }
    } catch { Alert.alert("Error", "Check your internet."); }
    finally  { setLoading(false); }
  };

  // ────────────────────────────────────────────────────────────────────────
  // DELETE BOOKING
  // ────────────────────────────────────────────────────────────────────────
  const handleDeleteBooking = (id) => {
    Alert.alert("Delete Booking", "Are you sure you want to delete this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes", style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const response = await fetch(`${BASE_URL}/Customer/delete-booking/${id}`, { method: 'DELETE' });
            const result   = await response.json();
            if (response.ok) {
              Alert.alert("Success", "Booking deleted successfully!");
              setBookings(prev => prev.filter(b => b.bookingId !== id));
            } else {
              Alert.alert("Error", result.message || "Could not delete booking");
            }
          } catch { Alert.alert("Error", "Server connection failed"); }
          finally  { setLoading(false); }
        }
      }
    ]);
  };

  // ────────────────────────────────────────────────────────────────────────
  // RENDER BOOKING CARD
  // ────────────────────────────────────────────────────────────────────────
  const renderBookingItem = ({ item }) => {
    const isExpanded  = expandedId === item.bookingId;
    const isDone      =  item.status.toLowerCase() === 'done';
    const isConfirmed = item.status.toLowerCase() === 'confirmed';

    // Station rating from API response
    const stationAvg   = parseFloat(item.stationAverageRating || 0).toFixed(1);
    const stationTotal = item.stationTotalReviews || 0;

    return (
      <View style={styles.card}>

        {/* ── CARD HEADER ── */}
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedId(isExpanded ? null : item.bookingId);
          }}
          activeOpacity={0.8}
          style={styles.cardHeader}
        >
          <View style={styles.headerTop}>
            <Text style={styles.stationName}>{item.stationName}</Text>
            <View style={[styles.statusBadge, isDone ? styles.completedBg : styles.confirmedBg]}>
              <Text style={[styles.statusText, isDone ? styles.completedText : styles.confirmedText]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.carText}>
            {item.carModel} • <Text style={styles.regNo}>{item.carNumber}</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={styles.regNo}>Booking ID: {item.bookingId}</Text>
            {item.bayName && (
              <View style={styles.bayBadge}>
                <Text style={styles.bayBadgeText}>🔧 {item.bayName}</Text>
              </View>
            )}
          </View>

          <View style={styles.dateTimeRow}>
            <Text style={styles.dateTimeText}>📅 {item.bookingDate?.split('T')[0]}</Text>
            <Text style={styles.dateTimeText}>⏰ {item.startTime}</Text>
          </View>

          {/* ── STATION RATING CHIP — tap karo to go to station reviews ── */}
          <TouchableOpacity
            style={styles.stationRatingChip}
            onPress={() => navigation.navigate('displaybookingreview', { item })}
            activeOpacity={0.75}
          >
            <View style={styles.starsRow}>
              {renderStars(stationAvg)}
            </View>
            <Text style={styles.ratingChipValue}>{stationAvg}</Text>
            <Text style={styles.ratingChipCount}>  {stationTotal} reviews</Text>
            <Text style={styles.ratingChipArrow}> ›</Text>
          </TouchableOpacity>

        </TouchableOpacity>

        {/* ── EXPANDED ── */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>SERVICES & PRODUCTS</Text>

            {/* Services list */}
            {item.bookingServices?.map((service, index) => {
              const svcRev   = getSvcReview(item.bookingId, service.serviceId);
              const showForm = svcRev.show;

              // Service rating from API response
              const svcAvg   = parseFloat(service.serviceAverageRating || 0).toFixed(1);
              const svcTotal = service.serviceTotalReviews || 0;

              return (
                <View key={index}>
                  <View style={styles.serviceItem}>

                    {/* LEFT: name + duration + service rating chip */}
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.sName}>{service.serviceName}</Text>
                      <Text style={styles.sDuration}>⏱ {service.duration} min</Text>

                      {/* ── SERVICE RATING CHIP — tap karo to go to service reviews ── */}
                      {/* <TouchableOpacity
                        style={styles.svcRatingChip}
                        onPress={() => navigation.navigate('ShowServiceReview', {
                          serviceId:   service.serviceId,
                          serviceName: service.serviceName,
                        })}
                        activeOpacity={0.75}
                      >
                        <View style={styles.starsRow}>
                          {renderStars(svcAvg)}
                        </View>
                        <Text style={styles.svcRatingValue}>{svcAvg}</Text>
                        <Text style={styles.svcRatingCount}>  {svcTotal} reviews</Text>
                        <Text style={styles.svcRatingArrow}> ›</Text>
                      </TouchableOpacity> */}
                    </View>

                    {/* RIGHT: price + action buttons */}
                    <View style={styles.serviceRight}>
                      <Text style={styles.sPrice}>Rs. {service.price}</Text>
                      {isDone && (
                        <View style={styles.svcBtnGroup}>
                          {/* Write Review */}
                          <TouchableOpacity
                            style={[styles.svcReviewBtn, showForm && styles.svcReviewBtnActive]}
                            onPress={() => toggleSvcReview(item.bookingId, service.serviceId)}
                          >
                            <Text style={[styles.svcReviewBtnText, showForm && { color: 'white' }]}>
                              {showForm ? 'Hide' : '⭐ Review'}
                            </Text>
                          </TouchableOpacity>

                          {/* View All Reviews */}
                          {/* <TouchableOpacity
                            style={styles.viewSvcReviewBtn}
                            onPress={() => navigation.navigate('ShowServiceReview', {
                              serviceId:   service.serviceId,
                              serviceName: service.serviceName,
                            })}
                          >
                            <Text style={styles.viewSvcReviewBtnText}>👁️ All Reviews</Text>
                          </TouchableOpacity> */}
                        </View>
                      )}
                    </View>
                  </View>

                  {isDone && showForm && (
                    <View style={styles.svcReviewWrapper}>
                      <Text style={styles.svcReviewTitle}>
                        Review: <Text style={{ color:'royalblue' }}>{service.serviceName}</Text>
                      </Text>
                      <ReviewForm
                        rating         = {svcRev.rating}
                        comment        = {svcRev.comment}
                        selectedImages = {svcRev.selectedImages}
                        onRating       = {(r) => updateSvcReview(item.bookingId, service.serviceId, { rating:r })}
                        onComment      = {(t) => updateSvcReview(item.bookingId, service.serviceId, { comment:t })}
                        onPickCamera   = {() => handlePickImageService(item.bookingId, service.serviceId, 'camera')}
                        onPickGallery  = {() => handlePickImageService(item.bookingId, service.serviceId, 'gallery')}
                        onRemoveImg    = {(idx) => updateSvcReview(item.bookingId, service.serviceId, {
                          selectedImages: svcRev.selectedImages.filter((_,i) => i !== idx)
                        })}
                        onSubmit       = {() => submitServiceReview(item, service)}
                        submitLabel    = {`Submit Review for ${service.serviceName}`}
                      />
                    </View>
                  )}
                </View>
              );
            })}

            {/* Oil / Filter */}
            {item.oilName && (
              <View style={styles.serviceItem}>
                <Text style={styles.sName}>🛢️ Oil: {item.oilName}</Text>
                <Text style={styles.sPrice}>{item.oilPrice}</Text>
              </View>
            )}
            {item.filterName && (
              <View style={styles.serviceItem}>
                <Text style={styles.sName}>⚙️ Filter: {item.filterName}</Text>
                <Text style={styles.sPrice}>{item.filterPrice}</Text>
              </View>
            )}

            {/* Grand Total */}
            <View style={styles.billContainer}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalAmount}>Rs. {item.totalAmount}</Text>
            </View>

            {/* ── ACTION BUTTONS ── */}
            <View style={styles.actionRow}>

              {isConfirmed && (
  <> 
    
    {/* Cancel Booking Button */}
    <TouchableOpacity
      style={styles.cancelBookingBtn}
      onPress={() => handleDeleteBooking(item.bookingId)}
    >
      <Text style={styles.cancelBookingText}>✕ Cancel Booking</Text>
    </TouchableOpacity>

    {/* Navigation Button with Booking ID */}
    <TouchableOpacity
      style={styles.navigateBtn} // 💡 Navigation ke liye alag design style
      onPress={() => navigation.navigate("directionmaps", { bookingId: item.bookingId })} 
      
    >
      <Text style={styles.navigateBtnText}>📍 Start Navigation</Text>
    </TouchableOpacity>

  </>
)}
              {isDone && (
                <View style={styles.stationReviewGroup}>
                  <TouchableOpacity
                    style={styles.reviewMainBtn}
                    onPress={() => toggleBookingReview(item.bookingId)}
                  >
                    <Text style={styles.reviewMainBtnText}>
                      {item.showReview ? "Hide Station Review" : "⭐ Review Queue"}
                    </Text>
                  </TouchableOpacity>

                  {/* <TouchableOpacity
                    style={styles.viewStationReviewBtn}
                    onPress={() => navigation.navigate('displaybookingreview', { item })}
                  >
                    <Text style={styles.viewStationReviewBtnText}>👁️ View Station Reviews</Text>
                  </TouchableOpacity> */}
                </View>
              )}

              {/* <TouchableOpacity style={styles.rebookBtn} onPress={() => openRebook(item)}>
                <Text style={styles.rebookBtnText}>🔄 Re-book Same Station</Text>
              </TouchableOpacity> */}
            </View>

            {/* Station Review Form */}
            {item.showReview && isDone && (
              <>
                <Text style={styles.bookingReviewTitle}>⭐ Station Review</Text>
                <ReviewForm
                  rating         = {item.rating}
                  comment        = {item.comment}
                  selectedImages = {item.selectedImages}
                  onRating       = {(r) => updateBooking(item.bookingId, { rating:r })}
                  onComment      = {(t) => updateBooking(item.bookingId, { comment:t })}
                  onPickCamera   = {() => handlePickImageBooking(item.bookingId, 'camera')}
                  onPickGallery  = {() => handlePickImageBooking(item.bookingId, 'gallery')}
                  onRemoveImg    = {(idx) => updateBooking(item.bookingId, {
                    selectedImages: item.selectedImages.filter((_,i) => i !== idx)
                  })}
                  onSubmit       = {() => submitBookingReview(item)}
                  submitLabel    = "Submit Station Review"
                />
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  // ────────────────────────────────────────────────────────────────────────
  // RE-BOOK MODAL
  // ────────────────────────────────────────────────────────────────────────
  const RebookModal = () => {
    const item = rebookBooking;
    if (!item) return null;

    const svcNames = (item.bookingServices || []).map(s => s.serviceName).join(', ');
    const totalDur = (item.bookingServices || []).reduce((a, s) => a + (s.duration || 0), 0);

    const goToSlots = () => { setRebookStep('slots'); fetchSlotsForDate(item, rebookDate); };
    const pickSlot  = (slot) => { setRebookSelectedSlot(slot); setRebookStep('vehicle'); fetchVehicles(); };

    return (
      <Modal visible={rebookModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.rebookHeader}>
              <TouchableOpacity onPress={() => {
                if (rebookStep === 'slots') setRebookStep('date');
                else if (rebookStep === 'vehicle') setRebookStep('slots');
                else setRebookModalVisible(false);
              }}>
                <Text style={styles.rebookClose}>{rebookStep === 'date' ? '✕' : '←'}</Text>
              </TouchableOpacity>
              <Text style={styles.rebookTitle}>
                {rebookStep === 'date' ? '📅 Select Date' : rebookStep === 'slots' ? '🕐 Pick a Slot' : '🚗 Select Vehicle'}
              </Text>
              <TouchableOpacity onPress={() => setRebookModalVisible(false)}>
                <Text style={styles.rebookClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rebookInfoCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rebookStationName}>{item.stationName}</Text>
                <Text style={styles.rebookServices} numberOfLines={2}>🔧 {svcNames}</Text>
                <Text style={styles.rebookDuration}>⏱ Total: {totalDur} min</Text>
              </View>
            </View>

            {rebookStep === 'date' && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ fontSize: 13, color: '#777', marginBottom: 12 }}>Choose a date to rebook:</Text>
                <TouchableOpacity style={styles.dateBadge} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateBadgeText}>📅  {rebookDate}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={rebookDate ? new Date(rebookDate) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate) setRebookDate(formatToISODate(selectedDate.toISOString()));
                    }}
                  />
                )}
                <TouchableOpacity style={[styles.rebookSlotCta2, { marginTop: 24 }]} onPress={goToSlots}>
                  <Text style={styles.rebookSlotCtaText}>View Available Slots →</Text>
                </TouchableOpacity>
              </View>
            )}

            {rebookStep === 'slots' && (
              <>
                <Text style={styles.rebookSlotsLabel}>Slots for {rebookDate}:</Text>
                {rebookLoading ? (
                  <View style={styles.rebookLoadingBox}>
                    <ActivityIndicator size="large" color="royalblue" />
                    <Text style={styles.rebookLoadingText}>Finding free slots...</Text>
                  </View>
                ) : rebookSlots.length === 0 ? (
                  <View style={styles.rebookEmptyBox}>
                    <Text style={styles.rebookEmptyIcon}>😔</Text>
                    <Text style={styles.rebookEmptyTitle}>No free slots</Text>
                    <Text style={styles.rebookEmptyText}>Try another date.</Text>
                    <TouchableOpacity onPress={() => setRebookStep('date')} style={{ marginTop: 10 }}>
                      <Text style={{ color: 'royalblue', fontWeight: 'bold' }}>← Change Date</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={rebookSlots}
                    keyExtractor={(s, i) => i.toString()}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    style={{ maxHeight: 300 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item: slot }) => {
                      const [h] = (slot.start || '00:00').split(':').map(Number);
                      const isVipSlot = h === 13;
                      return (
                        <TouchableOpacity
                          style={[styles.rebookSlotCard, isVipSlot && { borderColor: '#FFD700', borderWidth: 2 }]}
                          onPress={() => pickSlot(slot)}
                          activeOpacity={0.8}
                        >
                          {isVipSlot && (
                            <View style={styles.vipBadge}>
                              <Text style={styles.vipBadgeText}>⭐ VIP</Text>
                            </View>
                          )}
                          <Text style={styles.rebookSlotTime}>{slot.display?.split(' - ')[0] || slot.start}</Text>
                          <Text style={styles.rebookSlotEnd}>→ {slot.display?.split(' - ')[1] || slot.end}</Text>
                          <View style={styles.rebookSlotBayBadge}>
                            <Text style={styles.rebookSlotBayText}>🔧 {slot.bayName}</Text>
                          </View>
                          <View style={styles.rebookSlotCta}>
                            <Text style={styles.rebookSlotCtaText}>Select</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </>
            )}

            {rebookStep === 'vehicle' && (
              <>
                <Text style={styles.rebookSlotsLabel}>Select your vehicle:</Text>
                {vehicleLoading ? (
                  <View style={styles.rebookLoadingBox}>
                    <ActivityIndicator size="large" color="royalblue" />
                    <Text style={styles.rebookLoadingText}>Loading vehicles...</Text>
                  </View>
                ) : vehicles.length === 0 ? (
                  <View style={styles.rebookEmptyBox}>
                    <Text style={styles.rebookEmptyIcon}>🚗</Text>
                    <Text style={styles.rebookEmptyTitle}>No vehicles found</Text>
                    <Text style={styles.rebookEmptyText}>Add a vehicle from your profile.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={vehicles}
                    keyExtractor={(v) => v.vehicleId.toString()}
                    style={{ maxHeight: 320 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item: v }) => (
                      <TouchableOpacity
                        style={styles.vehicleCard}
                        onPress={() => confirmRebook(v)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.vehicleModel}>{v.carCompany} {v.carModel}</Text>
                          <Text style={styles.vehiclePlate}>{v.numberPlate}</Text>
                          <Text style={styles.vehicleType}>{v.carType}</Text>
                        </View>
                        <View style={styles.vehicleSelectBtn}>
                          <Text style={styles.vehicleSelectText}>Book →</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </>
            )}

            <TouchableOpacity style={styles.rebookCancelBtn} onPress={() => setRebookModalVisible(false)}>
              <Text style={styles.rebookCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>My Appointments</Text>
      </View>

      <View style={styles.tabBar}>
        {['Confirmed', 'Done'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.noteContainer}>
        <Text style={styles.noteTitle}>⚠️ Important Booking Policy</Text>
        <Text style={styles.noteText}>
          If you are more than <Text style={{ fontWeight:'bold' }}>10 minutes late</Text>, the station
          reserves the right to <Text style={{ fontWeight:'bold' }}>cancel</Text> your booking.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="royalblue" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.bookingId.toString()}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No {activeTab} bookings found.</Text>
          }
        />
      )}

      <RebookModal />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex:1, backgroundColor:'#F8F9FA' },
  screenHeader:   { padding:15, backgroundColor:'white', borderBottomWidth:1, borderBottomColor:'#EEE' },
  screenTitle:    { fontSize:20, fontWeight:'bold', textAlign:'center' },

  tabBar:         { flexDirection:'row', backgroundColor:'white', padding:5, marginHorizontal:15, marginTop:10, borderRadius:10, elevation:2 },
  tab:            { flex:1, paddingVertical:10, alignItems:'center', borderRadius:8 },
  activeTab:      { backgroundColor:'royalblue' },
  tabText:        { fontWeight:'bold', color:'gray' },
  activeTabText:  { color:'white' },

  noteContainer:  { backgroundColor:'#FFF1F1', padding:12, marginHorizontal:15, marginTop:10, borderRadius:10, borderWidth:1, borderColor:'#FFD1D1' },
  noteTitle:      { fontSize:13, fontWeight:'bold', color:'#D32F2F', marginBottom:2 },
  noteText:       { fontSize:11, color:'#444', lineHeight:16 },

  listPadding:    { paddingHorizontal:15, paddingVertical:15 },
  card:           { backgroundColor:'white', borderRadius:15, marginBottom:15, elevation:3 },
  cardHeader:     { padding:15 },
  headerTop:      { flexDirection:'row', justifyContent:'space-between' },
  stationName:    { fontSize:16, fontWeight:'bold', flex:0.7 },
  statusBadge:    { paddingHorizontal:10, borderRadius:5, height:22, justifyContent:'center' },
  completedBg:    { backgroundColor:'#E8F5E9' },
  confirmedBg:    { backgroundColor:'#E3F2FD' },
  statusText:     { fontSize:10, fontWeight:'bold' },
  completedText:  { color:'green' },
  confirmedText:  { color:'royalblue' },
  carText:        { marginTop:5, fontSize:14 },
  regNo:          { fontWeight:'bold', color:'royalblue', marginTop:5 },
  dateTimeRow:    { flexDirection:'row', marginTop:10, gap:20 },
  dateTimeText:   { fontSize:12, color:'gray' },

  // ── Station Rating Chip ──
  stationRatingChip: {
    flexDirection:'row', alignItems:'center',
    marginTop:10, alignSelf:'flex-start',
    backgroundColor:'#FFFBEA', borderRadius:20,
    paddingHorizontal:10, paddingVertical:5,
    borderWidth:1, borderColor:'#FFD54F',
  },
  starsRow:        { flexDirection:'row' },
  ratingChipValue: { fontSize:12, fontWeight:'bold', color:'#E65100', marginLeft:4 },
  ratingChipCount: { fontSize:11, color:'#888' },
  ratingChipArrow: { fontSize:15, color:'#FFA000', fontWeight:'bold' },

  expandedSection: { padding:15, borderTopWidth:1, borderColor:'#EEE', backgroundColor:'#FAFAFA' },
  divider:         { height:1, backgroundColor:'#EEE', marginVertical:10 },
  sectionTitle:    { fontSize:11, fontWeight:'bold', color:'#888', marginBottom:10, letterSpacing:1 },

  serviceItem:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, paddingBottom:8, borderBottomWidth:1, borderBottomColor:'#F5F5F5' },
  serviceRight:   { alignItems:'flex-end', gap:6 },
  sName:          { fontSize:14, color:'#333', fontWeight:'600' },
  sDuration:      { fontSize:11, color:'#999', marginTop:2 },
  sPrice:         { fontSize:14, fontWeight:'bold', color:'#222' },

  // ── Service Rating Chip ──
  svcRatingChip: {
    flexDirection:'row', alignItems:'center',
    marginTop:5, alignSelf:'flex-start',
    backgroundColor:'#F3F0FF', borderRadius:12,
    paddingHorizontal:7, paddingVertical:3,
    borderWidth:1, borderColor:'#C5CEFF',
  },
  svcRatingValue: { fontSize:11, fontWeight:'bold', color:'#3949AB', marginLeft:3 },
  svcRatingCount: { fontSize:10, color:'#888' },
  svcRatingArrow: { fontSize:13, color:'#5C6BC0', fontWeight:'bold' },

  navigateBtn: {
  backgroundColor: '#007AFF', // Professional Blue color navigation ke liye
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 10, // Dono buttons ke beech gap ke liye
},
navigateBtnText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 'bold',
},

  // Service review buttons
  svcBtnGroup:          { alignItems:'flex-end', gap:5 },
  svcReviewBtn:         { backgroundColor:'#EEF3FF', paddingHorizontal:10, paddingVertical:5, borderRadius:6, borderWidth:1, borderColor:'royalblue' },
  svcReviewBtnActive:   { backgroundColor:'royalblue' },
  svcReviewBtnText:     { fontSize:11, fontWeight:'bold', color:'royalblue' },
  viewSvcReviewBtn:     { backgroundColor:'#F0FFF4', paddingHorizontal:10, paddingVertical:5, borderRadius:6, borderWidth:1, borderColor:'#34A853' },
  viewSvcReviewBtnText: { fontSize:11, fontWeight:'bold', color:'#1E7E34' },

  svcReviewWrapper:   { backgroundColor:'#F0F4FF', borderRadius:12, padding:12, marginBottom:10, borderWidth:1, borderColor:'#C5D5FF' },
  svcReviewTitle:     { fontSize:13, fontWeight:'bold', color:'#333', marginBottom:8 },
  bookingReviewTitle: { fontSize:13, fontWeight:'bold', color:'#333', marginTop:8, marginBottom:4 },

  billContainer:  { flexDirection:'row', justifyContent:'space-between', marginTop:10, padding:10, backgroundColor:'white', borderRadius:8, borderWidth:1, borderColor:'#EEE' },
  totalLabel:     { fontWeight:'bold', color:'gray' },
  totalAmount:    { fontWeight:'bold', fontSize:16, color:'black' },

  actionRow:                { marginTop:15, gap:10 },
  cancelBookingBtn:         { backgroundColor:'#FFE5E5', padding:12, borderRadius:10, alignItems:'center' },
  cancelBookingText:        { color:'red', fontWeight:'bold' },
  stationReviewGroup:       { gap:8 },
  reviewMainBtn:            { backgroundColor:'royalblue', padding:12, borderRadius:10, alignItems:'center' },
  reviewMainBtnText:        { color:'white', fontWeight:'bold' },
  viewStationReviewBtn:     { backgroundColor:'#F0FFF4', padding:12, borderRadius:10, alignItems:'center', borderWidth:1.5, borderColor:'#34A853' },
  viewStationReviewBtnText: { color:'#1E7E34', fontWeight:'bold' },
  rebookBtn:                { backgroundColor:'#1A1A2E', padding:13, borderRadius:10, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:6 },
  rebookBtnText:            { color:'white', fontWeight:'bold', fontSize:14 },

  reviewContainer: { backgroundColor:'white', padding:15, borderRadius:12, marginTop:10, borderWidth:1, borderColor:'#EEE' },
  starRow:         { flexDirection:'row', justifyContent:'center', marginBottom:12 },
  starIcon:        { fontSize:34, marginHorizontal:4 },
  imageActionRow:  { flexDirection:'row', justifyContent:'space-between', marginBottom:10 },
  imgActionBtn:    { flex:0.48, backgroundColor:'#F0F0F0', padding:10, borderRadius:8, alignItems:'center', borderWidth:1, borderColor:'#DDD' },
  previewScroll:   { flexDirection:'row', marginBottom:10 },
  imgWrapper:      { position:'relative', marginRight:10, marginTop:5 },
  thumbImg:        { width:70, height:70, borderRadius:8 },
  delImg:          { position:'absolute', right:-5, top:-5, backgroundColor:'red', borderRadius:10, width:20, height:20, justifyContent:'center', alignItems:'center' },
  commentInput:    { backgroundColor:'#F9F9F9', borderRadius:8, padding:10, height:70, textAlignVertical:'top', borderWidth:1, borderColor:'#DDD', marginTop:6 },
  submitBtn:       { backgroundColor:'black', marginTop:12, padding:14, borderRadius:10, alignItems:'center' },
  submitText:      { color:'white', fontWeight:'bold' },
  emptyText:       { textAlign:'center', marginTop:50, color:'gray' },

  modalOverlay:  { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalSheet:    { backgroundColor:'white', borderTopLeftRadius:28, borderTopRightRadius:28, padding:22, paddingBottom:36, maxHeight:'85%' },
  modalHandle:   { width:40, height:4, backgroundColor:'#DDD', borderRadius:2, alignSelf:'center', marginBottom:16 },
  rebookHeader:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  rebookTitle:   { fontSize:20, fontWeight:'bold', color:'#111' },
  rebookClose:   { fontSize:20, color:'#999', padding:4 },
  rebookInfoCard:    { backgroundColor:'#F0F4FF', borderRadius:14, padding:14, marginBottom:16, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#C5D5FF' },
  rebookStationName: { fontSize:15, fontWeight:'bold', color:'#222', marginBottom:4 },
  rebookServices:    { fontSize:12, color:'#555', marginBottom:3 },
  rebookDuration:    { fontSize:12, color:'royalblue', fontWeight:'600' },
  rebookSlotsLabel:  { fontSize:13, fontWeight:'bold', color:'#555', marginBottom:12 },
  rebookLoadingBox:  { padding:40, alignItems:'center' },
  rebookLoadingText: { marginTop:12, color:'gray', fontSize:14 },
  rebookEmptyBox:    { padding:30, alignItems:'center' },
  rebookEmptyIcon:   { fontSize:40, marginBottom:10 },
  rebookEmptyTitle:  { fontSize:16, fontWeight:'bold', color:'#333', marginBottom:6 },
  rebookEmptyText:   { fontSize:13, color:'#777', textAlign:'center', lineHeight:20 },
  rebookSlotCard:     { backgroundColor:'white', width:'48%', borderRadius:14, padding:14, marginBottom:12, borderWidth:1.5, borderColor:'#E0E7FF', elevation:2 },
  rebookSlotTime:     { fontSize:18, fontWeight:'bold', color:'#111' },
  rebookSlotEnd:      { fontSize:12, color:'#666', marginBottom:8 },
  rebookSlotBayBadge: { backgroundColor:'#FFF3E0', borderRadius:8, paddingHorizontal:8, paddingVertical:4, alignSelf:'flex-start', marginBottom:10 },
  rebookSlotBayText:  { fontSize:11, color:'#E65100', fontWeight:'bold' },
  rebookSlotCta:      { backgroundColor:'royalblue', borderRadius:8, padding:8, alignItems:'center' },
  rebookSlotCtaText:  { color:'white', fontWeight:'bold', fontSize:12 },
  rebookCancelBtn:    { marginTop:12, padding:12, alignItems:'center' },
  rebookCancelText:   { color:'#999', fontWeight:'bold', fontSize:14 },
  dateBadge:      { backgroundColor:'#1A1A2E', paddingHorizontal:20, paddingVertical:10, borderRadius:12 },
  dateBadgeText:  { color:'white', fontWeight:'bold', fontSize:16, letterSpacing:1 },
  rebookSlotCta2: { backgroundColor:'royalblue', paddingHorizontal:30, paddingVertical:13, borderRadius:12, alignItems:'center' },
  vipBadge:       { backgroundColor:'#FFF8E1', borderRadius:6, paddingHorizontal:6, paddingVertical:2, alignSelf:'flex-start', marginBottom:4 },
  vipBadgeText:   { fontSize:10, fontWeight:'bold', color:'#F9A825' },
  vehicleCard:       { flexDirection:'row', alignItems:'center', backgroundColor:'white', borderRadius:12, padding:14, marginBottom:10, borderWidth:1.5, borderColor:'#E0E7FF', elevation:2 },
  vehicleModel:      { fontSize:15, fontWeight:'bold', color:'#111', marginBottom:2 },
  vehiclePlate:      { fontSize:13, color:'royalblue', fontWeight:'bold', marginBottom:2 },
  vehicleType:       { fontSize:12, color:'#888' },
  vehicleSelectBtn:  { backgroundColor:'royalblue', paddingHorizontal:14, paddingVertical:8, borderRadius:8 },
  vehicleSelectText: { color:'white', fontWeight:'bold', fontSize:13 },
  
  bayBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  bayBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1976D2',
    textTransform: 'uppercase',
  },
});

export default Mybooking;