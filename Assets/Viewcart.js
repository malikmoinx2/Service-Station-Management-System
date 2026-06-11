import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const Viewcart = ({ navigation }) => {
  const { User, settotalbill, setorderproduct } = useContext(UserContext);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState({}); 
  const [selectedProductsList, setSelectedProductsList] = useState([]); 

  useEffect(() => {
    fetchCartData();
  }, []);

  const fetchCartData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/Customer/getcart/${User?.id}`);
      const result = await response.json();
      if (result.status === "success") {
        const processed = (result.data || []).map(item => {
          const originalPrice = item.originalPrice ?? item.OriginalPrice ?? item.price ?? item.Price ?? 0;
          const finalPrice = item.finalPrice ?? item.FinalPrice ?? originalPrice;
          const qty = item.quantity || 1;
          const delivery = item.delivery || item.Delivery || 0;
          return {
            ...item,
            id: item.id || item.CartItemId || item.Id,
            productid: item.productid || item.ProductId,
            stationid: item.stationid || item.StationId,
            originalPrice,
            finalPrice,
            price: finalPrice, // Alias for Orderdetail
            itemTotal: (finalPrice * qty) + delivery
          };
        });
        setCartItems(processed);
        // Sync selectedProductsList if any were already selected
        const newSelectedList = processed.filter(item => selectedItems[item.id]);
        setSelectedProductsList(newSelectedList);

        console.log('=== CART API RESPONSE (processed) ===', JSON.stringify(processed[0], null, 2));
      } else if (result.status === "empty") {
        setCartItems([]);
        setSelectedProductsList([]);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "Failed to connect with server");
    } finally {
      setLoading(false);
    }
  };

  
  const handleDeleteItem = (id) => {
    Alert.alert("Remove Item", "Are you sure you want to remove this product from cart?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Remove", 
        style: "destructive", 
        onPress: async () => {
          try {
            setLoading(true);
            
            
            const res = await fetch(`${BASE_URL}/Customer/removeproduct/${id}`, {
              method: 'DELETE',
            });
            const data = await res.json();
            if (data.status === "success") {
              fetchCartData(); // List refresh karein
            }
          } catch (error) {
            Alert.alert("Error", "Delete failed");
          } finally {
            setLoading(false);
          }
        } 
      }
    ]);
  };

  const toggleSelection = (id) => {
    setSelectedItems(prev => {
      const newSelection = { ...prev, [id]: !prev[id] };
      const filteredList = cartItems.filter(item => newSelection[item.id]);
      setSelectedProductsList(filteredList);
      return newSelection;
    });
  };

  const handleQuantity = async (cartItemId, currentQty, type) => {
    const newQty = type === 'add' ? currentQty + 1 : Math.max(1, currentQty - 1);
    const updatedItems = cartItems.map(item => 
      item.id === cartItemId ? { ...item, quantity: newQty, itemTotal: (item.finalPrice * newQty) + (item.delivery || 0) } : item
    );
    setCartItems(updatedItems);
    const filteredList = updatedItems.filter(item => selectedItems[item.id]);
    setSelectedProductsList(filteredList);

    try {
      await fetch(`${BASE_URL}/Customer/updatequantity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItemId: parseInt(cartItemId),
          newQuantity: newQty
        }),
      });
    } catch (error) {
      Alert.alert("Error", "Quantity update failed");
      fetchCartData(); 
    }
  };

  const calculateSelectedTotal = () => {
    return selectedProductsList.reduce((sum, item) => sum + item.itemTotal, 0);
  };

  const handleOrderNow = () => {
    if (selectedProductsList.length === 0) {
      Alert.alert("No Selection", "Please select at least one item to order.");
      return;
    }
    setorderproduct(selectedProductsList)
    settotalbill(calculateSelectedTotal())
    navigation.navigate('Orderdetail')
  }

  const renderCartItem = ({ item }) => {
    const isSelected = selectedItems[item.id];
    // Handle both casings for discount fields
    const hasDiscount    = !!(item.hasDiscount || item.HasDiscount);
    const originalPrice  = item.originalPrice ?? item.OriginalPrice ?? item.price ?? 0;
    const finalPrice     = item.finalPrice    ?? item.FinalPrice    ?? originalPrice;
    const discountLabel  = item.discountLabel || item.DiscountLabel;

    return (
      <View style={[styles.itemCard, isSelected && styles.selectedCard]}>
        <View style={styles.itemHeader}>
          <TouchableOpacity 
            style={[styles.checkbox, isSelected && styles.checkboxChecked]}
            onPress={() => toggleSelection(item.id)}
          >
            {isSelected && <Text style={styles.checkMark}>✓</Text>}
          </TouchableOpacity>
          
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.itemName}>{item.productname}</Text>
            {/* Price with discount */}
            <View style={styles.priceRow}>
              {hasDiscount && (
                <Text style={styles.oldPrice}>Rs {originalPrice}</Text>
              )}
              <Text style={[styles.itemBasePrice, hasDiscount && styles.discountPrice]}>
                Rs {Math.round(finalPrice)}
              </Text>
            </View>
            {hasDiscount && discountLabel ? (
              <View style={styles.discountTag}>
                <Text style={styles.discountTagText}>{discountLabel}</Text>
              </View>
            ) : null}
          </View>

         
          <TouchableOpacity 
            style={styles.deleteBtn} 
            onPress={() => handleDeleteItem(item.id)}
          >
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>

          <View style={styles.qtyContainer}>
            <TouchableOpacity 
              style={styles.qtyBtn} 
              onPress={() => handleQuantity(item.id, item.quantity, 'sub')}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{item.quantity}</Text>
            <TouchableOpacity 
              style={styles.qtyBtn} 
              onPress={() => handleQuantity(item.id, item.quantity, 'add')}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.billingBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery charges:</Text>
            <Text style={styles.detailValue}>{item.delivery} PKR</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Item Subtotal:</Text>
            <Text style={styles.totalValue}>Rs {item.itemTotal}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="royalblue" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review Cart</Text>
      </View>

      {cartItems.length > 0 ? (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCartItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          
          <View style={styles.footer}>
            <View style={styles.footerInfo}>
              <View>
                <Text style={styles.footerLabel}>Selected Total ({selectedProductsList.length} items)</Text>
                <Text style={styles.footerTotalText}>Rs {calculateSelectedTotal()}</Text>
              </View>
              <TouchableOpacity style={styles.mainOrderBtn} onPress={handleOrderNow}>
                <Text style={styles.mainOrderBtnText}>Place Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your cart is empty!</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'ghostwhite' },
  header: { padding: 20, backgroundColor: 'white', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'lightgrey' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'black' },
  listContent: { padding: 15, paddingBottom: 150 },
  
  itemCard: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 4 },
  selectedCard: { borderColor: 'royalblue', borderWidth: 1, backgroundColor: 'aliceblue' },
  
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: 'lightgrey', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: 'royalblue', borderColor: 'royalblue' },
  checkMark: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  itemName: { fontSize: 16, fontWeight: 'bold', color: 'black' },
  itemBasePrice: { fontSize: 12, color: 'gray' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  oldPrice: { fontSize: 11, color: '#aaa', textDecorationLine: 'line-through' },
  discountPrice: { color: '#e53935', fontWeight: 'bold' },
  discountTag: { alignSelf: 'flex-start', backgroundColor: '#e53935', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 3 },
  discountTagText: { color: 'white', fontSize: 9, fontWeight: 'bold' },

  deleteBtn: { padding: 8, marginRight: 5 },
  deleteText: { fontSize: 20 },

  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'whitesmoke', borderRadius: 10, padding: 3 },
  qtyBtn: { width: 28, height: 28, backgroundColor: 'white', borderRadius: 6, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold' },
  qtyValue: { marginHorizontal: 12, fontSize: 14, fontWeight: 'bold' },

  billingBox: { backgroundColor: 'whitesmoke', borderRadius: 12, padding: 12, marginLeft: 34 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 12, color: 'dimgray' },
  detailValue: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'lightgrey', marginVertical: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 14, fontWeight: 'bold' },
  totalValue: { fontSize: 15, fontWeight: 'bold', color: 'royalblue' },

  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 15,
    borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 25 
  },
  footerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 12, color: 'gray' },
  footerTotalText: { fontSize: 20, fontWeight: 'bold', color: 'black' },
  
  mainOrderBtn: { backgroundColor: 'black', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 15 },
  mainOrderBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15, textTransform: 'uppercase' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: 'gray' }
});

export default Viewcart;