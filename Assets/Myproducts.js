import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, 
  StatusBar, TouchableOpacity, Image, Dimensions, Alert 
} from 'react-native';
const { width } = Dimensions.get('window');
import { BASE_URL } from "./Constants";
import { UserContext } from "./UserContext";

const Myproducts = ({ navigation }) => {
  const { User, setproductdata,setproductidforreview } = useContext(UserContext);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [stations, setstations] = useState([]);
  const [products, setproducts] = useState([]);
  const [loading, setloading] = useState(false);
  const [loadingproduct, setloadingproduct] = useState(false);

  const serverUrl = BASE_URL.replace('/api', '');

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      setloading(true);
      const response = await fetch(`${BASE_URL}/Station/getstationlist/${User?.id}`);
      const result = await response.json();
      if (result.status === "success") {
        setstations(result.data);
        if (result.data.length > 0) {
          const firstId = result.data[0].stationId;
          setSelectedStationId(firstId);
          fetchProducts(firstId);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Stations loading failed. Please check connection.");
    } finally {
      setloading(false);
    }
  };

  const fetchProducts = async (stationId) => {
    try {
      setloadingproduct(true);
      const response = await fetch(`${BASE_URL}/Station/getproductsbystation/${stationId}`);
      const results = await response.json();

      if (results.status === "success") {
        setproducts(results.data);
        console.log(results.data)
      } else {
        setproducts([]);
      }
    } catch (error) {
      console.log("Products Loading Error:", error);
      setproducts([]);
    } finally {
      setloadingproduct(false);
    }
  };

  const handleStationPress = (id) => {
    setSelectedStationId(id);
    fetchProducts(id);
  };

  const DeleteProduct = (Id) => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to permanently delete this product?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => handleDeleteProduct(Id) 
        }
      ]
    );
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const response = await fetch(`${BASE_URL}/Station/deleteproduct/${productId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.status === "success") {
        Alert.alert("Deleted", "Product has been removed.");
        fetchProducts(selectedStationId);
      } else {
        Alert.alert("Error", result.message || "Failed to delete");
      }
    } catch (error) {
      Alert.alert("Error", "Server connection failed");
    }
  };

  const renderStationChip = ({ item }) => {
    const isSelected = item.stationId === selectedStationId;
    return (
      <TouchableOpacity
        style={[styles.chip, isSelected && styles.selectedChip]}
        onPress={() => handleStationPress(item.stationId)}
      >
        <Text style={[styles.chipText, isSelected && styles.whiteText]}>
          {item.stationName}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProductItem = ({ item }) => {
    const imageUrl = item.imagepath 
      ? (item.imagepath.startsWith('http') 
          ? item.imagepath 
          : `${serverUrl}/product_images/${item.imagepath}`)
      : null;

    // Robust discount detection: check flag AND compare prices
    const origPrice = item.OriginalPrice ?? item.originalPrice ?? item.price;
    const finalPrice = item.FinalPrice ?? item.finalPrice;
    const hasDisc = !!(item.HasDiscount || item.hasDiscount) || (finalPrice > 0 && finalPrice < origPrice);
    const label = item.DiscountLabel || item.discountLabel || 'OFFER';

    return (
      <TouchableOpacity 
        style={styles.productCard} 
        activeOpacity={0.9}
        onPress={() => {
          setproductdata(item);
          navigation.navigate('updateproduct');
        }}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.noImagePlaceholder}><Text style={styles.noImageText}>No Image</Text></View>
          )}
          
          {/* Status Badge (Left) */}
          <View style={[styles.statusBadge, { backgroundColor: item.quantity > 0 ? '#4CAF50' : '#F44336' }]}>
            <Text style={styles.statusText}>{item.quantity > 0 ? 'In Stock' : 'Sold Out'}</Text>
          </View>

          {/* Rating Badge Button (Right Side - Black Background) */}
          <TouchableOpacity 
            style={styles.ratingBadge}
            onPress={() => { setproductidforreview(item.productId); navigation.navigate('showproductreview'); }}
          >
            <Text style={styles.ratingText}>⭐ {item.averageRating  || 0}({item.totalReviews})</Text>
          </TouchableOpacity>

          {/* Discount Badge (Bottom Right over Image) */}
          {hasDisc && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{label}</Text>
            </View>
          )}
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
          
          <View style={styles.priceContainer}>
            {hasDisc ? (
              <>
                <Text style={styles.originalPriceText}>
                  {origPrice}
                </Text>
                <Text style={styles.discountedPriceText}>
                  {finalPrice} <Text style={styles.currency}>PKR</Text>
                </Text>
              </>
            ) : (
              <Text style={styles.productPrice}>
                {origPrice} <Text style={styles.currency}>PKR</Text>
              </Text>
            )}
          </View>
          
          <View style={styles.footerRow}>
            <Text style={styles.qtyText}>Qty: {item.quantity}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity 
                onPress={() => {
                  setproductdata(item); 
                  navigation.navigate('updateproduct');
                }}
              >
                <Text style={styles.icon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => DeleteProduct(item.productId)}>
                <Text style={styles.icon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="deepskyblue" />
        <Text style={styles.loaderText}>Fetching Inventory...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
      </View>

      <View style={styles.stationListWrapper}>
        <FlatList
          horizontal
          data={stations}
          renderItem={renderStationChip}
          keyExtractor={(item) => item.stationId.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 15 }}
        />
      </View>

      {loadingproduct ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="deepskyblue" />
          <Text style={styles.loadingText}>Loading Products...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={item => item.productId.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
                <Text style={styles.emptyText}>No products found for this station.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  header: { 
    padding: 20, backgroundColor: 'white', 
    borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  stationListWrapper: { paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  chip: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f5f5f5', marginRight: 10, borderWidth: 1, borderColor: '#eee'
  },
  selectedChip: { backgroundColor: 'deepskyblue', borderColor: 'deepskyblue' },
  chipText: { fontWeight: '600', color: '#777', fontSize: 13 },
  whiteText: { color: 'white' },
  listContent: { padding: 12, paddingBottom: 30 },
  columnWrapper: { justifyContent: 'space-between' },
  productCard: { 
    backgroundColor: 'white', width: (width / 2) - 18, borderRadius: 15, 
    marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
  },
  imageContainer: { width: '100%', height: 130, backgroundColor: '#f9f9f9', borderTopLeftRadius: 15, borderTopRightRadius: 15, overflow: 'hidden' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  noImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee' },
  noImageText: { fontSize: 10, color: '#aaa' },
  statusBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  ratingBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'black', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  statusText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  ratingText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  contentContainer: { padding: 10 },
  productName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  productPrice: { fontSize: 13, color: 'deepskyblue', fontWeight: 'bold', marginVertical: 4 },
  footerRow: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, borderTopWidth: 1, borderColor: '#f5f5f5', paddingTop: 8
  },
  qtyText: { fontSize: 11, color: '#999' },
  actionRow: { flexDirection: 'row', gap: 15 },
  icon: { fontSize: 16 },
  loaderText: { marginTop: 10, color: 'gray', fontWeight: 'bold' },
  loadingText: { marginTop: 10, color: 'gray' },
  emptyText: { color: '#bbb', fontSize: 14 },
  
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
  originalPriceText: { fontSize: 11, color: '#999', textDecorationLine: 'line-through' },
  discountedPriceText: { fontSize: 13, color: '#e53935', fontWeight: 'bold' },
  currency: { fontSize: 10, fontWeight: 'normal' },
  discountBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#e53935', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountBadgeText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
});

export default Myproducts;