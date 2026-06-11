import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, 
  ScrollView, StatusBar, Alert, Image, FlatList, ActivityIndicator 
} from 'react-native';
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const Addproducts = () => {
  const { User } = useContext(UserContext);
  const [selectedStationIds, setSelectedStationIds] = useState([]);
  const [productImage, setProductImage] = useState(null);
  const [loading, setloading] = useState(false);
  const [isFetchingStations, setIsFetchingStations] = useState(true);
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [stations, setstations] = useState([]);

  useEffect(() => {
    fetchStations();
  }, []);
    
  const fetchStations = async () => {
    try {
      setIsFetchingStations(true);
      const stationUrl = `${BASE_URL}/Station/getstationlist/${User?.id}`;
      const stationRes = await fetch(stationUrl);
      const stationResult = await stationRes.json();
      if (stationResult.status === "success") {
        setstations(stationResult.data);
      }
    } catch (error) {
      console.error("Fetch Stations Error:", error);
      Alert.alert("Error", "Could not load stations list.");
    } finally {
      setIsFetchingStations(false);
    }
  };

  const toggleStationSelection = (id) => {
    if (selectedStationIds.includes(id)) {
      setSelectedStationIds(selectedStationIds.filter(item => item !== id));
    } else {
      setSelectedStationIds([...selectedStationIds, id]);
    }
  };

  const handleImagePicker = (type) => {
    const method = type === 'camera' ? launchCamera : launchImageLibrary;
    method({ mediaType: 'photo', quality: 0.7 }, (res) => {
      if (res.assets) setProductImage(res.assets[0].uri);
    });
  };

  const handleAddProduct = async () => {
    if (!productName || !price || !quantity || selectedStationIds.length === 0) {
      Alert.alert("Error", "Required fields (Name, Price, Qty, Stations) are missing!");
      return;
    }

    try {
      setloading(true);
      const formData = new FormData();
      formData.append('ProductName', productName);
      formData.append('ProductDescription', description || "");
      formData.append('Price', price);
      formData.append('Quantity', parseInt(quantity));
      
      // Backend expects multiple StationIds
      selectedStationIds.forEach((id) => {
        formData.append('StationIds', id); 
      });

      if (productImage && productImage.startsWith('file://')) {
        const uriParts = productImage.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append('imageFile', { 
          uri: productImage,
          name: `prod_${Date.now()}.${fileType}`,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }

      const response = await fetch(`${BASE_URL}/Station/addproduct`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData, 
      });

      const result = await response.json();

      if (result.status === "success") {
        Alert.alert("Success", "Product added successfully!");
        // Reset Form
        setProductName("");
        setPrice("");
        setQuantity("");
        setDescription("");
        setProductImage(null);
        setSelectedStationIds([]);
      } else {
        Alert.alert("Error", result.message || "Failed to add product");
      }
    } catch (error) {
      console.error("Add Product Error:", error);
      Alert.alert("Error", "Connection failed! Check your server.");
    } finally {
      setloading(false);
    }
  };

  // Loading Screen while fetching stations
  if (isFetchingStations) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="deepskyblue" />
        <Text style={styles.loaderText}>Loading Stations...</Text>
      </View>
    );
  }
// station owner select multiple station
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Product </Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="always">
        <Text style={styles.label}>Select Stations </Text>
        <FlatList
          horizontal
          data={stations}
          keyExtractor={(item) => item.stationId.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
          renderItem={({ item }) => {
            const isSelected = selectedStationIds.includes(item.stationId);
            return (
              <TouchableOpacity
                style={[styles.chip, isSelected && styles.selectedStationChip]}
                onPress={() => toggleStationSelection(item.stationId)}
              >
                <Text style={[styles.chipText, isSelected && styles.whiteText]}>
                  {item.stationName} {isSelected ? "✓" : ""}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <Text style={styles.label}>Product Image</Text>
        <View style={styles.imageBox}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={styles.fullImage} />
          ) : (
            <Text style={styles.noImageText}>No Image Selected</Text>
          )}
        </View>

        <View style={styles.imageActionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleImagePicker('camera')}>
            <Text style={styles.actionBtnText}>Open Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'royalblue' }]} onPress={() => handleImagePicker('library')}>
            <Text style={styles.actionBtnText}>Open Gallery</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Product Name</Text>
        <TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="e.g. Engine Oil" placeholderTextColor="#999" />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Price (Rs.)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="500" placeholderTextColor="#999" />
          </View>
          <View style={[styles.flex1, { marginLeft: 10 }]}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="10" placeholderTextColor="#999" />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline placeholder="Enter product details..." placeholderTextColor="#999" />

        <TouchableOpacity 
          style={[styles.submitBtn, loading && { backgroundColor: 'gray' }]} 
          onPress={handleAddProduct} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>SAVE PRODUCT</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  loaderText: { marginTop: 10, fontWeight: 'bold', color: 'gray' },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'black' },
  formContainer: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginTop: 10, color: '#333' },
  horizontalListContent: { paddingVertical: 5 },
  chip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  selectedStationChip: { backgroundColor: 'deepskyblue', borderColor: 'deepskyblue' },
  chipText: { color: '#555', fontSize: 13 },
  whiteText: { color: 'white', fontWeight: 'bold' },
  imageBox: { 
    width: '100%', height: 180, backgroundColor: '#fafafa', 
    borderRadius: 15, justifyContent: 'center', alignItems: 'center',
    marginBottom: 10, borderWidth: 1, borderColor: '#eee' 
  },
  fullImage: { width: '100%', height: '100%', borderRadius: 15 },
  noImageText: { color: '#bbb' },
  imageActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionBtn: { flex: 0.48, backgroundColor: 'black', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  input: { backgroundColor: 'white', borderRadius: 10, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', color: 'black' },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  submitBtn: { backgroundColor: 'limegreen', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default Addproducts;