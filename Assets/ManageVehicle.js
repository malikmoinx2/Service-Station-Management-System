import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, Image,
  SafeAreaView, FlatList, KeyboardAvoidingView, Platform, Alert, Keyboard, ActivityIndicator
} from 'react-native';
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const ManageVehicle = () => {
  const flatListRef = useRef(null);
  const { User } = useContext(UserContext);

  const serverUrl = BASE_URL.replace('/api', '');

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [type, setType] = useState('Small');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');
  
  // Isme hum sirf local URI ya remote URL store karenge
  const [vehicleImage, setVehicleImage] = useState(null); 
  const [isEditing, setIsEditing] = useState(null);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/Customer/GetVehiclesByUserIds/${User?.id}`);
      const result = await response.json();

      if (result.status === "success") {
        setVehicles(result.data);
      } else {
        Alert.alert("Error", result.message || "Failed to fetch data");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // ─── CHANGE 1: IMAGE PICKER WITH LOCAL URI LOGIC ───
  const handleImagePicker = (methodType) => {
    const method = methodType === 'camera' ? launchCamera : launchImageLibrary;
    
    // Base64 ki ab zaroorat nahi hai, quality high or original uri target karenge
    method({ mediaType: 'photo', quality: 0.7, includeBase64: false }, (res) => {
      if (res.assets && res.assets.length > 0) {
        const pickedImage = res.assets[0];
        // Direct local URI save karein preview aur upload ke liye
        setVehicleImage(pickedImage.uri);
      }
    });
  };

  // ─── CHANGE 2: HANDLESAVE WITH FORMDATA LOGIC ───
  const handleSave = async () => {
    if (!company || !model || !plate) {
      Alert.alert("Required", "Please fill mandatory fields (*)");
      return;
    }

    // 1. Create FormData Object kyounke backend [FromForm] use kar raha hai
    const formData = new FormData();
    
    // 2. Text fields ko append karein
    formData.append('CustomerId', User?.id || 0);
    formData.append('CarCompany', company);
    formData.append('CarModel', model);
    formData.append('NumberPlate', plate);
    formData.append('CarType', type);
    formData.append('Color', color || '');
    formData.append('ManufYear', year ? parseInt(year) : '');

    // 3. Physical Image File handles
    if (vehicleImage) {
      if (vehicleImage.startsWith('http')) {
        // Agar image already server par uploaded hai to sirf filename bhej dein text field me
        const splitUrl = vehicleImage.split('/vehicle_images/');
        const existingFileName = splitUrl[splitUrl.length - 1];
        formData.append('VehicleImage', existingFileName);
      } else {
        // Nayi select ki hui image ko file object bana kar bhejein
        const uriParts = vehicleImage.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('imageFile', {
          uri: Platform.OS === 'android' ? vehicleImage : vehicleImage.replace('file://', ''),
          type: `image/${fileType === 'png' ? 'png' : 'jpeg'}`,
          name: `vehicle_photo.${fileType || 'jpg'}`,
        });
      }
    } else {
      // Agar user ne image null (clear) kar di hai to empty string ya null bhej dein
      formData.append('VehicleImage', '');
    }

    const url = isEditing
      ? `${BASE_URL}/Customer/UpdateVehicle/${isEditing}`
      : `${BASE_URL}/Customer/AddVehicle`;

    // .NET backend handle karne ke liye PUT ya POST parameters
    const method = isEditing ? 'PUT' : 'POST';

    try {
      setLoading(true);
      const response = await fetch(url, {
        method: method,
        headers: {
          'Accept': 'application/json',
          // Note: FormData transfer ke waqt Content-Type khud set hota hai, isko json nahi likhna yahan
        },
        body: formData, 
      });

      const result = await response.json();
      console.log(response)

      if (result.status === "success") {
        Alert.alert("Done", result.message);
        fetchVehicles();
        clearForm();
        Keyboard.dismiss();
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      console.error("API Upload Error:", error);
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vId) => {
    Alert.alert(
      "Delete Vehicle",
      "Are you sure you want to delete this vehicle?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            setLoading(true);
            try {
              const response = await fetch(`${BASE_URL}/Customer/DeleteVehicle/${vId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
              });

              const result = await response.json();

              if (result.status === "success") {
                Alert.alert("Success", result.message);
                fetchVehicles();
              } else {
                Alert.alert("Error", result.message);
              }
            } catch (error) {
              Alert.alert("Error", "Connection to server failed");
            } finally {
              setLoading(false);
            }
          } 
        }
      ]
    );
  };

  const clearForm = () => {
    setCompany(''); setModel(''); setPlate('');
    setType('Small'); setColor(''); setYear('');
    setVehicleImage(null);
    setIsEditing(null);
  };

  // ─── CHANGE 3: ONEDITPRESS IMAGE URL LOGIC ───
  const onEditPress = (item) => {
    setCompany(item.carCompany);
    setModel(item.carModel);
    setPlate(item.numberPlate);
    setType(item.carType);
    setColor(item.color);
    setYear(item.manufYear ? item.manufYear.toString() : '');
    
    // Edit dabaane par remote image path set karein taake top box me preview sahi dikhe
    if (item.vehicleImage) {
      setVehicleImage(`${serverUrl}/vehicle_images/${item.vehicleImage}`);
    } else {
      setVehicleImage(null);
    }

    setIsEditing(item.vehicleId);
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  };

  // Helper function dynamically render existing images safely
  const renderCardImage = (imgName) => {
    if (!imgName) return <Text style={{ fontSize: 18 }}>🚗</Text>;
    
    if (imgName.startsWith('http') || imgName.startsWith('data:image')) {
      return <Image source={{ uri: imgName }} style={styles.thumbImg} />;
    }
    
    return <Image source={{ uri: `${serverUrl}/vehicle_images/${imgName}` }} style={styles.thumbImg} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={vehicles}
          keyExtractor={item => item.vehicleId.toString()}
          ListHeaderComponent={
            <View style={styles.scrollContent}>
              <View style={styles.headerCentered}>
                <Text style={styles.headerTitle}>{isEditing ? "Update Details" : "Register Vehicle"}</Text>
                <View style={styles.headerLine} />
              </View>

              {/* ─── CHOOSE IMAGE AREA ─── */}
              <Text style={styles.label}>Vehicle Image</Text>
              <View style={styles.imageFrame}>
                {vehicleImage ? (
                  <Image source={{ uri: vehicleImage }} style={styles.fullImage} />
                ) : (
                  <Text style={{ color: 'silver', fontWeight: 'bold' }}>🚗 No Image Selected</Text>
                )}
              </View>
              
              <View style={styles.imageBtnRow}>
                <TouchableOpacity style={styles.imgBtn} onPress={() => handleImagePicker('camera')}>
                  <Text style={styles.imgBtnText}>📸 Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.imgBtn, { backgroundColor: '#4169E1' }]} onPress={() => handleImagePicker('library')}>
                  <Text style={styles.imgBtnText}>🖼️ Gallery</Text>
                </TouchableOpacity>
                {vehicleImage && (
                  <TouchableOpacity style={[styles.imgBtn, { backgroundColor: 'tomato' }]} onPress={() => setVehicleImage(null)}>
                    <Text style={styles.imgBtnText}>🗑️ Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.label}>Car Company *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Honda"
                placeholderTextColor="gray"
                value={company}
                onChangeText={setCompany}
              />

              <Text style={styles.label}>Car Model *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Civic"
                placeholderTextColor="gray"
                value={model}
                onChangeText={setModel}
              />

              <Text style={styles.label}>Number Plate *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. ABC-123"
                placeholderTextColor="gray"
                value={plate}
                onChangeText={setPlate}
                autoCapitalize="characters"
              />

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Text style={styles.label}>Color</Text>
                  <TextInput
                    style={[styles.input, { marginRight: 10 }]}
                    placeholder="White"
                    placeholderTextColor="gray"
                    value={color}
                    onChangeText={setColor}
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Text style={styles.label}>Year</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2024"
                    placeholderTextColor="gray"
                    value={year}
                    onChangeText={setYear}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.label}>Car Size *</Text>
              <View style={styles.horizontalList}>
                <TouchableOpacity
                  style={[styles.chip, type === 'Small' && styles.selectedStationChip]}
                  onPress={() => setType('Small')}
                >
                  <Text style={[styles.chipText, type === 'Small' && styles.whiteText]}>Small</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chip, type === 'Large' && styles.selectedBayChip]}
                  onPress={() => setType('Large')}
                >
                  <Text style={[styles.chipText, type === 'Large' && styles.whiteText]}>Large</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>{isEditing ? "SAVE UPDATES" : "ADD VEHICLE"}</Text>}
              </TouchableOpacity>

              {isEditing && (
                <TouchableOpacity onPress={clearForm} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>CANCEL EDITING</Text>
                </TouchableOpacity>
              )}

              <View style={[styles.headerCentered, { marginTop: 40 }]}>
                <Text style={[styles.headerTitle, { fontSize: 18 }]}>My Vehicles</Text>
                <View style={[styles.headerLine, { width: 45 }]} />
              </View>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshing={loading}
          onRefresh={fetchVehicles}
          renderItem={({ item }) => (
            <View style={styles.pricingBox}>
              
              <View style={styles.thumbnailContainer}>
                {renderCardImage(item.vehicleImage)}
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{item.carCompany} {item.carModel}</Text>
                <Text style={styles.cardSub}>{item.numberPlate} | {item.color}</Text>
                <View style={[styles.typeBadge, { backgroundColor: 'whitesmoke' }]}>
                  <Text style={[styles.typeBadgeText, { color: 'gray' }]}>{item.carType}</Text>
                </View>
              </View>

              <View style={styles.actionColumn}>
                <TouchableOpacity onPress={() => onEditPress(item)} style={styles.solidEditBtn}>
                  <Text style={styles.solidBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.vehicleId)}
                  style={styles.solidRemoveBtn}
                >
                  <Text style={styles.solidBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  headerCentered: { alignItems: 'center', marginVertical: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'black' },
  headerLine: { height: 4, width: 40, backgroundColor: 'springgreen', marginTop: 5, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 15 },
  label: { fontSize: 13, fontWeight: 'bold', color: 'black', marginBottom: 8 },
  horizontalList: { marginBottom: 20, flexDirection: 'row' },
  chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: 'whitesmoke', marginRight: 10, borderWidth: 1, borderColor: 'lightgray' },
  selectedStationChip: { backgroundColor: 'springgreen', borderColor: 'springgreen' },
  selectedBayChip: { backgroundColor: 'deepskyblue', borderColor: 'deepskyblue' },
  chipText: { fontSize: 13, fontWeight: 'bold', color: 'gray' },
  whiteText: { color: 'white' },
  pricingBox: { backgroundColor: 'white', padding: 12, borderRadius: 18, marginBottom: 15, marginHorizontal: 20, borderWidth: 1, borderColor: 'whitesmoke', flexDirection: 'row', alignItems: 'center', elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: 'black' },
  cardSub: { color: 'gray', fontSize: 12, marginTop: 2 },
  typeBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  imageFrame: { width: '100%', height: 160, backgroundColor: 'whitesmoke', borderRadius: 12, borderWidth: 1, borderColor: 'lightgray', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  fullImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  imgBtn: { flex: 1, backgroundColor: 'black', padding: 10, marginHorizontal: 4, borderRadius: 8, alignItems: 'center' },
  imgBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  thumbnailContainer: { width: 65, height: 65, borderRadius: 12, backgroundColor: 'whitesmoke', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  thumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  actionColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  solidEditBtn: { backgroundColor: 'deepskyblue', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 10, marginBottom: 6, minWidth: 75, alignItems: 'center' },
  solidRemoveBtn: { backgroundColor: 'red', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 10, minWidth: 75, alignItems: 'center' },
  solidBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  row: { flexDirection: 'row' },
  flexHalf: { flex: 1 },
  input: { backgroundColor: 'whitesmoke', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: 'lightgray', marginBottom: 20, color: 'black' },
  submitBtn: { backgroundColor: 'limegreen', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { marginTop: 15, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: 'red', alignItems: 'center' },
  cancelBtnText: { color: 'red', fontWeight: 'bold', fontSize: 14 }
});

export default ManageVehicle;