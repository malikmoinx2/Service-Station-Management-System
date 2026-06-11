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
  Image,
} from 'react-native';

import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const stationrating = ({ navigation }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);

  // --- Photo Selection Logic ---
  const handlePickImage = () => {
    Alert.alert(
      "Add Photo",
      "Choose an option to capture or select a photo",
      [
        { text: "Camera", onPress: openCamera },
        { text: "Gallery", onPress: openGallery },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const openGallery = async () => {
    const options = { mediaType: 'photo', selectionLimit: 5 - selectedImages.length };
    const result = await launchImageLibrary(options);
    if (!result.didCancel && result.assets) {
      setSelectedImages([...selectedImages, ...result.assets]);
    }
  };

  const openCamera = async () => {
    const options = { mediaType: 'photo', saveToPhotos: true, quality: 0.8 };
    const result = await launchCamera(options);
    if (!result.didCancel && result.assets) {
      setSelectedImages([...selectedImages, ...result.assets]);
    }
  };

  const removeImage = (index) => {
    const filtered = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(filtered);
  };

  // --- Dummy Submit Logic ---
  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select at least 1 star.");
      return;
    }

    const dummyData = {
      serviceRating: rating,
      userFeedback: feedback,
      attachedPhotos: selectedImages.length,
      timestamp: new Date().toISOString(),
    };

    console.log("Submitting Experience Review:", dummyData);
    Alert.alert("Success", "Your experience review has been saved!");
    
    // Reset or Navigate
    setRating(0);
    setFeedback('');
    setSelectedImages([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={styles.backArrow}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Experience</Text>
        <View style={{ width: 25 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.instructionText}>How was the service at the station?</Text>
          
          {/* Star Rating Section */}
          <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={[styles.starIcon, { color: star <= rating ? 'gold' : 'lightgray' }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.ratingLabel}>
            {rating > 0 ? `Satisfied: ${rating} / 5` : 'Tap stars to rate'}
          </Text>

          {/* Feedback Input */}
          <Text style={styles.inputLabel}>Write your feedback :</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="Tell us about the quality of service, staff behavior, etc."
            placeholderTextColor="gray"
            value={feedback}
            onChangeText={setFeedback}
          />

          {/* Multi-Image Section */}
          <Text style={styles.inputLabel}>Add Photos (Max 5) :</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={handlePickImage}>
            <Text style={styles.uploadText}>+ Capture or Upload Photo</Text>
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewList}>
            {selectedImages.map((img, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: img.uri }} style={styles.previewImg} />
                <TouchableOpacity style={styles.deleteBtn} onPress={() => removeImage(index)}>
                  <Text style={styles.deleteBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Submit Button */}
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
    padding: 20, 
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'lightgray'
  },
  backArrow: { fontSize: 22, fontWeight: 'bold', color: 'black' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'black' },
  content: { padding: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4
  },
  instructionText: { fontSize: 16, color: 'dimgray', textAlign: 'center', marginBottom: 15 },
  starContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 5 },
  starIcon: { fontSize: 50, marginHorizontal: 5 },
  ratingLabel: { textAlign: 'center', fontSize: 14, color: 'gray', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: 'black' },
  textArea: {
    backgroundColor: 'whitesmoke',
    borderRadius: 12,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'lightgray',
    color: 'black',
    marginBottom: 20
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: 'gray',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white'
  },
  uploadText: { color: 'gray', fontWeight: 'bold' },
  imagePreviewList: { marginTop: 15, flexDirection: 'row' },
  imageWrapper: { marginRight: 12, position: 'relative' },
  previewImg: { width: 80, height: 80, borderRadius: 10 },
  deleteBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  submitBtn: {
    backgroundColor: 'black',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 25
  },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default stationrating;