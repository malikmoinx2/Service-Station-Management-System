import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, ScrollView, Alert, Modal, StatusBar, ActivityIndicator } from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const Orderstatus = ({ navigation }) => {
  const { User, setproductid, setorderid, setproductidforreview } = useContext(UserContext);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setloading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reorderData, setReorderData] = useState(null);
  const [reorderItems, setReorderItems] = useState([]); // Mutable items for quantity adjustment
  const [activeFilter, setActiveFilter] = useState('Pending');

  const filters = ['Pending', 'Partially Approved', 'Approved', 'Cancelled'];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setloading(true);
      const response = await fetch(`${BASE_URL}/Customer/getuserorders/${User?.id}`);
      const json = await response.json();
      if (json.status === "success") {
        setOrders(json.data);
        const filtered = json.data.filter(order => order.status === activeFilter);
        setFilteredOrders(filtered);
      } else {
        Alert.alert("Notice", json.message);
      }
    } catch (ex) {
      Alert.alert("Error", "Server connect nahi ho saka: " + ex.message);
    } finally {
      setloading(false);
    }
  };

  const applyFilter = (status) => {
    setActiveFilter(status);
    const filtered = orders.filter(order => order.status === status);
    setFilteredOrders(filtered);
  };

  // ⭐ Star render helper
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={{ fontSize: 13, color: rating >= i ? '#F5A623' : '#D1D1D1' }}>★</Text>
      );
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };

  const handleFullOrderCancel = (orderId) => {
    Alert.alert("Cancel Order", "Kya aap ye order cancel karna chahte hain?", [
      { text: "No" },
      {
        text: "Yes, Cancel", onPress: async () => {
          try {
            const response = await fetch(`${BASE_URL}/Customer/cancelorder/${orderId}`, { method: 'POST' });
            const json = await response.json();
            if (json.status === "success") {
              Alert.alert("Success", "Order cancel ho gaya.");
              fetchOrders();
            }
          } catch (ex) {
            Alert.alert("Error", "Cancellation fail: " + ex.message);
          }
        }
      }
    ]);
  };

  const saveUpdatedQty = async () => {
    try {
      setloading(true);
      const response = await fetch(`${BASE_URL}/Customer/updateitemquantity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ OrderItemId: selectedItem.orderItemId, Quantity: selectedItem.quantity }),
      });
      const json = await response.json();
      if (json.status === "success") {
        Alert.alert("Success", "Quantity and Total Amount updated.");
        setUpdateModalVisible(false);
        setDetailModalVisible(false);
        fetchOrders();
      } else {
        Alert.alert("Error", json.message);
      }
    } catch (ex) {
      Alert.alert("Error", "Quantity update failed: " + ex.message);
    } finally {
      setloading(false);
    }
  };

  const handleFullOrderDelete = (orderId) => {
    Alert.alert("Delete Order", "Are you sure you want to delete this order?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteOrderApi(orderId) }
    ]);
  };

  const deleteOrderApi = async (orderId) => {
    try {
      setloading(true);
      const response = await fetch(`${BASE_URL}/Customer/deleteorder/${orderId}`, { method: 'DELETE' });
      const json = await response.json();
      if (json.status === "success") {
        Alert.alert("Success", "Order removed.");
        fetchOrders();
      } else {
        Alert.alert("Error", json.message);
      }
    } catch (ex) {
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setloading(false);
    }
  };

  const handleItemDelete = (orderItemId) => {
    Alert.alert("Delete Order", "Are you sure you want to delete this order Item?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteItemApi(orderItemId) }
    ]);
  };

  const deleteItemApi = async (orderItemId) => {
    try {
      setloading(true);
      const response = await fetch(`${BASE_URL}/Customer/deleteitem/${orderItemId}`, { method: 'DELETE' });
      const json = await response.json();
      if (json.status === "success") {
        Alert.alert("Success", "Item removed.");
        fetchOrders();
        setDetailModalVisible(false);
      } else {
        Alert.alert("Error", json.message);
      }
    } catch (ex) {
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setloading(false);
    }
  };

  const handleReorder = (order) => {
    // Prepare items with initial quantities from the past order
    const itemsWithQty = order.items.map(item => ({
      ...item,
      quantity: item.quantity || 1
    }));
    setReorderItems(itemsWithQty);
    setReorderData(order);
    setReorderModalVisible(true);
  };

  const updateReorderQty = (index, delta) => {
    setReorderItems(prev => {
      const newList = [...prev];
      newList[index].quantity = Math.max(1, newList[index].quantity + delta);
      return newList;
    });
  };

  const confirmReorder = async () => {
    if (!reorderData || reorderItems.length === 0) return;
    try {
      setloading(true);
      
      // Fetch current prices and discounts for each product in the reorder list
      const updatedItems = await Promise.all(reorderItems.map(async (item) => {
        try {
          const res = await fetch(`${BASE_URL}/Customer/getproductprice/${item.productId}`);
          const result = await res.json();
          if (result.status === 'success' && result.data) {
            const live = result.data;
            const livePrice = parseFloat(live.FinalPrice ?? live.finalPrice ?? item.price ?? 0);
            return {
              ProductId: parseInt(item.productId || 0),
              StationId: parseInt(item.stationId || 0),
              Quantity: parseInt(item.quantity || 1),
              Price: livePrice,
              ItemTotal: (parseInt(item.quantity || 1) * livePrice)
            };
          }
        } catch (e) { console.warn(`Price fetch failed for ${item.productId}`, e); }
        
        // Fallback to original item price if API fails
        return {
          ProductId: parseInt(item.productId || 0),
          StationId: parseInt(item.stationId || 0),
          Quantity: parseInt(item.quantity || 1),
          Price: parseFloat(item.price || 0),
          ItemTotal: (parseInt(item.quantity || 1) * parseFloat(item.price || 0))
        };
      }));

      const totalAmount = updatedItems.reduce((sum, i) => sum + (i.ItemTotal || 0), 0);

      const payload = {
        CustomerId: parseInt(User?.id || 0),
        TotalAmount: parseFloat(totalAmount || 0),
        CustomerName: String(User?.name || reorderData.customerName || "Customer"),
        ContactNumber: String(User?.contact || reorderData.contactNumber || "0000000000"),
        ShippingAddress: String(reorderData.address || "Not provided"),
        PaymentMethod: String(reorderData.paymentMethod || "Cash on Delivery"),
        Items: updatedItems
      };

      console.log("=== SENDING REORDER PAYLOAD ===", JSON.stringify(payload, null, 2));

      const response = await fetch(`${BASE_URL}/Customer/PlaceOrder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      
      console.log("=== REORDER API RESPONSE ===", json);

      if (json.status === "success") {
        setReorderModalVisible(false);
        Alert.alert("Success", "Order placed successfully with current prices!");
        fetchOrders();
      } else {
        Alert.alert("Error", json.message || "Could not reorder");
      }
    } catch (ex) {
      console.error("REORDER ERROR:", ex);
      Alert.alert("Error", "Server connection failed: " + ex.message);
    } finally {
      setloading(false);
    }
  };

  const renderOrderList = ({ item }) => (
    <View style={styles.masterCard}>
      <View style={styles.cardRow}>
        <Text style={styles.orderIdText}>Order #{item.orderId}</Text>
        <Text style={styles.dateText}>{item.date}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.status === 'Approved' ? '#E8F5E9' : item.status === 'Pending' ? '#FFF3E0' : '#E3F2FD' }]}>
        <Text style={[styles.statusTag, { color: item.status === 'Approved' ? '#2E7D32' : item.status === 'Pending' ? '#EF6C00' : '#1976D2' }]}>{item.status}</Text>
      </View>
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Delivery Address:</Text>
        <Text style={styles.infoValue}>{item.address}</Text>
        <Text style={[styles.infoLabel, { marginTop: 6 }]}>Payment Method: <Text style={styles.infoValue}>{item.paymentMethod}</Text></Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.masterTotal}>{item.totalAmount} PKR</Text>
      </View>
      <View style={styles.masterActionRow}>
        <TouchableOpacity style={styles.detailsBtn} onPress={() => { setSelectedOrder(item); setDetailModalVisible(true); }}>
          <Text style={styles.detailsBtnText}>View Items</Text>
        </TouchableOpacity>
        {item.status === 'Pending' && (
          <TouchableOpacity style={[styles.fullCancelBtn, { marginRight: 10 }]} onPress={() => handleFullOrderDelete(item.orderId)}>
            <Text style={styles.fullCancelBtnText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Approved' && (
          <TouchableOpacity style={[styles.fullCancelBtn, { marginRight: 10 }]} onPress={() => { setSelectedOrder(item); setDetailModalVisible(true); }}>
            <Text style={styles.fullCancelBtnText}>Feedback</Text>
          </TouchableOpacity>
        )}
        {/* <TouchableOpacity style={[styles.detailsBtn, { backgroundColor: '#E8F5E9', marginRight: 0 }]} onPress={() => handleReorder(item)}>
          <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>Reorder</Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );

  if (loading) return <View style={styles.loadingBox}><ActivityIndicator size="large" color="royalblue" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}><Text style={styles.headerTitle}>My Orders</Text></View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((f) => (
            <TouchableOpacity key={f} onPress={() => applyFilter(f)} style={[styles.filterItem, activeFilter === f && styles.activeFilterItem]}>
              <Text style={[styles.filterText, activeFilter === f && styles.activeFilterText]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderList}
        keyExtractor={o => o.orderId.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: 'gray' }}>No orders found for this status.</Text>}
      />

      {/* ✅ Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide">
        <SafeAreaView style={styles.detailContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Order Details</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.sectionTitle}>Purchased Products</Text>
            {selectedOrder?.items.map((item) => (
              <View key={item.orderItemId} style={styles.itemCard}>
                
                {/* Product Name & Price Row */}
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemPrice}>{item.quantity} x {item.price} PKR</Text>
                </View>

                {/* Status Badge */}
                <View style={[styles.itemStatusBadge, { backgroundColor: item.status === 'Pending' ? '#FFF3E0' : '#E8F5E9' }]}>
                  <Text style={[styles.itemStatusText, { color: item.status === 'Pending' ? '#EF6C00' : '#2E7D32' }]}>{item.status}</Text>
                </View>

                {/* ⭐ Star Rating Row — Accepted items ke liye */}
                {item.status === 'Accepted' && (
                  <TouchableOpacity
                    style={styles.starRatingRow}
                    onPress={() => {
                      setproductidforreview(item.productId);
                      navigation.navigate('showproductreview');
                    }}
                    activeOpacity={0.7}
                  >
                    {renderStars(item.averageRating || 0)}
                    <Text style={styles.ratingValue}>
                      {item.averageRating > 0 ? item.averageRating.toFixed(1) : '0.0'}
                    </Text>
                    <Text style={styles.reviewCount}>
                      ({item.totalReviewers > 0 ? `${item.totalReviewers} reviews` : 'No reviews'})
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Action Buttons — Accepted items ke liye */}
                {item.status === 'Accepted' && (
                  <View style={styles.itemActionsRow}>
                    {/* 🖋️ Feedback Button — WAISE HI RAKHA */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]}
                      onPress={() => {
                        setproductid(item.productId);
                        setorderid(selectedOrder.orderId);
                        navigation.navigate('productrating');
                      }}
                    >
                      <Text style={{ color: '#2E7D32', fontWeight: 'bold', fontSize: 13 }}>🖋️ Feedback</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Pending items ke liye Edit + Remove */}
                {item.status === 'Pending' && (
                  <View style={styles.itemActionsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#E3F2FD' }]}
                      onPress={() => { setSelectedItem(item); setUpdateModalVisible(true); }}
                    >
                      <Text style={[styles.actionBtnText, { color: '#1976D2' }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#FFEBEE', marginLeft: 8 }]}
                      onPress={() => handleItemDelete(item.orderItemId)}
                    >
                      <Text style={[styles.actionBtnText, { color: '#D32F2F' }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Quantity Update Modal */}
      <Modal visible={updateModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.qtyBox}>
            <Text style={styles.qtyTitle}>Update Quantity</Text>
            <View style={styles.counter}>
              <TouchableOpacity onPress={() => setSelectedItem({ ...selectedItem, quantity: Math.max(1, selectedItem.quantity - 1) })}><Text style={styles.counterOp}>-</Text></TouchableOpacity>
              <Text style={styles.counterVal}>{selectedItem?.quantity}</Text>
              <TouchableOpacity onPress={() => setSelectedItem({ ...selectedItem, quantity: selectedItem.quantity + 1 })}><Text style={styles.counterOp}>+</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveUpdatedQty()}><Text style={{ color: 'white', fontWeight: 'bold' }}>Save Changes</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setUpdateModalVisible(false)}><Text style={{ marginTop: 15, color: 'gray' }}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reorder Modal */}
      <Modal visible={reorderModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.qtyBox, { width: '90%', padding: 20, maxHeight: '80%' }]}>
            <Text style={styles.qtyTitle}>Confirm Reorder</Text>
            {reorderData && (
              <ScrollView style={{ width: '100%', marginBottom: 15 }} showsVerticalScrollIndicator={false}>
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Delivery Address:</Text>
                  <Text style={styles.infoValue}>{reorderData.address}</Text>
                </View>
                <Text style={[styles.sectionTitle, { fontSize: 14, marginTop: 10 }]}>Adjust Quantities:</Text>
                {reorderItems && reorderItems.map((item, index) => (
                  <View key={item.orderItemId || index} style={[styles.itemCard, { paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.productName}</Text>
                      <Text style={styles.itemSubText}>Previous Price: {item.price} PKR</Text>
                    </View>
                    <View style={styles.counter}>
                      <TouchableOpacity onPress={() => updateReorderQty(index, -1)}>
                        <Text style={[styles.counterOp, { fontSize: 24, paddingHorizontal: 12 }]}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.counterVal, { fontSize: 18 }]}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateReorderQty(index, 1)}>
                        <Text style={[styles.counterOp, { fontSize: 24, paddingHorizontal: 12 }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <View style={[styles.priceRow, { marginTop: 10 }]}>
                  <Text style={styles.totalLabel}>Total (Approximate)</Text>
                  <Text style={styles.masterTotal}>
                    {reorderItems.reduce((a, b) => a + (b.quantity * b.price), 0)} PKR
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginTop: 5 }}>
                  * Final amount will be calculated based on current prices and discounts.
                </Text>
              </ScrollView>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={confirmReorder}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Confirm & Place Order</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReorderModalVisible(false)}>
              <Text style={{ marginTop: 15, color: 'gray' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: 'white', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },

  filterWrapper: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  filterScroll: { paddingHorizontal: 15, paddingBottom: 12 },
  filterItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 10, borderWidth: 1, borderColor: '#DDD' },
  activeFilterItem: { backgroundColor: 'royalblue', borderColor: 'royalblue' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '600' },
  activeFilterText: { color: 'white' },

  listContainer: { padding: 15 },
  masterCard: { backgroundColor: 'white', borderRadius: 18, padding: 18, marginBottom: 20, elevation: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderIdText: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  dateText: { fontSize: 12, color: '#888' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginVertical: 10 },
  statusTag: { fontSize: 11, fontWeight: 'bold' },
  infoSection: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 10, marginVertical: 5 },
  infoLabel: { fontSize: 11, color: '#888', fontWeight: 'bold', marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#444' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  totalLabel: { fontSize: 14, color: '#666' },
  masterTotal: { fontSize: 20, fontWeight: 'bold', color: 'royalblue' },
  masterActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  detailsBtn: { backgroundColor: '#F0F4FF', flex: 1, marginRight: 10, padding: 12, borderRadius: 12, alignItems: 'center' },
  detailsBtnText: { color: 'royalblue', fontWeight: 'bold' },
  fullCancelBtn: { backgroundColor: '#FFEBEE', flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  fullCancelBtnText: { color: '#D32F2F', fontWeight: 'bold' },

  detailContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { fontSize: 16, color: 'royalblue', fontWeight: 'bold' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },

  // ✅ New Item Card styles
  itemCard: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#222', flex: 1 },
  itemPrice: { fontSize: 13, color: '#666', marginLeft: 8 },
  itemSubText: { fontSize: 12, color: '#666', marginTop: 4 },
  itemStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, marginBottom: 10 },
  itemStatusText: { fontSize: 11, fontWeight: 'bold' },

  // ⭐ Star Rating Row
  starRatingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDF5', borderWidth: 1, borderColor: '#FFE082', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10, alignSelf: 'flex-start' },
  ratingValue: { fontSize: 13, fontWeight: 'bold', color: '#333', marginLeft: 5 },
  reviewCount: { fontSize: 12, color: '#888', marginLeft: 4 },

  // Action Buttons
  itemActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  actionBtnText: { fontSize: 12, fontWeight: 'bold' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  qtyBox: { backgroundColor: 'white', width: '80%', padding: 25, borderRadius: 20, alignItems: 'center' },
  qtyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  counter: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  counterOp: { fontSize: 35, color: 'royalblue', fontWeight: 'bold', paddingHorizontal: 20 },
  counterVal: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  saveBtn: { backgroundColor: 'royalblue', width: '100%', padding: 15, borderRadius: 12, alignItems: 'center' },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  editBtn: { backgroundColor: '#E3F2FD', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  editBtnText: { color: '#1976D2', fontSize: 11, fontWeight: 'bold' },
});

export default Orderstatus;