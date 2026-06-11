import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, FlatList, Image, TouchableOpacity,
  TextInput, SafeAreaView, Modal, StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const ShowServiceReview = ({ navigation, route }) => {
 const { User } = useContext(UserContext);
const { serviceId, serviceName } = route.params;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);


const serverUrl = BASE_URL.replace('/api', '');


  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/Customer/getservicereviews/${serviceId}`
      );
      const json = await response.json();
      console.log(json)
      if (json.status === "success") setReviews(json.data);
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (serviceId) fetchReviews();
 }, [serviceId]);

  // --- Customer: apna review delete karna ---
  const confirmDeleteReview = (reviewId) => {
    Alert.alert("Delete Review", "Are you sure you want to delete this review?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => handleDeleteReview(reviewId) }
    ]);
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      const res = await fetch(`${BASE_URL}/Customer/deleteservicereview/${reviewId}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (result.status === "success") {
        Alert.alert("Success", "Review deleted successfully.");
        fetchReviews();
      } else {
        Alert.alert("Error", result.message || "Failed to delete.");
      }
    } catch (e) {
      Alert.alert("Error", "Server connection failed.");
    }
  };

  // --- Station Owner: apna reply submit karna ---
  const handleSubmitReply = async (reviewId, text) => {
    if (!text || text.trim() === "") {
      Alert.alert("Error", "Please write something before replying.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/Station/addownerreply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ReviewId: reviewId, OwnerReply: text })
      });
      const result = await res.json();
      if (result.status === "success") {
        Alert.alert("Success", "Reply added successfully.");
        fetchReviews();
      }
    } catch (e) {
      console.log("Reply Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- Station Owner: apna reply delete karna ---
  const confirmDeleteReply = (reviewId) => {
    Alert.alert("Delete Reply", "Do you want to delete this reply?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const res = await fetch(
              `${BASE_URL}/Station/deleteownerreply/${reviewId}`,
              { method: 'DELETE' }
            );
            const result = await res.json();
            if (result.status === "success") fetchReviews();
          } catch (e) {
            console.log("Delete Reply Error:", e);
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const StarRating = (ratingValue) => {
    let stars = "";
    for (let i = 1; i <= 5; i++) stars += i <= ratingValue ? "⭐" : "☆";
    return (
      <View style={styles.starContainer}>
        <Text style={styles.starText}>{stars}</Text>
      </View>
    );
  };

  const renderReviewItem = ({ item }) => {
    // Customer sirf apna review delete kar sakta hai
    const isMyReview =
      User?.role === "Customer" &&
      User?.id?.toString() === item.customerId?.toString();

    // Station owner sirf apni service ke reviews pa reply add/delete kar sakta hai
    const isOwner = User?.role === "StationOwner";

    const profileUri = !item.customerImage
      ? 'https://via.placeholder.com/150'
      : item.customerImage.startsWith('http')
        ? item.customerImage
        : `${BASE_URL.replace('/api', '')}/profile_images/${item.customerImage}`;

    return (
      <View style={styles.reviewCard}>
        {/* User Info Row */}
        <View style={styles.userInfoRow}>
          <Image source={{ uri: profileUri }} style={styles.avatar} />
          <View style={styles.userNameDateBlock}>
            <Text style={styles.userName}>{item.customerName || 'Anonymous'}</Text>
            <Text style={styles.dateText}>
              {item.createdAt ? new Date(item.createdAt).toDateString() : ''}
            </Text>
          </View>
          {isMyReview && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => confirmDeleteReview(item.reviewId)}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stars + Comment */}
        <View style={styles.contentBlock}>
          {StarRating(item.rating)}
          <Text style={styles.commentText}>{item.comment}</Text>
        </View>

        {/* Review Images */}
        {item.images && item.images.length > 0 && (
                  <View style={styles.imageGrid}>
                    {item.images.map((imgName, index) => {
                      const reviewImgUri = imgName.startsWith('http') 
                        ? imgName 
                        : `${serverUrl}/service_reviews/${imgName}?t=${Date.now()}`;
                      return (
                        <TouchableOpacity key={index} onPress={() => setSelectedImage(reviewImgUri)}>
                          <Image source={{ uri: reviewImgUri }} style={styles.reviewImageThumbnail} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

        {/* Owner Reply Section */}
        {item.ownerReply ? (
          <View style={styles.replyContainer}>
            <View style={styles.replyHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={styles.replyIcon}>↪️</Text>
                <Text style={styles.replyTitle}>Owner's Response</Text>
              </View>
              {isOwner && (
                <TouchableOpacity onPress={() => confirmDeleteReply(item.reviewId)}>
                  <Text style={[styles.deleteIcon, { color: 'red' }]}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.replyText}>{item.ownerReply}</Text>
          </View>
        ) : (
          isOwner && (
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.replyInput}
                placeholder="Write a reply..."
                placeholderTextColor="grey"
                multiline
                onChangeText={(t) => { item.localReply = t; }}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => handleSubmitReply(item.reviewId, item.localReply)}
              >
                <Text style={styles.sendBtnText}>Reply</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{serviceName || 'Service Reviews'}</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="green" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.reviewId.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No reviews found for this service.</Text>
          }
        />
      )}

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'whitesmoke' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, backgroundColor: 'white', elevation: 4
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'black' },
  listContent: { paddingVertical: 12 },
  reviewCard: {
    backgroundColor: 'white', padding: 16, marginBottom: 12,
    marginHorizontal: 16, borderRadius: 15, elevation: 2
  },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: 'lightgrey' },
  userNameDateBlock: { flex: 1 },
  userName: { fontSize: 15, fontWeight: 'bold', color: 'black' },
  dateText: { fontSize: 11, color: 'grey', marginTop: 2 },
  iconBtn: { padding: 6, backgroundColor: 'snow', borderRadius: 8 },
  deleteIcon: { fontSize: 18 },
  contentBlock: { marginBottom: 4 },
  starContainer: { marginBottom: 6 },
  starText: { fontSize: 13, color: 'gold' },
  commentText: { fontSize: 14, color: 'black', lineHeight: 21 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  reviewImageThumbnail: { width: 70, height: 70, borderRadius: 10, marginRight: 8, marginBottom: 8 },
  replyContainer: {
    backgroundColor: 'aliceblue', padding: 12, borderRadius: 12,
    marginTop: 14, borderLeftWidth: 4, borderLeftColor: 'royalblue',
  },
  replyHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6
  },
  replyIcon: { fontSize: 12, marginRight: 6, color: 'royalblue' },
  replyTitle: { fontSize: 12, fontWeight: 'bold', color: 'darkblue', textTransform: 'uppercase' },
  replyText: { fontSize: 13, color: 'black', fontStyle: 'italic', lineHeight: 19 },
  inputWrapper: { marginTop: 10 },
  replyInput: {
    backgroundColor: 'white', borderWidth: 1, borderColor: 'lightgrey',
    borderRadius: 10, padding: 10, color: 'black', minHeight: 45, textAlignVertical: 'top'
  },
  sendBtn: {
    backgroundColor: 'green', paddingVertical: 10, paddingHorizontal: 25,
    borderRadius: 20, alignSelf: 'flex-end', marginTop: 8, elevation: 3,
  },
  sendBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 60, color: 'grey', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  closeModalBtn: { position: 'absolute', top: 50, right: 25, zIndex: 10 },
  closeIcon: { fontSize: 32, color: 'white' },
  fullScreenImage: { width: '100%', height: '85%' },
});

export default ShowServiceReview;