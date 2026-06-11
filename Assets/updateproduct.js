import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  SafeAreaView, ScrollView, StatusBar, ActivityIndicator, 
  Alert, Image 
} from 'react-native';
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const updateproduct = ({ navigation }) => {
  const { User, productdata } = useContext(UserContext); 
  
  const [loading, setLoading] = useState(false);
  const [stationName, setStationName] = useState("Loading Station...");
  
  // Server URL for displaying existing images
  const serverUrl = BASE_URL.replace('/api', '');

  // Form States
  const [productImage, setProductImage] = useState(
    productdata?.imagepath 
      ? (productdata.imagepath.startsWith('http') 
          ? productdata.imagepath 
          : `${serverUrl}/product_images/${productdata.imagepath}?t=${Date.now()}`)
      : null
  );
  const [productName, setProductName] = useState(productdata?.productName || '');
  const [price, setPrice] = useState(productdata?.originalPrice?.toString() || '');
  const [quantity, setQuantity] = useState(productdata?.quantity?.toString() || '');
  const [description, setDescription] = useState(productdata?.productDescription || '');

  useEffect(() => {
    if (productdata?.stationId) {
      fetchStationDetails();
      console.log(productdata)
    }
  }, [productdata]);

  const fetchStationDetails = async () => {
    try {
      const url = `${BASE_URL}/Station/getstationbyid/${productdata?.stationId}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.status === "success") {
        setStationName(result.data.stationName);
      } else {
        setStationName("Unknown Station");
      }
    } catch (error) {
      console.error("Fetch Station Error:", error);
      setStationName("Error loading station");
    }
  };

  const handleImagePicker = (type) => {
    const method = type === 'camera' ? launchCamera : launchImageLibrary;
    method({ mediaType: 'photo', quality: 0.7 }, (res) => {
      if (res.assets) {
        setProductImage(res.assets[0].uri);
      }
    });
  };

  const handleRemoveImage = () => {
    setProductImage(null);
  };

  const handleUpdateProduct = async () => {
    if (!productName || !price || !quantity) {
      Alert.alert("Error", "Required fields are missing!");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('ProductName', productName);
      formData.append('ProductDescription', description || "");
      formData.append('Price', price);
      formData.append('Quantity', quantity);

      // --- IMAGE LOGIC FIXED ---
      if (productImage) {
        if (productImage.startsWith('file://') || productImage.startsWith('content://')) {
          // Case 1: New Image picked from Camera/Gallery
          const uriParts = productImage.split('.');
          const fileType = uriParts[uriParts.length - 1];
          formData.append('imageFile', { 
            uri: productImage,
            name: `prod_update_${Date.now()}.${fileType}`,
            type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
          });
        } else {
          // Case 2: Keeping existing server image
          // Filename nikalna parta hai bina query string (?t=...) ke
          const existingFileName = productImage.split('/').pop().split('?')[0];
          formData.append('ImageUrl', existingFileName);
        }
      } else {
        // Case 3: Image removed (Null/Empty string bhej rhy hain)
        formData.append('ImageUrl', "");
      }

      const response = await fetch(`${BASE_URL}/Station/updateproduct/${productdata?.productId}`, {
        method: 'PUT',
        headers: { 'Accept': 'application/json' },
        body: formData, 
      });

      const result = await response.json();

      if (result.status === "success") {
        Alert.alert("Success", "Product updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      console.log("Update Error:", error);
      Alert.alert("Error", "Connection failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Update Product</Text>
        <View style={styles.headerLine} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
        
        <Text style={styles.label}>Product Location (Locked 🔒)</Text>
        <View style={styles.lockedStationCard}>
          <Text style={styles.stationLabel}>Assigned Station</Text>
          <Text style={styles.stationValue}>{stationName}</Text>
        </View>

        <Text style={styles.label}>Product Image</Text>
        <View style={styles.imageFrame}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={styles.fullImage} />
          ) : (
            <View style={styles.noImageView}>
               <Text style={styles.noImageText}>🚫 No Image Selected</Text>
            </View>
          )}
        </View>

        <View style={styles.imageActionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'black' }]} onPress={() => handleImagePicker('camera')}>
            <Text style={styles.actionBtnText}>📸 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4169E1' }]} onPress={() => handleImagePicker('library')}>
            <Text style={styles.actionBtnText}>🖼️ Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF6347' }]} onPress={handleRemoveImage}>
            <Text style={styles.actionBtnText}>🗑️ Remove</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Product Name*</Text>
        <TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="Enter name" placeholderTextColor="#999" />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Price (PKR)*</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" placeholderTextColor="#999" />
          </View>
          <View style={{ width: 12 }} />
          <View style={styles.flex1}>
            <Text style={styles.label}>Quantity*</Text>
            <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="0" placeholderTextColor="#999" />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={description} 
          onChangeText={setDescription} 
          multiline 
          placeholder="Details about product..." 
          placeholderTextColor="#999"
        />

        <TouchableOpacity 
          style={[styles.submitBtn, loading && { opacity: 0.8 }]} 
          onPress={handleUpdateProduct} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>UPDATE PRODUCT</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'whitesmoke' },
  header: { padding: 20, alignItems: 'center', backgroundColor: 'white' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'black' },
  headerLine: { height: 3, width: 40, backgroundColor: 'limegreen', marginTop: 5, borderRadius: 10 },
  formContainer: { padding: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: 'dimgray', marginBottom: 8, marginTop: 10 },
  lockedStationCard: { 
    backgroundColor: '#fff', padding: 15, borderRadius: 12, 
    borderWidth: 1, borderColor: '#eee', marginBottom: 10 
  },
  stationLabel: { fontSize: 11, color: 'darkgrey', textTransform: 'uppercase' },
  stationValue: { fontSize: 16, fontWeight: 'bold', color: 'black', marginTop: 2 },
  imageFrame: { 
    width: '100%', height: 180, backgroundColor: 'white', borderRadius: 15, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 15, 
    borderWidth: 1, borderColor: '#eee', overflow: 'hidden' 
  },
  fullImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  noImageView: { alignItems: 'center', justifyContent: 'center' },
  noImageText: { color: 'silver', fontWeight: 'bold' },
  imageActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionBtn: { flex: 0.31, paddingVertical: 12, borderRadius: 10, alignItems: 'center', elevation: 2 },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  input: { backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 15, color: 'black' },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  submitBtn: { backgroundColor: 'limegreen', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40, elevation: 4 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default updateproduct;