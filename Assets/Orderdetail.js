import React, { useState,useContext,useEffect } from 'react';
import {StyleSheet,View,Text,TextInput, TouchableOpacity, SafeAreaView, ScrollView, Modal,ActivityIndicator,Alert} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants"
const Orderdetail = ({navigation}) => {
   const {User,totalbill,orderproduct } = useContext(UserContext);
  const[name,setname]=useState(User?.name)
  const[email,setemail]=useState(User?.email)
  const[contact,setcontact]=useState(User?.contact)
  const[address,setaddress]=useState()
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery'); 
  const [showDropdown, setShowDropdown] = useState(false);
  const paymentOptions = ['Cash on Delivery'];
  const[loading,setloading]=useState(false)

 

  useEffect(()=>{
    console.log(orderproduct)
    console.log(totalbill)
  },[orderproduct,totalbill])
  const placeOrderToBackend = async () => {
 
const orderData = {
   
    CustomerId: User?.id,
    TotalAmount: parseFloat(totalbill), 
    CustomerName: name,
    ContactNumber: contact,
    ShippingAddress: address,
    PaymentMethod: paymentMethod,
    Items: orderproduct.map(item => ({
        ProductId: parseInt(item.productid),
        StationId: parseInt(item.stationid),
        Quantity: item.quantity,
        Price: item.price,
        ItemTotal: item.itemTotal
    }))
};
console.log(orderData)
  try {
    setloading(true); 

    const response = await fetch(`${BASE_URL}/Customer/PlaceOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (response.status === 200) {
      // Success case
      Alert.alert(
        "Yourn Order Successfully Placed", 
        `.\nOrder ID: ${result.orderId}`,
        [{ text: "OK", onPress: () => navigation.navigate('Customerhome') }]
      );
    } 
    else if (response.status === 400) {
      Alert.alert("Input Error", result.message);
    } 
    else {
     
      Alert.alert("Server Error", result.message || "Something Wrong");
    }
  } catch (error) {
    
    console.error("API Error:", error);
    Alert.alert("Network Error", "Server se rabta nahi ho pa raha. Internet check karein.");
  } finally {
    setloading(false); 
  }
};



  if (loading) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
            <ActivityIndicator size="large" color="deepskyblue" />
            <Text style={{ marginTop: 12, color: 'gray', fontWeight: 'bold' }}>Order Processing...</Text>
          </View>
        );
      }





  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionSubtitle}>Please provide delivery details to complete your order.</Text>

        
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput 
            style={styles.input}
            value={name}
            onChangeText={setname}
            placeholder="Enter your name"
          />

          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput 
            style={styles.input}
            value={email}
            onChangeText={setemail}
            keyboardType="email-address"
            placeholder="name@example.com"
          />

          <Text style={styles.inputLabel}>Contact Number</Text>
          <TextInput 
            style={styles.input}
            value={contact}
            onChangeText={setcontact}
            keyboardType="phone-pad"
            placeholder="03xx-xxxxxxx"
          />
        </View>

        
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Shipping Address</Text>
          <TextInput 
            style={[styles.input, { height: 80 }]}
            value={address}
            onChangeText={setaddress}
            multiline
            placeholder="Complete street address"
          />
        </View>

        {/* 3. Payment Method Dropdown  */}
        <Text style={styles.sectionLabel}>Payment Method</Text>
        <TouchableOpacity 
          style={styles.dropdown} 
          onPress={() => setShowDropdown(true)}
        >
          <Text style={styles.dropdownValue}>{paymentMethod}</Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>

        {/* Action Button [cite: 168] */}
        <TouchableOpacity style={styles.confirmBtn} onPress={()=>placeOrderToBackend()}>
          <Text style={styles.confirmBtnText}>PLACE ORDER</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Payment Selection Modal */}
      <Modal visible={showDropdown} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.modalContent}>
            {paymentOptions.map((option) => (
              <TouchableOpacity 
                key={option} 
                style={styles.optionItem}
                onPress={() => {
                  setPaymentMethod(option);
                  setShowDropdown(false);
                }}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

   
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'ghostwhite' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: 'white' },
  headerTitle: { fontSize: 18, fontWeight: 'bold',alignSelf:"center",marginLeft:100 },

  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionSubtitle: { fontSize: 12, color: 'gray', marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },

  inputCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: 'dimgray', marginBottom: 8 },
  input: { backgroundColor: 'whitesmoke', borderRadius: 12, padding: 15, fontSize: 14, color: 'black', marginBottom: 15 },

  dropdown: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 18, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: 'lightgray',
    marginBottom: 30
  },
  dropdownValue: { fontSize: 15, fontWeight: '600' },
  dropdownIcon: { fontSize: 12, color: 'gray' },

  confirmBtn: { backgroundColor: 'black', padding: 18, borderRadius: 15, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: 'bold', letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '80%', borderRadius: 20, padding: 10 },
  optionItem: { padding: 18, borderBottomWidth: 0.5, borderColor: 'whitesmoke' },
  optionText: { fontSize: 16, textAlign: 'center' }
});

export default Orderdetail;