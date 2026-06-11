import React, { useState, useContext, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, Image, ScrollView, StatusBar, Alert, TextInput, Share, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const userprofile = ({ navigation }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { setUser, User } = useContext(UserContext);
  const [selectedImage, setSelectedImage] = useState(null); // Full Screen Image State
  
  // States
  const [name, setName] = useState(User?.name);
  const [email, setEmail] = useState(User?.email);
  const [phone, setPhone] = useState(User?.contact);
  const [image, setImage] = useState(User?.imageUrl);
  const [userid, setuserid] = useState(User?.id);

  const serverUrl = BASE_URL.replace('/api', '');

  // --- BUTTON FUNCTIONS ---
  const onShare = async () => {
    try {
      await Share.share({
        message: 'Download Service-A-Car App! Get your car serviced easily.',
      });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await AsyncStorage.clear();
          setUser(null);
          navigation.replace('Login');
        }
      }
    ]);
  };

  const handleRoleSwitch = () => {
    const nextRole = User?.role === "Customer" ? "Station Owner" : "Customer";
    Alert.alert(
      "Switch Role",
      `Are you sure you want to switch to ${nextRole} profile? You will be logged out for safety.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Switch", 
          onPress: async () => {
            try {
              const res = await fetch(`${BASE_URL}/Users/switchrole/${User?.id}`, { method: 'PUT' });
              const data = await res.json();
              if (data.status === "success") {
                Alert.alert("Success", data.message);
                // Force Logout after switch
                await AsyncStorage.clear();
                setUser(null);
                navigation.replace('Login');
              } else {
                Alert.alert("Error", data.message || "Switch failed");
              }
            } catch (err) {
              Alert.alert("Error", "Server connect nahi ho saka");
            }
          } 
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteUser(User?.id) }
      ]
    );
  };

  const deleteUser = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/Users/deleteuser/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === "success") {
        Alert.alert("Success", "Account Deleted Successfully");
        await AsyncStorage.clear();
        navigation.replace('Login');
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleImagePicker = (type) => {
    const method = type === 'camera' ? launchCamera : launchImageLibrary;
    method({ mediaType: 'photo', quality: 0.7 }, (res) => {
      if (res.assets) setImage(res.assets[0].uri);
    });
  };

  const handleRemoveImage = () => {
    setImage(null);
  };

  const handleUpdateProfile = async () => {
    if (!name || !phone || !email) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('Id', userid);
      formData.append('Name', name);
      formData.append('Email', email);
      formData.append('Contact', phone);
      formData.append('Role', User?.role || "");

      if (image) {
        if (image.startsWith('file://') || image.startsWith('content://')) {
          const fileName = image.split('/').pop();
          const fileType = fileName.split('.').pop();
          formData.append('imageFile', {
            uri: image,
            name: fileName,
            type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
          });
        } else {
          const existingFileName = image.split('/').pop().split('?')[0];
          formData.append('ImageUrl', existingFileName); 
        }
      } else {
        formData.append('ImageUrl', ""); 
      }

      const response = await fetch(`${BASE_URL}/Users/updateprofile`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      });

      const result = await response.json();
      if (result.status === "success") {
        const updatedUser = { ...User, id: result.user.id, name: result.user.name, email: result.user.email, contact: result.user.contact, imageUrl: result.user.imageUrl };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setImage(result.user.imageUrl);
        setIsEditing(false);
        Alert.alert("Success", "Profile Updated!");
      }
    } catch (error) {
      Alert.alert("Error", "Update failed.");
    }
  };

  // Helper to get current Image URI
  const currentImageUri = !image 
    ? 'https://cdn-icons-png.flaticon.com/512/149/149071.png' 
    : image.startsWith('file://') || image.startsWith('content://') 
    ? image 
    : `${serverUrl}/profile_images/${image}?t=${Date.now()}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* PROFILE HEADER SECTION */}
        <View style={styles.profileHeader}>
          <View style={styles.imageWrapper}>
            {/* Click to open full image */}
            <TouchableOpacity onPress={() => setSelectedImage(currentImageUri)}>
              <Image 
                source={{ uri: currentImageUri }} 
                style={styles.profileImage} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.editBadge, { backgroundColor: isEditing ? '#50C2C9' : 'black' }]}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Text style={styles.editIcon}>{isEditing ? '✕' : '✎'}</Text>
            </TouchableOpacity>
          </View>

          {isEditing && (
            <View style={styles.mediaButtonsRow}>
              <TouchableOpacity style={styles.mediaBtn} onPress={() => handleImagePicker('camera')}><Text style={styles.mediaBtnText}>📸 Camera</Text></TouchableOpacity>
              <TouchableOpacity style={styles.mediaBtn} onPress={() => handleImagePicker('library')}><Text style={styles.mediaBtnText}>🖼️ Gallery</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.mediaBtn, {backgroundColor: '#FF6B6B'}]} onPress={handleRemoveImage}><Text style={[styles.mediaBtnText, {color: 'white'}]}>🗑️ Remove</Text></TouchableOpacity>
            </View>
          )}
          
          <View style={styles.infoContainer}>
            {isEditing ? (
              <> 
                <View style={styles.inputGroup}><Text style={styles.fieldLabel}>Name</Text><TextInput style={styles.input} value={name} onChangeText={setName} /></View>
                <View style={styles.inputGroup}><Text style={styles.fieldLabel}>Email</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} /></View>
                <View style={styles.inputGroup}><Text style={styles.fieldLabel}>Phone</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} /></View>
                <TouchableOpacity style={styles.updateBtn} onPress={handleUpdateProfile}><Text style={styles.updateBtnText}>SAVE CHANGES</Text></TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.userName}>{name}</Text>
                <Text style={styles.userEmail}>{email}</Text>
                <Text style={styles.userPhone}>{phone}</Text>
              </>
            )}
          </View>
        </View>

        {/* --- MENU CARD (Share, Delete, Logout) --- */}
        {!isEditing && (
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={onShare}>
              <View style={styles.menuLeft}>
                <View style={styles.iconCircle}><Text style={styles.menuIconText}>🔗</Text></View>
                <Text style={styles.menuTitle}>Share App</Text>
              </View>
              <Text style={styles.arrow}>{">"}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Changepassword')}>
              <View style={styles.menuLeft}>
                <View style={styles.iconCircle}><Text style={styles.menuIconText}>🔑</Text></View>
                <Text style={styles.menuTitle}>Change Password</Text>
              </View>
              <Text style={styles.arrow}>{">"}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* <TouchableOpacity style={styles.menuItem} onPress={handleRoleSwitch}>
              <View style={styles.menuLeft}>
                <View style={styles.iconCircle}><Text style={styles.menuIconText}>🔄</Text></View>
                <Text style={[styles.menuTitle, { color: '#50C2C9' }]}>
                  {User?.role === 'Customer' ? 'Switch to Station Owner' : 'Switch to Customer'}
                </Text>
              </View>
              <Text style={styles.arrow}>{">"}</Text>
            </TouchableOpacity> */}

            <View style={styles.divider} />

            {/* <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
              <View style={styles.menuLeft}>
                <View style={styles.iconCircle}><Text style={styles.menuIconText}>🗑️</Text></View>
                <Text style={[styles.menuTitle, { color: 'orange' }]}>Delete Account</Text>
              </View>
              <Text style={styles.arrow}>{">"}</Text>
            </TouchableOpacity> */}

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={styles.menuLeft}>
                <View style={styles.iconCircle}><Text style={styles.menuIconText}>🚪</Text></View>
                <Text style={[styles.menuTitle, { color: 'red' }]}>Logout</Text>
              </View>
              <Text style={styles.arrow}>{">"}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      {/* ✅ Full Screen Zoomable Modal */}
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  profileHeader: { alignItems: 'center', paddingVertical: 30, backgroundColor: 'white', borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 4 },
  imageWrapper: { position: 'relative', marginBottom: 15 },
  profileImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#50C2C9', backgroundColor: '#eee' },
  editBadge: { position: 'absolute', bottom: 5, right: 5, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  editIcon: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  mediaButtonsRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  mediaBtn: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  mediaBtnText: { fontSize: 11, color: '#333', fontWeight: 'bold' },
  infoContainer: { width: '85%', alignItems: 'center' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 14, color: 'gray', marginTop: 5 },
  userPhone: { fontSize: 14, color: 'gray', marginTop: 2 },
  inputGroup: { marginBottom: 15, width: '100%' },
  fieldLabel: { fontSize: 12, fontWeight: 'bold', color: '#50C2C9', marginBottom: 5, marginLeft: 5 },
  input: { width: '100%', backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eee', color: '#333' },
  updateBtn: { backgroundColor: '#50C2C9', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  updateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  menuCard: { backgroundColor: 'white', margin: 20, borderRadius: 20, paddingVertical: 5, elevation: 3 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuIconText: { fontSize: 18 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: '#444' },
  arrow: { fontSize: 16, color: '#CCC' },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 20 },
  versionText: { textAlign: 'center', color: '#CCC', fontSize: 11, marginVertical: 20 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'black' },
  zoomWrapper: { flexGrow: 1, justifyContent: 'center' },
  fullScreenImage: { width: '100%', height: '100%' },
  closeModalBtn: { position: 'absolute', top: 40, right: 20, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 10 },
  closeIcon: { fontSize: 25, color: 'white', fontWeight: 'bold' },
});

export default userprofile;