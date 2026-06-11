import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, SafeAreaView, TouchableOpacity,
  FlatList, ScrollView, StatusBar, ActivityIndicator, Alert, TextInput,
  Image, Modal, Platform, LayoutAnimation, UIManager
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Feedbacks = () => {
  const { User } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('Station');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [displayFeedbacks, setDisplayFeedbacks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const serverUrl = BASE_URL.replace('/api', '');

  const renderStars = (rating) => {
    const validRating = Number(rating) || 0;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map(s => (
          <Text key={s} style={{ fontSize: 16, color: s <= validRating ? '#FFA000' : '#E0E0E0', marginRight: 2 }}>★</Text>
        ))}
      </View>
    );
  };

  useEffect(() => { loadInitialData(); }, [activeTab]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setSelectedId(null);
      setDisplayFeedbacks([]);

        if (activeTab === 'Station') {
          const res = await fetch(`${BASE_URL}/Station/getstationlist/${User?.id}`);
          const result = await res.json();
          if (result.status === "success") {
            setStations(result.data);
            if (result.data.length > 0) {
              setSelectedId(result.data[0].stationId);
              fetchStationReviews(result.data[0].stationId);
            }
          }
        } else if (activeTab === 'Product') {
          const res = await fetch(`${BASE_URL}/Customer/GetOwnerProducts/${User?.id}`);
          const result = await res.json();
          if (result.status === "success") {
            setProducts(result.data);
            if (result.data.length > 0) {
              setSelectedId(result.data[0].productId);
              fetchProductReviews(result.data[0].productId);
            }
          }
        } else if (activeTab === 'Service') {
          const res = await fetch(`${BASE_URL}/Station/getstationlist/${User?.id}`);
          const result = await res.json();
          if (result.status === "success" && result.data.length > 0) {
            const firstStationId = result.data[0].stationId;
            const svcRes = await fetch(`${BASE_URL}/Station/getservicesbystation/${firstStationId}`);
            const svcResult = await svcRes.json();
            if (svcResult.status === "success") {
              setServices(svcResult.data);
              if (svcResult.data.length > 0) {
                setSelectedId(svcResult.data[0].serviceId);
                fetchServiceReviews(svcResult.data[0].serviceId);
              }
            }
          }
        }
    } catch (e) { console.log(e); } finally { setLoading(false); }
  };

  const fetchStationReviews = async (id) => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/Station/get-all-station-reviews/${id}`);
      const result = await res.json();
      if (result.status === "success") {
        const groups = {};
        result.data.forEach(item => {
          const bId = item.bookingId;
          if (!groups[bId]) groups[bId] = { bookingId: bId, customerReview: null, stationReply: null, showReplyBox: false, rating: 0, comment: '', selectedImages: [] };
          if (item.type === "ReceivedByStation") groups[bId].customerReview = item;
          else if (item.type === "SentByStation") groups[bId].stationReply = item;
        });
        setDisplayFeedbacks(Object.values(groups));
      }
    } catch (e) { console.log(e); } finally { setLoading(false); }
  };

  const fetchProductReviews = async (id) => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/Customer/GetProductReviewsAndReply/${id}`);
      const result = await res.json();
      if (result.status === "success") {
        const enriched = result.data.map(item => ({ ...item, localReply: '' }));
        setDisplayFeedbacks(enriched || []);
      }
    } catch (e) { console.log(e); } finally { setLoading(false); }
  };

  const fetchServiceReviews = async (id) => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/Customer/getservicereviews/${id}`);
      const result = await res.json();
      if (result.status === "success") {
        const enriched = result.data.map(item => ({ ...item, localReply: '' }));
        setDisplayFeedbacks(enriched || []);
      }
    } catch (e) { console.log(e); } finally { setLoading(false); }
  };

  const submitServiceReply = async (item) => {
    if (!item.localReply.trim()) {
      Alert.alert("Wait", "Please type a reply first.");
      return;
    }
    
    try {
      setLoading(true);
      const currentReviewId = item.reviewId || item.ReviewId || item.reviewID;

      if (!currentReviewId) {
        Alert.alert("Error", "Review ID not found.");
        return;
      }

      const requestBody = { 
        OwnerReply: item.localReply.trim(), 
        ReviewId: currentReviewId 
      };

      const res = await fetch(`${BASE_URL}/Station/addownerreply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await res.json();

      if (res.ok && result.status === "success") {
        Alert.alert("Success", "Reply saved successfully!");
        fetchServiceReviews(selectedId);
      } else {
        Alert.alert("Error", result.message || "Failed to save reply.");
      }
    } catch (e) { 
      Alert.alert("Error", "Network request failed.");
    } finally { 
      setLoading(false); 
    }
  };

  const deleteServiceReply = (reviewId) => {
    Alert.alert("Delete", "Delete this reply?", [
      { text: "Cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            setLoading(true);
            const res = await fetch(`${BASE_URL}/Station/deleteownerreply/${reviewId}`, {
              method: 'DELETE',
            });
            if (res.ok) { fetchServiceReviews(selectedId); }
          } catch (e) { console.log(e); } finally { setLoading(false); }
        }
      }
    ]);
  };

  const pickImage = (id, type) => {
    const options = { mediaType: 'photo', quality: 0.7 };
    const method = type === 'camera' ? launchCamera : launchImageLibrary;
    method(options, (response) => {
      if (response.didCancel) {
        return;
      } else if (response.errorCode) {
        Alert.alert("Error", "Image picker error: " + response.errorMessage);
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        setDisplayFeedbacks(prev => prev.map(item => {
          if (item.bookingId == id) {
            if (item.selectedImages && item.selectedImages.length >= 4) { Alert.alert("Limit", "Max 4 images"); return item; }
            return { ...item, selectedImages: [...(item.selectedImages || []), uri] };
          }
          return item;
        }));
      }
    });
  };

  const submitStationReply = async (item) => {
    if (item.rating === 0) { Alert.alert("Wait", "Please select stars!"); return; }
    
    const cr = item.customerReview;
    const custId = cr?.fromUserId || cr?.FromUserId || cr?.FromUserID || cr?.fromUserID || 
                   cr?.reviewerId || cr?.ReviewerId || cr?.reviewerID || 
                   cr?.customerId || cr?.CustomerId || cr?.userId || cr?.UserId ||
                   item.fromUserId || item.FromUserId || item.FromUserID ||
                   item.customerId || item.CustomerId || item.userId || item.UserId;

    if (!custId) {
      Alert.alert("Error", "Could not identify the customer. ID is missing.");
      return;
    }

    const formData = new FormData();
    formData.append('BookingId', item.bookingId);
    formData.append('FromUserId', selectedId);
    formData.append('ToUserId', custId);
    formData.append('ReviewerRole', "StationOwner");
    formData.append('Rating', item.rating);
    formData.append('Comment', item.comment || "");

    if (item.selectedImages && item.selectedImages.length > 0) {
      item.selectedImages.forEach((uri, i) => {
        formData.append('Images', { uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''), type: 'image/jpeg', name: `review_${i}.jpg` });
      });
    }

    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/Customer/submit-booking-review`, { method: 'POST', body: formData });
      if (res.ok) {
        Alert.alert("Success", "Review submitted!");
        loadInitialData();
      } else {
        const errText = await res.text();
        Alert.alert("Error", errText || "Failed to submit review. Check your inputs.");
      }
    } catch (e) { 
      Alert.alert("Error", "Network request failed");
    } finally { 
      setLoading(false); 
    }
  };

  const submitProductReply = async (item) => {
    if (!item.localReply.trim()) return;
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/Station/updateproductreply`, {
        method: 'Put',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ReplyText: item.localReply, ReviewId: item.reviewId })
      });
      if (res.ok) { fetchProductReviews(selectedId); }
    } catch (e) { console.log(e); } finally { setLoading(false); }
  };

  const deleteResponse = (id) => {
    Alert.alert("Delete", "Delete this reply?", [
      { text: "Cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            setLoading(true);
            const ep = activeTab === 'Station'
              ? `${BASE_URL}/Station/delete-station-review-reply/${id}`
              : `${BASE_URL}/Station/clearproductreply/${id}`;
            const res = await fetch(ep, {
              method: activeTab === 'Station' ? 'DELETE' : 'PUT',
              headers: activeTab === 'Product' ? { 'Content-Type': 'application/json' } : {}
            });
            if (res.ok) { activeTab === 'Station' ? fetchStationReviews(selectedId) : fetchProductReviews(selectedId); }
          } catch (e) { console.log(e); } finally { setLoading(false); }
        }
      }
    ]);
  };

  const toggleReplyBox = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDisplayFeedbacks(prev => prev.map(item => item.bookingId === id ? { ...item, showReplyBox: !item.showReplyBox } : item));
  };

  const chipData = activeTab === 'Station' ? stations : activeTab === 'Product' ? products : services;
  const getChipId = (item) => activeTab === 'Station' ? item.stationId : activeTab === 'Product' ? item.productId : item.serviceId;
  const getChipName = (item) => activeTab === 'Station' ? item.stationName : activeTab === 'Product' ? item.productName : item.serviceName;
  const onChipPress = (id) => {
    setSelectedId(id);
    if (activeTab === 'Station') fetchStationReviews(id);
    else if (activeTab === 'Product') fetchProductReviews(id);
    else fetchServiceReviews(id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerTitleContainer}><Text style={styles.headerTitle}>User Feedbacks</Text></View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['Station', 'Product', 'Service'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.activeTab]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && styles.activeTabText]}>{t}s</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Chip selector */}
        <View style={styles.horizontalSection}>
          <FlatList
            horizontal
            data={chipData}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => {
              const id = getChipId(item);
              const name = getChipName(item);
              return (
                <TouchableOpacity style={[styles.simpleChip, selectedId === id && styles.selectedChip]} onPress={() => onChipPress(id)}>
                  <Text style={[styles.chipText, selectedId === id && styles.selectedChipText]}>{name}</Text>
                </TouchableOpacity>
              );
            }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>

        <View style={styles.listSection}>
          {loading && <ActivityIndicator color="royalblue" size="large" style={{ marginVertical: 20 }} />}

          {displayFeedbacks.map((item, index) => (
            <View key={index} style={styles.feedbackCard}>

              {/* STATIONS */}
              {activeTab === 'Station' && (
                <View>
                  <View>
                    <View style={styles.feedbackHeader}>
                      <View>
                        <Text style={styles.userName}>{item.customerReview?.reviewerName}</Text>
                        <Text style={{ fontSize: 13, color: '#666', fontWeight: 'bold' }}>Booking ID: #{item.bookingId}</Text>
                      </View>
                      {renderStars(item.customerReview?.rating)}
                    </View>
                    <Text style={styles.commentText}>{item.customerReview?.comment}</Text>
                    <View style={styles.imageGrid}>
                      {item.customerReview?.images?.map((img, i) => (
                        <TouchableOpacity key={i} onPress={() => setSelectedImage(`${serverUrl}/booking_reviews/${img}`)}>
                          <Image source={{ uri: `${serverUrl}/booking_reviews/${img}` }} style={styles.reviewImgThumb} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {item.stationReply ? (
                      <View style={styles.oldReply}>
                        <TouchableOpacity style={{ alignSelf: 'flex-end' }} onPress={() => deleteResponse(item.stationReply.reviewId)}>
                          <Text style={{ color: 'red', fontSize: 13, fontWeight: 'bold' }}>🗑️</Text>
                        </TouchableOpacity>
                        <Text style={styles.oldReplyLabel}>Your Review of Customer:</Text>
                        {item.stationReply.rating > 0 && <Text style={{ color: '#FFA000', fontWeight: 'bold', marginBottom: 5 }}>⭐ {item.stationReply.rating}</Text>}
                        <Text style={styles.oldReplyText}>{item.stationReply.comment}</Text>
                      </View>
                    ) : (
                      <View>
                        <TouchableOpacity style={styles.actionReplyBtn} onPress={() => toggleReplyBox(item.bookingId)}>
                          <Text style={styles.actionReplyBtnText}>{item.showReplyBox ? "Cancel" : "Review Customer"}</Text>
                        </TouchableOpacity>
                        {item.showReplyBox && (
                          <View style={styles.replyBoxUI}>
                            <Text style={styles.rateLabel}>Rate the customer:</Text>
                            <View style={styles.starRow}>
                              {[1, 2, 3, 4, 5].map(s => (
                                <TouchableOpacity key={s} onPress={() => setDisplayFeedbacks(prev => prev.map(f => f.bookingId === item.bookingId ? { ...f, rating: s } : f))}>
                                  <Text style={[styles.starIcon, { color: s <= item.rating ? 'orange' : 'lightgray' }]}>★</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <View style={styles.imageActions}>
                              <TouchableOpacity style={styles.iconBtn} onPress={() => pickImage(item.bookingId, 'camera')}><Text style={{ fontSize: 18 }}>📸 Camera</Text></TouchableOpacity>
                              <TouchableOpacity style={styles.iconBtn} onPress={() => pickImage(item.bookingId, 'gallery')}><Text style={{ fontSize: 18 }}>🖼️ Gallery</Text></TouchableOpacity>
                            </View>
                            
                            {item.selectedImages?.length > 0 && (
                              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                {item.selectedImages.map((uri, i) => (
                                  <Image key={i} source={{ uri }} style={styles.reviewImgThumb} />
                                ))}
                              </ScrollView>
                            )}

                            <TextInput 
                              style={styles.replyInput} 
                              placeholder="Write your response here..." 
                              multiline 
                              value={item.comment}
                              onChangeText={(t) => setDisplayFeedbacks(prev => prev.map(f => f.bookingId === item.bookingId ? { ...f, comment: t } : f))} 
                            />
                            <TouchableOpacity style={styles.sendBtn} onPress={() => submitStationReply(item)}>
                              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Submit Review</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* PRODUCT */}
              {activeTab === 'Product' && (
                <View>
                  <View style={styles.feedbackHeader}>
                    <Text style={styles.userName}>{item.customerName}</Text>
                    {renderStars(item.rating)}
                  </View>
                  <Text style={styles.commentText}>{item.comment}</Text>
                  <View style={styles.imageGrid}>
                    {(item.reviewImages || item.images)?.map((img, i) => (
                      <Image key={i} source={{ uri: `${serverUrl}/product_reviews/${img}` }} style={styles.reviewImgThumb} />
                    ))}
                  </View>
                  {item.reply ? (
                    <View style={styles.oldReply}>
                      <TouchableOpacity style={{ alignSelf: 'flex-end' }} onPress={() => deleteResponse(item.reviewId)}>
                        <Text style={{ color: 'red', fontSize: 13, fontWeight: 'bold' }}>🗑️</Text>
                      </TouchableOpacity>
                      <Text style={styles.oldReplyLabel}>Shop Reply:</Text>
                      <Text style={styles.oldReplyText}>{item.reply}</Text>
                    </View>
                  ) : (
                    <View style={styles.productReplyRow}>
                      <TextInput
                        style={styles.productInput}
                        placeholder="Type a quick reply..."
                        color="black"
                        value={item.localReply}
                        onChangeText={(t) => setDisplayFeedbacks(prev => prev.map(f => f.reviewId === item.reviewId ? { ...f, localReply: t } : f))}
                      />
                      <TouchableOpacity style={styles.productSendBtn} onPress={() => submitProductReply(item)}>
                        <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>Send</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* SERVICE */}
              {activeTab === 'Service' && (
                <View>
                  <View style={styles.feedbackHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {item.customerImage ? (
                        <Image
                          source={{ uri: `${serverUrl}/${item.customerImage}` }}
                          style={styles.customerAvatar}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                            {item.customerName?.charAt(0)?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={styles.userName}>{item.customerName}</Text>
                        <Text style={{ fontSize: 12, color: '#888' }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                        </Text>
                      </View>
                    </View>
                    {/* 🔥 Yahan humne text ki jagah renderStars() chalaya hai */}
                    {renderStars(item.rating)}
                  </View>

                  {item.comment ? <Text style={styles.commentText}>{item.comment}</Text> : null}

                  {item.images?.length > 0 && (
                    <View style={styles.imageGrid}>
                      {item.images.map((img, i) => (
                        <TouchableOpacity key={i} onPress={() => setSelectedImage(`${serverUrl}/service_reviews/${img}`)}>
                          <Image source={{ uri: `${serverUrl}/service_reviews/${img}` }} style={styles.reviewImgThumb} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {item.ownerReply ? (
                    <View style={styles.oldReply}>
                      <TouchableOpacity style={{ alignSelf: 'flex-end' }} onPress={() => deleteServiceReply(item.reviewId)}>
                        <Text style={{ color: 'red', fontSize: 13, fontWeight: 'bold' }}>🗑️</Text>
                      </TouchableOpacity>
                      <Text style={styles.oldReplyLabel}>Your Reply:</Text>
                      <Text style={styles.oldReplyText}>{item.ownerReply}</Text>
                      {item.ownerRepliedAt && (
                        <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                          {new Date(item.ownerRepliedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.productReplyRow}>
                      <TextInput
                        style={styles.productInput}
                        placeholder="Type a reply..."
                        color="black"
                        value={item.localReply}
                        onChangeText={(t) => setDisplayFeedbacks(prev => prev.map(f => f.reviewId === item.reviewId ? { ...f, localReply: t } : f))}
                      />
                      <TouchableOpacity style={styles.productSendBtn} onPress={() => submitServiceReply(item)}>
                        <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>Send</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

            </View>
          ))}

          {!loading && displayFeedbacks.length === 0 && (
            <Text style={styles.emptyText}>No reviews found.</Text>
          )}
        </View>
      </ScrollView>

      {/* Full-screen image modal */}
      <Modal visible={!!selectedImage} transparent onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalOverlay}>
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
  headerTitleContainer: { padding: 18, alignItems: 'center', backgroundColor: '#fff', elevation: 2 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#eee', marginHorizontal: 20, borderRadius: 25, padding: 5, marginTop: 15 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 },
  activeTab: { backgroundColor: 'royalblue' },
  tabText: { fontWeight: 'bold', color: '#777', fontSize: 15 },
  activeTabText: { color: 'white' },
  horizontalSection: { marginVertical: 12 },
  simpleChip: { backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  selectedChip: { backgroundColor: 'royalblue', borderColor: 'royalblue' },
  chipText: { fontSize: 14, color: '#555', fontWeight: '500' },
  selectedChipText: { color: 'white', fontWeight: 'bold' },
  listSection: { paddingHorizontal: 15 },
  feedbackCard: { backgroundColor: 'white', borderRadius: 15, padding: 18, marginBottom: 18, elevation: 3 },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  userName: { fontWeight: 'bold', fontSize: 17, color: '#000' },
  commentText: { color: '#444', fontSize: 15, marginTop: 8, lineHeight: 22 },
  starText: { color: '#FFA000', fontWeight: 'bold', fontSize: 16 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  reviewImgThumb: { width: 65, height: 65, borderRadius: 10, marginRight: 10, marginBottom: 10 },
  oldReply: { backgroundColor: '#f0f4f8', padding: 15, borderRadius: 12, marginTop: 15, borderLeftWidth: 5, borderLeftColor: 'royalblue' },
  oldReplyLabel: { fontSize: 13, fontWeight: 'bold', color: 'royalblue', marginBottom: 5 },
  oldReplyText: { fontSize: 15, fontStyle: 'italic', color: '#333', lineHeight: 21 },
  actionReplyBtn: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'royalblue', borderStyle: 'dashed', alignItems: 'center' },
  actionReplyBtnText: { color: 'royalblue', fontWeight: 'bold', fontSize: 14 },
  replyBoxUI: { marginTop: 15, backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  starRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  starIcon: { fontSize: 32, marginHorizontal: 4 },
  imageActions: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15 },
  iconBtn: { padding: 12, backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', width: '45%', alignItems: 'center' },
  replyInput: { backgroundColor: 'white', borderRadius: 10, padding: 12, height: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#ddd', fontSize: 15 },
  sendBtn: { backgroundColor: '#000', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  productReplyRow: { flexDirection: 'row', marginTop: 15, alignItems: 'center' },
  productInput: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#ddd', marginRight: 10, fontSize: 15 },
  productSendBtn: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 40, right: 20 },
  closeText: { fontSize: 40, color: 'white' },
  fullImg: { width: '100%', height: '80%' },
  customerAvatar: { width: 42, height: 42, borderRadius: 21 },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'royalblue', alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: '#aaa', marginVertical: 30, fontSize: 15 },
  statusDoneBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusDoneText: { color: '#2E7D32', fontSize: 10, fontWeight: 'bold' },
  rateLabel: { fontSize: 14, fontWeight: 'bold', color: '#444', marginBottom: 10, textAlign: 'center' },
});

export default Feedbacks;