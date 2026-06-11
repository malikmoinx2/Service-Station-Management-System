import React, { useState, useContext, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, Alert, Image,} from 'react-native';

import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";


const productrating = ({ navigation }) => {
const {User,productid,orderid } = useContext(UserContext);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  



  useEffect(() => {
  console.log("Product ID:", productid);
  console.log("Order ID:", orderid);
}, []);

  // --- Image Picker Logic ---
  const handleImageSource = () => {
    Alert.alert(
      "Select Photo",
      "Choose an option to add a photo",
      [
        {
          text: "Camera",
          onPress: openCamera,
        },
        {
          text: "Gallery",
          onPress: openGallery,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const openGallery = async () => {
    const options = { mediaType: 'photo' };
    const result = await launchImageLibrary(options);
    if (!result.didCancel && result.assets) {
      setSelectedImages([...selectedImages, ...result.assets]);
    }
  };

  const openCamera = async () => {
    const options = {
      mediaType: 'photo',
      saveToPhotos: true, 
      quality: 0.8,
    };
    const result = await launchCamera(options);
    if (!result.didCancel && result.assets) {
      setSelectedImages([...selectedImages, ...result.assets]);
    }
  };

  const removeImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  // --- Submit Logic ---
 const handleSubmit = async () => {
  if (rating === 0 && Productid===0 && orderid===0) {
    Alert.alert("Rating Required", "Please select a star rating before submitting.");
    return;
  }

  try {
    const formData = new FormData();

    // Text data append karein
    formData.append('ProductId', productid||0); 
    formData.append('CustomerId', User?.id || 1); 
    formData.append('Rating', rating);
    formData.append('OrderId', orderid||0);
    formData.append('Comment', feedback || "");

    // Image Handling Logic (Multiple Images Loop)
    if (selectedImages && selectedImages.length > 0) {
      selectedImages.forEach((img, index) => {
        // Image object se URI nikalna
        const imageUri = img.uri || img; 

        // 1. Agar Image "Nayi" hai (Mobile File Path hai)
        if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
          const fileName = img.fileName || imageUri.split('/').pop();
          const fileType = img.type || `image/${fileName.split('.').pop() === 'jpg' ? 'jpeg' : fileName.split('.').pop()}`;

          formData.append('Images', {
            uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
            name: fileName,
            type: fileType,
          });
        } 
        // 2. Agar Image "Purani" hai (Sirf URL string hai - Edit Scenario)
        else {
          const existingFileName = imageUri.split('/').pop().split('?')[0];
          // Agar aapka backend existing images handle karta hai to yahan key badal sakte hain
          formData.append('ExistingImageUrls', existingFileName); 
        }
      });
    }

    
    const response = await fetch(`${BASE_URL}/Customer/submit-product-review`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();
     console.log(result)
    if (response.ok && result.status === "success") {
      Alert.alert("Success ✅", result.message);
      setRating(0);
      setFeedback('');
      setSelectedImages([]);
      navigation?.goBack();
    } else {
      Alert.alert("Error ❌", result.message || "Something went wrong.");
    }

  } catch (error) {
    console.error("API Error:", error);
    Alert.alert("Network Error", "Server connection failed. Check your IP.");
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        
        <Text style={styles.headerTitle}>Write a Review</Text>
        <View style={{ width: 25 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Generic Product Info */}
        <View style={styles.productCard}>
          <View style={styles.placeholderIcon}>
             <Text style={{fontSize: 24}}>📦</Text>
          </View>
          <View style={styles.productDetails}>
            <Text style={styles.productName}>Product Review</Text>
            <Text style={styles.productCategory}>Share your experience with this item</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.questionText}>Overall Rating</Text>
          
          <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={[styles.starIcon, { color: star <= rating ? 'gold' : 'lightgray' }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating > 0 ? `Rating: ${rating}/5` : 'Tap to rate'}
          </Text>

          <Text style={styles.label}>Review Detail</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="Tell us what you liked or disliked..."
            value={feedback}
            onChangeText={setFeedback}
          />

          <Text style={styles.label}>Upload Photos</Text>
          <View style={styles.imageRow}>
            {/* Ab yeh button handleImageSource (Popup) ko call karega */}
            <TouchableOpacity style={styles.addBtn} onPress={handleImageSource}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedImages.map((img, index) => (
                <View key={index} style={styles.imgWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  <TouchableOpacity style={styles.delBadge} onPress={() => removeImage(index)}>
                    <Text style={styles.delText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Submit Review</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'ghostwhite' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 15, 
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'lightgray'
  },
  backArrow: { fontSize: 22, fontWeight: 'bold', color: 'black' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'black',marginLeft:100 },
  content: { padding: 15 },
  productCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center'
  },
  placeholderIcon: { 
    width: 60, height: 60, borderRadius: 12, backgroundColor: 'whitesmoke', 
    justifyContent: 'center', alignItems: 'center'
  },
  productDetails: { marginLeft: 15 },
  productName: { fontSize: 16, fontWeight: 'bold', color: 'black' },
  productCategory: { fontSize: 12, color: 'gray' },
  mainCard: { backgroundColor: 'white', borderRadius: 20, padding: 20 },
  questionText: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: 'black' },
  starContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  starIcon: { fontSize: 45, marginHorizontal: 5 },
  ratingText: { textAlign: 'center', fontSize: 13, color: 'gray', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: 'black', marginBottom: 8 },
  textArea: {
    backgroundColor: 'whitesmoke', borderRadius: 12, padding: 15, height: 100,
    textAlignVertical: 'top', borderWidth: 1, borderColor: 'lightgray', marginBottom: 20
  },
  imageRow: { flexDirection: 'row', alignItems: 'center' },
  addBtn: {
    width: 65, height: 65, borderRadius: 12, borderWidth: 1, borderColor: 'gray',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 10
  },
  addBtnText: { fontSize: 24, color: 'gray' },
  imgWrapper: { marginRight: 10, position: 'relative' },
  thumb: { width: 65, height: 65, borderRadius: 12 },
  delBadge: {
    position: 'absolute', top: -5, right: -5, backgroundColor: 'red',
    width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center'
  },
  delText: { color: 'white', fontWeight: 'bold' },
  submitBtn: { backgroundColor: 'black', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 25 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default productrating;