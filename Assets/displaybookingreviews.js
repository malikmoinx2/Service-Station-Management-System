import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, View, Text, SafeAreaView, TouchableOpacity, 
  ScrollView, StatusBar, ActivityIndicator, Alert, 
  Image, Modal 
} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const displaybookingreview = ({ route, navigation }) => {
  const { User } = useContext(UserContext); // Login user ka data
  const { item } = route.params; // Navigation se milne wala data
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [threads, setThreads] = useState([]);

  const stationId = item.stationId;
  const serverUrl = BASE_URL.replace('/api', '');

  useEffect(() => {
    fetchStationReviews();
  }, []);

  const fetchStationReviews = () => {
    setLoading(true);
    fetch(`${BASE_URL}/Station/get-all-station-reviews/${stationId}`)
    .then((response) => response.json())
    .then((responseJson) => {
      setLoading(false);
      if (responseJson.status === "success") {
        let groupedData = processThreads(responseJson.data);
        
        // Sort so that the logged-in Customer's own reviews appear at the top
        if (User?.role === "Customer") {
          groupedData.sort((a, b) => {
            const aCust = a.customerReview;
            const bCust = b.customerReview;
            const aIsMine = aCust && (
              aCust.fromUserId == User.id || 
              aCust.reviewerId == User.id || 
              aCust.customerId == User.id
            );
            const bIsMine = bCust && (
              bCust.fromUserId == User.id || 
              bCust.reviewerId == User.id || 
              bCust.customerId == User.id
            );
            if (aIsMine && !bIsMine) return -1;
            if (!aIsMine && bIsMine) return 1;
            return 0;
          });
        }
        
        setThreads(groupedData);
      }
    })
    .catch((error) => {
      setLoading(false);
      Alert.alert("Error", "Could not connect to server.");
    });
  };

  const processThreads = (rawData) => {
    const groups = {};
    rawData.forEach(item => {
      const bId = item.bookingId;
      if (!groups[bId]) {
        groups[bId] = { bookingId: bId, customerReview: null, stationReply: null };
      }
      
      const type = (item.type || "").trim().toLowerCase();
      if (type === "receivedbystation" || type === "received") {
        groups[bId].customerReview = item;
      } else if (type === "sentbystation" || type === "sent") {
        groups[bId].stationReply = item;
      }
    });
    return Object.values(groups);
  };

  // --- DELETE LOGIC ---
  const confirmDelete = (reviewId, type) => {
    Alert.alert(
      type === 'Customer' ? "Delete Review" : "Delete Reply",
      "Are you sure you want to delete this permanently?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => handleDelete(reviewId) 
        }
      ]
    );
  };

  const handleDelete = async (reviewId) => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/Station/delete-station-review-reply/${reviewId}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (result.status === "success") {
        Alert.alert("Success", "Deleted successfully.");
        fetchStationReviews(); // List refresh karein
      } else {
        Alert.alert("Error", result.message || "Failed to delete.");
      }
    } catch (e) {
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      hour: 'numeric', minute: 'numeric', hour12: true,
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Station Feedbacks</Text>
        <Text style={styles.subHeader}>Review History</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && <ActivityIndicator size="large" color="royalblue" style={{marginTop: 20}} />}

        {!loading && threads.length === 0 && (
          <Text style={styles.emptyText}>No feedbacks found.</Text>
        )}

        {threads.map((thread) => {
          // Permissions logic
          const userRole = (User?.role || "").toLowerCase();
          const isCustomer = userRole === "customer" || userRole === "user";
          const isOwner = userRole.includes("owner") || userRole.includes("station");

          const currentUserId = (User?.id || User?.userId || User?.customerId || "").toString();
          const currentUserName = (User?.name || User?.customerName || User?.userName || "").toLowerCase();
          
          const canDeleteReview = isCustomer && thread.customerReview && (
            (currentUserId !== "" && (
              currentUserId == thread.customerReview.fromUserId ||
              currentUserId == thread.customerReview.FromUserId ||
              currentUserId == thread.customerReview.reviewerId ||
              currentUserId == thread.customerReview.ReviewerId ||
              currentUserId == thread.customerReview.reviewerID ||
              currentUserId == thread.customerReview.customerId ||
              currentUserId == thread.customerReview.CustomerId ||
              currentUserId == thread.customerReview.userId ||
              currentUserId == thread.customerReview.UserId ||
              currentUserId == thread.customerReview.fromUserID
            )) || 
            (currentUserName !== "" && currentUserName === (thread.customerReview.reviewerName || "").toLowerCase())
          );
          
          const canDeleteReply = isOwner && thread.stationReply;
          
          // Debugging
          console.log("Review Debug:", { isCustomer, isOwner, currentUserId, currentUserName, canDeleteReview, canDeleteReply });

          return (
            <View key={thread.bookingId} style={styles.threadCard}>
              
              <View style={styles.threadHeader}>
                <View style={styles.bookingBadge}>
                  <Text style={styles.bookingText}>BOOKING #{thread.bookingId}</Text>
                </View>
                <Text style={styles.threadDate}>
                  {formatTime(thread.customerReview?.createdAt || thread.stationReply?.createdAt)}
                </Text>
              </View>

              {/* CUSTOMER REVIEW SECTION */}
              {thread.customerReview && (
                <View style={styles.userSection}>
                  <View style={styles.row}>
                    <View style={[styles.avatar, {backgroundColor: '#DBEAFE'}]}>
                      <Text style={{color: '#2563EB', fontWeight: 'bold'}}>C</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.userName}>{thread.customerReview.reviewerName}</Text>
                        
                        {canDeleteReview && (
                          <TouchableOpacity 
                            style={styles.deleteBadge} 
                            onPress={() => confirmDelete(thread.customerReview.reviewId, 'Customer')}
                          >
                            <Text style={styles.deleteText}>🗑️ Delete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.ratingText}>⭐ {thread.customerReview.rating} / 5</Text>
                    </View>
                  </View>
                  <Text style={styles.commentText}>{thread.customerReview.comment}</Text>
                  
                  {thread.customerReview.images && thread.customerReview.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imgRow}>
                      {thread.customerReview.images.map((img, i) => (
                        <TouchableOpacity key={i} onPress={() => setSelectedImage(`${serverUrl}/booking_reviews/${img}`)}>
                          <Image source={{ uri: `${serverUrl}/booking_reviews/${img}` }} style={styles.thumb} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {thread.customerReview && thread.stationReply && <View style={styles.connector} />}

              {/* STATION REPLY SECTION */}
              {thread.stationReply && (
                <View style={styles.stationSection}>
                  <View style={styles.row}>
                    <View style={[styles.avatar, {backgroundColor: '#DCFCE7'}]}>
                      <Text style={{color: '#16A34A', fontWeight: 'bold'}}>S</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.userName}>Station Response</Text>
                        
                        {canDeleteReply && (
                          <TouchableOpacity 
                            style={styles.deleteBadge} 
                            onPress={() => confirmDelete(thread.stationReply.reviewId, 'Reply')}
                          >
                            <Text style={styles.deleteText}>🗑️ Delete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.threadDate}>{formatTime(thread.stationReply.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.commentText, {fontStyle: 'italic'}]}>{thread.stationReply.comment}</Text>

                  {thread.stationReply.images && thread.stationReply.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imgRow}>
                      {thread.stationReply.images.map((img, i) => (
                        <TouchableOpacity key={i} onPress={() => setSelectedImage(`${serverUrl}/booking_reviews/${img}`)}>
                          <Image source={{ uri: `${serverUrl}/booking_reviews/${img}` }} style={styles.thumb} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* FULL IMAGE MODAL */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Image source={{ uri: selectedImage }} style={styles.fullImg} resizeMode="contain" />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center' },
  subHeader: { fontSize: 12, color: '#888', marginTop: 2, textAlign: 'center' },
  scrollContent: { padding: 15 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#999' },
  threadCard: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 20, elevation: 3 },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  bookingBadge: { backgroundColor: '#F0F7FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  bookingText: { fontSize: 11, fontWeight: 'bold', color: 'royalblue' },
  threadDate: { fontSize: 10, color: '#999' },
  row: { flexDirection: 'row', alignItems: 'center' },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  userInfo: { marginLeft: 10, flex: 1 },
  userName: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  deleteBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  deleteText: { color: '#EF4444', fontSize: 11, fontWeight: 'bold' },
  ratingText: { fontSize: 12, color: '#FFA000', fontWeight: 'bold' },
  commentText: { fontSize: 14, color: '#555', marginTop: 8, lineHeight: 20, marginLeft: 46 },
  imgRow: { marginLeft: 46, marginTop: 12 },
  thumb: { width: 70, height: 70, borderRadius: 10, marginRight: 8 },
  connector: { width: 2, height: 20, backgroundColor: '#E0E0E0', marginLeft: 17, marginVertical: 5 },
  stationSection: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 15, marginLeft: 10, marginTop: 5 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 30, zIndex: 1 },
  closeText: { color: 'white', fontSize: 30 },
  fullImg: { width: '100%', height: '80%' }
});

export default displaybookingreview;