import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Image
} from 'react-native';
// Image Picker import karein (Pehle 'npm install react-native-image-picker' karein)
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const Stationreview = () => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // Image state

  // Image Selection Logic
  const openCamera = () => {
    const options = { mediaType: 'photo', quality: 1, saveToPhotos: true };
    launchCamera(options, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) Alert.alert("Error", response.errorMessage);
      else setSelectedImage(response.assets[0].uri);
    });
  };

  const openGallery = () => {
    const options = { mediaType: 'photo', quality: 1 };
    launchImageLibrary(options, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) Alert.alert("Error", response.errorMessage);
      else setSelectedImage(response.assets[0].uri);
    });
  };

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select at least one star.");
      return;
    }
    
    const reviewObject = {
      stars: rating,
      comment: feedback,
      image: selectedImage, // Image URI yahan add ho jayegi
      submittedAt: new Date().toLocaleString()
    };

    console.log("Customer Review Saved:", reviewObject);
    Alert.alert("Success", "Feedback submitted successfully!");
    
    // Reset
    setRating(0);
    setFeedback('');
    setSelectedImage(null);
  };

  const StarRating = () => (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)}>
          <Text style={[styles.starIcon, { color: star <= rating ? 'gold' : 'lightgray' }]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rate Customer</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.instructionText}>How was your experience?</Text>
          <StarRating />
          
          <Text style={styles.label}>Add Photos (Optional)</Text>
          <View style={styles.imageActionRow}>
            <TouchableOpacity style={styles.imageBtn} onPress={openCamera}>
              <Text style={styles.btnIcon}>📸</Text>
              <Text style={styles.imageBtnText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.imageBtn, { backgroundColor: '#E1E5EA' }]} onPress={openGallery}>
              <Text style={styles.btnIcon}>🖼️</Text>
              <Text style={styles.imageBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Preview Image */}
          {selectedImage && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.previewImg} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => setSelectedImage(null)}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Write your feedback :</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="Share your thoughts..."
            value={feedback}
            onChangeText={setFeedback}
          />

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
  header: { padding: 20, backgroundColor: 'white', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 25, padding: 20, elevation: 5 },
  instructionText: { fontSize: 16, color: 'gray', textAlign: 'center', marginBottom: 15 },
  starContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  starIcon: { fontSize: 40, marginHorizontal: 5 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  
  // Image Section Styles
  imageActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  imageBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#F0F0F0', 
    padding: 12, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  imageBtnText: { marginLeft: 8, fontWeight: 'bold', color: '#555' },
  btnIcon: { fontSize: 18 },
  previewContainer: { marginBottom: 20, width: '100%', height: 200, borderRadius: 15, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  previewImg: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  textArea: { width: '100%', backgroundColor: 'whitesmoke', borderRadius: 15, padding: 15, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: 'lightgray', marginBottom: 25 },
  submitBtn: { backgroundColor: 'black', width: '100%', paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default Stationreview;