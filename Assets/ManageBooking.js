import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity, SectionList,
  SafeAreaView, ActivityIndicator, Alert, Platform, UIManager, ScrollView, Image, LayoutAnimation, TextInput
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { UserContext,TimerContext } from './UserContext'; 
import { BASE_URL } from './Constants'; 

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const CountdownTimer = ({ bookingId }) => {
  const { globalTimers, formatTime } = useContext(TimerContext);
  const timeLeft = globalTimers[bookingId] || 0;

  return (
    <View style={styles.timerBadge}>
      <Text style={styles.timerText}>⏳ Progress: {formatTime(timeLeft)}</Text>
    </View>
  );
};

const ManageBooking = () => {
 
const { User } = useContext(UserContext);


 const { startGlobalTimer, stopGlobalTimer, globalTimers, formatTime } = useContext(TimerContext);; 
  const [bookings, setBookings] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('Confirmed'); 
  const [activeTimers, setActiveTimers] = useState({});

  useEffect(() => { 
    if (User?.id) fetchStations(); 
  }, [User]);

  useEffect(() => { 
    if (selectedStationId) {
      fetchBookings(selectedStationId, filter); 
    }
  }, [filter, selectedStationId]);

  const fetchStations = async () => {
    try {
      const response = await fetch(`${BASE_URL}/Station/getstationlist/${User.id}`);
      const json = await response.json();
      if (json.status === "success" && json.data.length > 0) {
        setStations(json.data);
        setSelectedStationId(json.data[0].stationId);
      }
    } catch (error) { console.log("Station Fetch Error:", error); }
  };

  const fetchBookings = async (stationId, currentStatus) => {
    try {
      setLoading(true);
      const url = `${BASE_URL}/Station/manage-bookings?stationId=${stationId}&status=${currentStatus}`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setBookings(data.map(item => ({
          ...item,
          showReview: false,
          rating: 0,
          comment: '',
          selectedImages: [] 
        })));
        console.log(bookings)
      } else {
        setBookings([]);
      }
    } catch (error) { 
      setBookings([]);
    } finally { 
      setLoading(false); 
    }
  };

  const handleStatusUpdate = (bookingId, newStatus) => {
    Alert.alert(
      "Confirm Action",
      `Are you sure you want to mark this as ${newStatus}?`,
      [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: () => {
            // Agar status "Done" ya "Cancelled" ho raha hai to global timer stop kar do
            stopGlobalTimer(bookingId);
            updateStatus(bookingId, newStatus);
          } 
        }
      ]
    );
  };

  const updateStatus = async (bookingId, newStatus) => {
    try {
      const response = await fetch(`${BASE_URL}/Station/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ BookingId: bookingId, Status: newStatus })
      });
      const json = await response.json();
      if (json.status === "success") {
        Alert.alert("Success", `Status updated to ${newStatus}`);
        fetchBookings(selectedStationId, filter);
      }
    } catch (error) { Alert.alert("Error", "Update failed."); }
  };

  const toggleReview = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBookings(bookings.map(item => 
      item.bookingId === id ? { ...item, showReview: !item.showReview } : item
    ));
  };

  const pickImage = (id, type) => {
    const options = { mediaType: 'photo', quality: 0.7 };
    const method = type === 'camera' ? launchCamera : launchImageLibrary;
    method(options, (response) => {
      if (!response.didCancel && !response.errorCode) {
        const uri = response.assets[0].uri;
        setBookings(bookings.map(item => {
          if (item.bookingId === id) {
            if (item.selectedImages.length >= 4) {
              Alert.alert("Limit", "Max 4 images allowed");
              return item;
            }
            return { ...item, selectedImages: [...item.selectedImages, uri] };
          }
          return item;
        }));
      }
    });
  };

  const submitReview = async (item) => {
    if(item.rating === 0) { Alert.alert("Wait", "Please select stars!"); return; }

    const formData = new FormData();
    formData.append('BookingId', item.bookingId);
    formData.append('FromUserId', selectedStationId); 
    formData.append('ToUserId', item.userId); 
    formData.append('Rating', item.rating);
    formData.append('Comment', item.comment || "");
    formData.append('ReviewerRole', User?.role || "StationOwner");

    if (item.selectedImages && item.selectedImages.length > 0) {
      item.selectedImages.forEach((uri, index) => {
        formData.append('Images', {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          type: 'image/jpeg',
          name: `review_${item.bookingId}_${index}.jpg`,
        });
      });
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/Customer/submit-booking-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      if (response.ok) {
        Alert.alert("Success", "Feedback sent to customer!");
        toggleReview(item.bookingId);
      } else {
        Alert.alert("Error", "Failed to submit review.");
      }
    } catch (error) {
      Alert.alert("Error", "Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; 
    return `${h}:${minutes} ${ampm}`;
  };

  const getSections = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sectionsMap = {};

    const sortedBookings = [...bookings].sort((a, b) => {
        const dateA = new Date(a.bookingDate);
        const dateB = new Date(b.bookingDate);
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
        if (a.startTime > b.startTime) return -1;
        if (a.startTime < b.startTime) return 1;
        return 0;
    });

    sortedBookings.forEach(b => {
        const bDate = new Date(b.bookingDate);
        bDate.setHours(0, 0, 0, 0);

        let sectionName = "";
        if (bDate.getTime() === today.getTime()) {
            sectionName = "Today";
        } else if (bDate.getTime() === tomorrow.getTime()) {
            sectionName = "Tomorrow";
        } else if (bDate > tomorrow) {
            sectionName = "Upcoming";
        } else if (bDate.getTime() === yesterday.getTime()) {
            sectionName = "Yesterday";
        } else {
            sectionName = "Older";
        }

        if (!sectionsMap[sectionName]) {
            sectionsMap[sectionName] = [];
        }
        sectionsMap[sectionName].push(b);
    });

    const sections = [];
    ['Today', 'Tomorrow', 'Upcoming', 'Yesterday', 'Older'].forEach(sec => {
        if (sectionsMap[sec] && sectionsMap[sec].length > 0) {
            sections.push({ title: sec, data: sectionsMap[sec] });
        }
    });

    return sections;
  };

  const renderBookingItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.custName}>{item.customerName}</Text>
          <Text style={styles.regNo}>Booking #{item.bookingId}</Text>
          <Text style={styles.carInfo}>{item.carModel} • <Text style={styles.regNo}>{item.carNumber}</Text></Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            <View style={[styles.bayBadge, {marginRight: 6}]}>
              <Text style={styles.bayText}>📍 {item.bayName}</Text>
            </View>
            <View style={[styles.bayBadge, {backgroundColor: '#E8F5E9'}]}>
              <Text style={[styles.bayText, {color: '#2E7D32'}]}>📅 {item.bookingDate} ({formatTime12Hour(item.startTime)} - {formatTime12Hour(item.endTime)})</Text>
            </View>
          </View>
          <Text style={{fontSize: 11, color: '#888', marginTop: 6}}>Booked on: {new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        <Text style={styles.amountText}>Rs. {item.totalAmount}</Text>
      </View>

      <View style={styles.detailBox}>
        <Text style={styles.sectionTitle}>Services:</Text>
        {item.bookingServices?.map((s, index) => (
          <View key={index} style={styles.serviceRow}>
            <Text style={styles.serviceBullet}>• {s.serviceName}</Text>
            <Text style={styles.servicePrice}>Rs. {s.price}</Text>
          </View>
        ))}
{(item.filterId || item.oilId) && <View style={styles.separator} />}
{item.filterId && (
  <View style={styles.serviceRow}>
    <Text style={styles.serviceBullet}>• {item.filterName}</Text>
    <Text style={styles.servicePrice}>Rs. {item.filterPrice}</Text>
  </View>
)}
{item.oilId && (
  <View style={styles.serviceRow}>
    <Text style={styles.serviceBullet}>• {item.oilName}</Text>
    <Text style={styles.servicePrice}>Rs. {item.oilPrice}</Text>
  </View>
)}

{(item.filterId || item.oilId) && <View style={styles.separator} />}

        {/* Yahan Global Timer check ho raha hai */}
        {globalTimers[item.bookingId] !== undefined && filter === 'Confirmed' ? (
          <CountdownTimer bookingId={item.bookingId} />
        ) : (
          <Text style={styles.durationText}>Total Duration: {item.totalDurationMinutes} mins</Text>
        )}
      </View>

      <View style={styles.actionSection}>
        <Text style={[
            styles.statusLabel, 
            filter === 'Done' ? styles.doneColor : 
            filter === 'Cancelled' ? styles.cancelColor : styles.pendingColor
        ]}>
          {filter === 'Done' ? "✅ COMPLETED" : 
           filter === 'Cancelled' ? "❌ CANCELLED" : "⏳ " + item.status.toUpperCase()}
        </Text>
        
        <View style={styles.btnGroup}>
          {filter === 'Confirmed' && (
            <>
              {globalTimers[item.bookingId] === undefined ? (
                <TouchableOpacity style={styles.startBtn} onPress={() => startGlobalTimer(item.bookingId, item.totalDurationMinutes)}>
                  <Text style={styles.btnText}>Start</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.stopBtn} onPress={() => handleStatusUpdate(item.bookingId, "Done")}>
                  <Text style={styles.btnText}>Stop</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.stopBtn, {backgroundColor: '#FF3B30'}]} onPress={() => handleStatusUpdate(item.bookingId, "Cancelled")}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {/* {filter === 'Done' && (
            <TouchableOpacity style={styles.reviewMainBtn} onPress={() => toggleReview(item.bookingId)}>
              <Text style={styles.reviewMainBtnText}>{item.showReview ? "Hide Review" : "⭐ Review Customer"}</Text>
            </TouchableOpacity>
          )} */}
        </View>
      </View>

      {item.showReview && (
        <View style={styles.reviewContainer}>
          <Text style={styles.rateTitle}>Rate Customer Conduct</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setBookings(bookings.map(b => b.bookingId === item.bookingId ? {...b, rating: star} : b))}>
                <Text style={[styles.starIcon, { color: star <= item.rating ? 'orange' : 'lightgray' }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.imageActionRow}>
            <TouchableOpacity style={styles.imgBtn} onPress={() => pickImage(item.bookingId, 'camera')}>
              <Text>📸 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imgBtn} onPress={() => pickImage(item.bookingId, 'gallery')}>
              <Text>🖼️ Gallery</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScroll}>
            {item.selectedImages.map((uri, idx) => (
              <View key={idx} style={styles.imgWrapper}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity 
                  style={styles.delImg} 
                  onPress={() => setBookings(bookings.map(b => b.bookingId === item.bookingId ? {...b, selectedImages: b.selectedImages.filter((_, i) => i !== idx)} : b))}
                >
                  <Text style={{color: 'white', fontSize: 10}}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TextInput 
            style={styles.commentInput} 
            placeholder="How was the experience with this customer?" 
            multiline
            value={item.comment}
            onChangeText={(txt) => setBookings(bookings.map(b => b.bookingId === item.bookingId ? {...b, comment: txt} : b))}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={() => submitReview(item)}>
            <Text style={styles.submitText}>Submit Review</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.title}>Booking Management</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stationScroll}>
          {stations.map((s) => (
            <TouchableOpacity 
              key={s.stationId} 
              style={[styles.stationChip, selectedStationId === s.stationId && styles.activeStationChip]}
              onPress={() => setSelectedStationId(s.stationId)}
            >
              <Text style={[styles.stationChipText, selectedStationId === s.stationId && { color: 'white' }]}>{s.stationName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.tabContainer}>
          {['Confirmed', 'Done', 'Cancelled'].map(t => (
            <TouchableOpacity key={t} style={[styles.tab, filter === t && styles.activeTab]} onPress={() => setFilter(t)}>
              <Text style={[styles.tabText, filter === t && {color: 'royalblue'}]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color="royalblue" style={{marginTop: 20}} /> : 
        <SectionList 
          sections={getSections()} 
          renderItem={renderBookingItem} 
          renderSectionHeader={({section: {title}}) => (
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionHeader}>{title}</Text>
            </View>
          )}
          keyExtractor={item => item.bookingId.toString()} 
          contentContainerStyle={{padding: 15}}
          ListEmptyComponent={<Text style={styles.emptyText}>No {filter.toLowerCase()} bookings.</Text>}
        />
      }
    </SafeAreaView>
  );
};

// Styles same rahen ge
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  topHeader: { padding: 15, backgroundColor: 'white', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 4 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#1A1A1A' },
  stationScroll: { paddingBottom: 10 },
  stationChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 8, borderWidth: 1, borderColor: '#DDD' },
  activeStationChip: { backgroundColor: 'royalblue', borderColor: 'royalblue' },
  stationChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 10, padding: 4, marginTop: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { backgroundColor: 'white', borderRadius: 8, elevation: 2 },
  tabText: { fontWeight: 'bold', color: 'gray', fontSize: 13 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  custName: { fontSize: 17, fontWeight: 'bold', color: 'black' },
  carInfo: { color: 'gray', fontSize: 13, marginTop: 2 },
  regNo: { color: 'royalblue', fontWeight: 'bold' },
  bayBadge: { backgroundColor: '#E3F2FD', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  bayText: { fontSize: 11, color: '#1976D2', fontWeight: 'bold' },
  amountText: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32' },
  detailBox: { marginVertical: 12, padding: 12, backgroundColor: '#F8F9FA', borderRadius: 10, borderWidth: 1, borderColor: '#EEE' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#444', marginBottom: 6 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  serviceBullet: { fontSize: 13, color: '#333' },
  servicePrice: { fontSize: 12, color: '#777' },
  separator: { height: 1, backgroundColor: '#EEE', marginVertical: 8 },
  durationText: { fontWeight: '600', color: '#666', fontSize: 12 },
  timerBadge: { backgroundColor: '#FFEBEE', padding: 10, borderRadius: 8, alignItems: 'center' },
  timerText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  actionSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  btnGroup: { flexDirection: 'row', gap: 8 },
  startBtn: { backgroundColor: '#34C759', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8 },
  stopBtn: { backgroundColor: '#FF9500', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8 },
  reviewMainBtn: { backgroundColor: 'royalblue', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 8 },
  reviewMainBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  statusLabel: { fontWeight: 'bold', fontSize: 12 },
  doneColor: { color: '#2E7D32' },
  cancelColor: { color: '#D32F2F' },
  pendingColor: { color: '#EF6C00' },
  emptyText: { textAlign: 'center', marginTop: 40, color: 'gray' },
  reviewContainer: { marginTop: 15, padding: 15, backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
  rateTitle: { textAlign: 'center', fontWeight: 'bold', marginBottom: 10 },
  starRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  starIcon: { fontSize: 35, marginHorizontal: 5 },
  imageActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  imgBtn: { flex: 0.48, backgroundColor: 'white', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#DDD' },
  previewScroll: { flexDirection: 'row', marginBottom: 10 },
  imgWrapper: { marginRight: 10, position: 'relative' },
  thumbImg: { width: 60, height: 60, borderRadius: 8 },
  delImg: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  commentInput: { backgroundColor: 'white', borderRadius: 10, padding: 12, height: 70, textAlignVertical: 'top', borderWidth: 1, borderColor: '#DDD' },
  submitBtn: { backgroundColor: 'black', marginTop: 12, padding: 14, borderRadius: 10, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold' },
  sectionHeaderContainer: { backgroundColor: '#F0F2F5', paddingVertical: 8, marginBottom: 10 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 5 }
});

export default ManageBooking;