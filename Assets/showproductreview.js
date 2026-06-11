import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, View, Text, FlatList, Image, TouchableOpacity, TextInput, 
  SafeAreaView, Modal, StatusBar, ActivityIndicator, Alert 
} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const ShowProductReview = ({ navigation }) => {
  const { productidforreview, User } = useContext(UserContext); 
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  const serverUrl = BASE_URL.replace('/api', '');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/Customer/getproductreviews/${productidforreview}`);
      const json = await response.json();
      if (json.status === "success") {
        setReviews(json.data);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productidforreview) fetchReviews();
  }, [productidforreview]);

  const confirmDeleteReview = (reviewId) => {
    Alert.alert(
      "Delete Review",
      "Are you sure you want to delete this review?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => handleDeleteReview(reviewId) 
        }
      ]
    );
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      const response = await fetch(`${BASE_URL}/Customer/deletereview/${reviewId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.status === "success") {
        Alert.alert("Success", "Review deleted successfully.");
        fetchReviews(); 
      } else {
        Alert.alert("Error", result.message || "Failed to Delete.");
      }
    } catch (error) {
      Alert.alert("Error", "Server connection failed");
    }
  };

  const deleteProductResponse = (id) => {
    Alert.alert("Delete Reply", "Do you want to delete this product reply?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            setLoading(true);
            const res = await fetch(`${BASE_URL}/Station/clearproductreply/${id}`, {
              method: 'Put',
              headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) {
              fetchReviews(); 
            }
          } catch (e) {
            console.log("Product Delete Error:", e);
          } finally {
            setLoading(false);
          }
        } 
      }
    ]);
  };

  const handleUpdateReply = async (reviewId, text) => {
    if (!text || text.trim() === "") {
      Alert.alert("Error", "Please enter some text to reply.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/Station/updateproductreply`, {
        method: 'Put',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ReplyText: text, ReviewId: reviewId })
      });
      const result = await res.json();
      if (result.status === "success") {
        Alert.alert("Success", "Reply added successfully.");
        fetchReviews();
      }
    } catch (e) {
      console.log("Update Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const StarRating = (ratingValue) => {
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      stars += i <= ratingValue ? "⭐" : "☆";
    }
    return (
      <View style={styles.starContainer}>
        <Text style={styles.starText}>{stars}</Text>
      </View>
    );
  };

  const renderReviewItem = ({ item }) => {
    const isMyReview = User?.id?.toString() === item.customerId?.toString();
    const isMyReviews = (productidforreview?.toString() === item.productId?.toString()) && User?.role === "StationOwner";

    const profileUri = !item.profilepicture 
      ? 'https://via.placeholder.com/150' 
      : item.profilepicture.startsWith('http') 
        ? item.profilepicture 
        : `${serverUrl}/profile_images/${item.profilepicture}?t=${Date.now()}`;

    return (
      <View style={styles.reviewCard}>
        <View style={styles.userInfoRow}>
          <Image source={{ uri: profileUri }} style={styles.avatar} />
          <View style={styles.userNameDateBlock}>
            <Text style={styles.userName}>{item.userName || 'Anonymous'}</Text>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>
          {isMyReview && (
            <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDeleteReview(item.id)}>
              <Text style={[styles.deleteIcon, { color: 'red' }]}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.contentBlock}>
          {StarRating(item.rating)}
          <Text style={styles.commentText}>{item.comment}</Text>
        </View>

        {item.images && item.images.length > 0 && (
          <View style={styles.imageGrid}>
            {item.images.map((imgName, index) => {
              const reviewImgUri = imgName.startsWith('http') 
                ? imgName 
                : `${serverUrl}/product_reviews/${imgName}?t=${Date.now()}`;
              return (
                <TouchableOpacity key={index} onPress={() => setSelectedImage(reviewImgUri)}>
                  <Image source={{ uri: reviewImgUri }} style={styles.reviewImageThumbnail} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* --- OWNER REPLY SECTION --- */}
        {item.reply ? (
          <View style={styles.replyContainer}>
            <View style={styles.replyHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={styles.replyIcon}>↪️</Text>
                <Text style={styles.replyTitle}>Owner's Response</Text>
              </View>
              {isMyReviews && (
                <TouchableOpacity onPress={() => deleteProductResponse(item.reviewId)}>
                  <Text style={[styles.deleteIcon, { color: 'red' }]}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.replyText}>{item.reply}</Text>
          </View>
        ) : (
          isMyReviews && (
            <View style={styles.inputWrapper}>
              <TextInput 
                style={styles.productInput} 
                placeholder="Write a reply..." 
                placeholderTextColor="grey"
                multiline
                onChangeText={(t) => { item.localReply = t; }}
              />
              <TouchableOpacity 
                style={styles.productSendBtn} 
                onPress={() => handleUpdateReply(item.reviewId, item.localReply)}
              >
                <Text style={styles.productSendBtnText}>Reply</Text>
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
        <Text style={styles.headerTitle}>Product Feedbacks</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="green" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No reviews found for this product.</Text>}
        />
      )}

      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedImage(null)}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} resizeMode="contain" />
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
  starContainer: { marginBottom: 6 },
  starText: { fontSize: 13, color: 'gold' },
  commentText: { fontSize: 14, color: 'black', lineHeight: 21 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  reviewImageThumbnail: { width: 70, height: 70, borderRadius: 10, marginRight: 8, marginBottom: 8 },
  
  replyContainer: {
    backgroundColor: 'aliceblue', 
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    borderLeftWidth: 4,
    borderLeftColor: 'royalblue', 
  },
  replyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  replyIcon: { fontSize: 12, marginRight: 6, color: 'royalblue' },
  replyTitle: { fontSize: 12, fontWeight: 'bold', color: 'darkblue', textTransform: 'uppercase' },
  replyText: { fontSize: 13, color: 'black', fontStyle: 'italic', lineHeight: 19 },

  inputWrapper: { marginTop: 10 },
  productInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'lightgrey',
    borderRadius: 10,
    padding: 10,
    color: 'black',
    minHeight: 45,
    textAlignVertical: 'top'
  },
  productSendBtn: {
    backgroundColor: 'green', 
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginTop: 8,
    elevation: 3,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productSendBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 60, color: 'grey', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  closeModalBtn: { position: 'absolute', top: 50, right: 25, zIndex: 10 },
  closeIcon: { fontSize: 32, color: 'white' },
  fullScreenImage: { width: '100%', height: '85%' },
});

export default ShowProductReview;