import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView,
  Modal, ScrollView, ActivityIndicator, Image, Alert, StatusBar, TextInput
} from 'react-native';
import { BASE_URL } from "./Constants";
import { UserContext } from "./UserContext";

const Marketplace = ({ navigation }) => {
  const { setproductidforreview, cartid } = useContext(UserContext);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setloading] = useState(false);
  const [sortOrder, setSortOrder] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchMode, setSearchMode] = useState('product'); // 'product' or 'station'

  const serverUrl = BASE_URL.replace('/api', '');

  useEffect(() => {
    fetchAllProducts();
  }, []);

  const fetchAllProducts = async () => {
    try {
      setloading(true);
      const url = `${BASE_URL}/Customer/getallproducts`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.status === "success") {
        // DEBUG: Check exact field names from API
        console.log('=== RAW API RESPONSE (first item) ===', JSON.stringify(result.data[0], null, 2));
        const dataWithStockLogic = result.data.map(item => ({
          ...item,
          stockQuantity: item.quantity,
          selectedQty: 0
        }));
        setProducts(dataWithStockLogic);
        setFilteredProducts(dataWithStockLogic);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setloading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFiltersAndSort(text, sortOrder, inStockOnly, searchMode);
  };

  const applyFiltersAndSort = (query, order, stockFilter, mode) => {
    let updatedList = [...products];

    // 1. Search Filter
    if (query.trim().length > 0) {
      if (mode === 'product') {
        updatedList = updatedList.filter(item =>
          item.productName.toLowerCase().includes(query.toLowerCase())
        );
      } else {
        updatedList = updatedList.filter(item =>
          item.stationName && item.stationName.toLowerCase().includes(query.toLowerCase())
        );
      }
    }

    // 2. In-Stock Filter
    if (stockFilter) {
      updatedList = updatedList.filter(item => item.stockQuantity > 0);
    }

    // 3. Sorting
    if (order === 'lowToHigh') updatedList.sort((a, b) => (a.finalPrice ?? a.originalPrice) - (b.finalPrice ?? b.originalPrice));
    else if (order === 'highToLow') updatedList.sort((a, b) => (b.finalPrice ?? b.originalPrice) - (a.finalPrice ?? a.originalPrice));
    else if (order === 'topRated') updatedList.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));

    setFilteredProducts(updatedList);
  };

  const toggleSearchMode = (mode) => {
    setSearchMode(mode);
    setSearchQuery('');
    applyFiltersAndSort('', sortOrder, inStockOnly, mode);
  };

  const applySort = (order) => {
    setSortOrder(order === 'reset' ? null : order);
    setShowFilterModal(false);
    applyFiltersAndSort(searchQuery, order === 'reset' ? null : order, inStockOnly, searchMode);
  };

  const updateQuantity = (productId, type) => {
    const update = (list) => list.map(item => {
      if (item.productId === productId) {
        if (type === 'add') {
          if (item.selectedQty < item.stockQuantity) return { ...item, selectedQty: item.selectedQty + 1 };
          else { Alert.alert("Out of Stock", "Limit reached."); return item; }
        } else return { ...item, selectedQty: Math.max(0, item.selectedQty - 1) };
      }
      return item;
    });
    setProducts(prev => update(prev));
    setFilteredProducts(prev => update(prev));
  };

  const addToCart = async (productId, quantity) => {
    try {
      const response = await fetch(`${BASE_URL}/Customer/addtocart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CartId: cartid, ProductId: productId, Quantity: quantity }),
      });
      const result = await response.json();
      if (result.status === "success") {
        Alert.alert("Success", result.message);
        const resetQuantity = (list) =>
          list.map(item =>
            item.productId === productId ? { ...item, selectedQty: 0 } : item
          );

        setProducts(prev => resetQuantity(prev));
        setFilteredProducts(prev => resetQuantity(prev));

      }

      else Alert.alert("Error", result.message);
    } catch (error) { Alert.alert("Error", "Server error"); }
  };

  const renderProduct = ({ item }) => {
    const imageUrl = item.imagepath
      ? (item.imagepath.startsWith('http') ? item.imagepath : `${serverUrl}/product_images/${item.imagepath}`)
      : 'https://via.placeholder.com/150';
    const isInStock      = item.stockQuantity > 0;

    // Handle both camelCase and PascalCase — also handles 1/"true"/true
    const hasDiscount    = !!(item.hasDiscount  || item.HasDiscount);
    const originalPrice  = item.originalPrice  ?? item.OriginalPrice  ?? item.price ?? 0;
    const finalPrice     = item.finalPrice     ?? item.FinalPrice     ?? originalPrice;
    const discountLabel  = item.discountLabel  || item.DiscountLabel  || 'SALE';
    const displayPrice   = hasDiscount ? finalPrice : originalPrice;

    // DEBUG — remove after confirming fields
    if (__DEV__) console.log('[Product]', item.productName, { hasDiscount, originalPrice, finalPrice, discountLabel, raw_hasDiscount: item.hasDiscount ?? item.HasDiscount });

    return (
      <View style={styles.productCard}>
        <TouchableOpacity style={styles.imageContainer} onPress={() => setSelectedProduct(item)}>
          <Image source={{ uri: imageUrl }} style={[styles.productImage, !isInStock && { opacity: 0.5 }]} resizeMode="cover" />
          
          {/* Stock Badge */}
          <View style={[styles.stockBadge, { backgroundColor: isInStock ? '#4CAF50' : '#F44336' }]}>
            <Text style={styles.stockText}>{isInStock ? 'In Stock' : 'Out of Stock'}</Text>
          </View>

          {/* Discount Badge */}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{discountLabel}</Text>
            </View>
          )}

          <View style={styles.starBadge}>
            <Text style={{ color: '#FFD700', fontSize: 10 }}>★ </Text>
            <Text style={styles.starText}>{Number(item.averageRating || 0).toFixed(1)}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
        <Text style={styles.stationLabel}>📍 {item.stationName || 'N/A'}</Text>

        {/* Price Row */}
        <View style={styles.priceRow}>
          {hasDiscount && (
            <Text style={styles.originalPrice}>RS {item.originalPrice}</Text>
          )}
          <Text style={[styles.productPrice, hasDiscount && styles.discountedPrice]}>
            RS {Math.round(displayPrice)}
          </Text>
        </View>

        {/* View Details Button Dubara Add Kar Diya */}
        {/* <TouchableOpacity style={styles.detailLink} onPress={() => setSelectedProduct(item)}>
          <Text style={styles.detailLinkText}>View Details</Text>
        </TouchableOpacity> */}

        <View style={styles.counterRow}>
          <TouchableOpacity style={styles.countBtn} onPress={() => updateQuantity(item.productId, 'sub')} disabled={!isInStock}>
            <Text style={styles.countText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.selectedQty}</Text>
          <TouchableOpacity style={styles.countBtn} onPress={() => updateQuantity(item.productId, 'add')} disabled={!isInStock}>
            <Text style={styles.countText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addToCartBtn, (!isInStock || item.selectedQty === 0) && { backgroundColor: '#555' }]}
          onPress={() => item.selectedQty > 0 ? addToCart(item.productId, item.selectedQty) : Alert.alert("Wait", "Select quantity")}
          disabled={!isInStock}
        >
          <Text style={styles.cartBtnText}>Add to cart</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>

        {/* <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, searchMode === 'product' && styles.toggleBtnActive]}
            onPress={() => toggleSearchMode('product')}
          >
            <Text style={[styles.toggleText, searchMode === 'product' && styles.toggleTextActive]}>By Product</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, searchMode === 'station' && styles.toggleBtnActive]}
            onPress={() => toggleSearchMode('station')}
          >
            <Text style={[styles.toggleText, searchMode === 'station' && styles.toggleTextActive]}>By Station</Text>
          </TouchableOpacity>
        </View> */}

        <View style={styles.searchRow}>
          <View style={styles.searchSection}>
            <TextInput
              style={styles.searchBar}
              placeholderTextColor="grey"
              placeholder={searchMode === 'product' ? "Search Product..." : "Search Station..."}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
          {/* <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Text style={styles.filterBtnText}>Filter ▽</Text>
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Filter Modal */}
      <Modal transparent visible={showFilterModal} animationType="fade">
        <TouchableOpacity style={styles.modalBlurOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownTitle}>Filters</Text>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setInStockOnly(!inStockOnly); applyFiltersAndSort(searchQuery, sortOrder, !inStockOnly, searchMode); setShowFilterModal(false); }}>
              <Text style={[styles.dropdownText, inStockOnly && { color: 'royalblue', fontWeight: 'bold' }]}>
                {inStockOnly ? '✓ In-Stock Only' : 'Show In-Stock Only'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.dropdownTitle}>Sort By</Text>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => applySort('topRated')}><Text style={styles.dropdownText}>⭐ Top Rated</Text></TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => applySort('lowToHigh')}><Text style={styles.dropdownText}>Price: Low to High</Text></TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => applySort('highToLow')}><Text style={styles.dropdownText}>Price: High to Low</Text></TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => applySort('reset')}><Text style={styles.dropdownText}>Default</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Product Detail Modal */}
      <Modal visible={selectedProduct !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Product Detail</Text>
              <TouchableOpacity onPress={() => setSelectedProduct(null)}><Text style={{ fontSize: 20 }}>✕</Text></TouchableOpacity>
            </View>
            {selectedProduct && (
              <ScrollView>
                <Image source={{ uri: selectedProduct.imagepath?.startsWith('http') ? selectedProduct.imagepath : `${serverUrl}/product_images/${selectedProduct.imagepath}` }} style={styles.modalImage} />
                <Text style={styles.modalProductName}>{selectedProduct.productName}</Text>
                {/* Discount Tag */}
                {(() => {
                  const sp = selectedProduct;
                  const spHasDiscount   = sp.hasDiscount === true || sp.HasDiscount === true;
                  const spOriginalPrice = sp.originalPrice ?? sp.OriginalPrice ?? sp.price ?? 0;
                  const spFinalPrice    = sp.finalPrice    ?? sp.FinalPrice    ?? spOriginalPrice;
                  const spDiscountLabel = sp.discountLabel || sp.DiscountLabel;
                  return (
                    <>
                      {spHasDiscount && spDiscountLabel ? (
                        <View style={styles.modalDiscountTag}>
                          <Text style={styles.modalDiscountTagText}>{spDiscountLabel}</Text>
                        </View>
                      ) : null}
                      <View style={styles.modalPriceRow}>
                        {spHasDiscount && (
                          <Text style={styles.modalOriginalPrice}>RS {spOriginalPrice}</Text>
                        )}
                        <Text style={[styles.modalProductPrice, spHasDiscount && { color: '#e53935' }]}>
                          RS {Math.round(spHasDiscount ? spFinalPrice : spOriginalPrice)}
                        </Text>
                      </View>
                    </>
                  );
                })()}
                <Text style={styles.modalDescTitle}>Description:</Text>
                <Text style={styles.modalDescText}>{selectedProduct.productDescription || "No description."}</Text>
                <TouchableOpacity style={styles.viewRatingBtn} onPress={() => { setproductidforreview(selectedProduct.productId); setSelectedProduct(null); navigation.navigate('showproductreview'); }}>
                  <Text style={styles.viewRatingText}>View Ratings & Reviews</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedProduct(null)}>
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {loading ? <ActivityIndicator size="large" color="royalblue" style={{ marginTop: 50 }} /> : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.productId.toString()}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.bigCartBtn} onPress={() => navigation.navigate('Viewcart')}>
          <Text style={styles.bigCartText}>View Your Cart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'ghostwhite' },
  header: { padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 8, padding: 3, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: 'white', elevation: 2 },
  toggleText: { fontSize: 12, color: '#666' },
  toggleTextActive: { color: 'royalblue', fontWeight: 'bold' },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchSection: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 10, marginRight: 10 },
  searchBar: { height: 40 },
  filterBtn: { padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 10 },
  filterBtnText: { fontSize: 12 },
  modalBlurOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  dropdownMenu: { marginTop: 120, marginRight: 20, width: 180, backgroundColor: 'white', borderRadius: 12, padding: 10, elevation: 5 },
  dropdownTitle: { fontSize: 11, fontWeight: 'bold', color: '#999', marginBottom: 5, marginTop: 5 },
  dropdownItem: { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  dropdownText: { fontSize: 14, color: '#333' },
  listContainer: { padding: 10, paddingBottom: 100 },
  productCard: { backgroundColor: 'white', borderRadius: 15, padding: 12, margin: 8, flex: 1, elevation: 3 },
  imageContainer: { width: '100%', height: 110, borderRadius: 10, overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  stockBadge: { position: 'absolute', top: 5, left: 5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, zIndex: 1 },
  stockText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  starBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 8, flexDirection: 'row' },
  starText: { color: 'white', fontSize: 10 },
  productName: { fontSize: 14, fontWeight: 'bold', marginTop: 5 },
  stationLabel: { fontSize: 10, color: 'grey' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  originalPrice: { fontSize: 11, color: '#999', textDecorationLine: 'line-through' },
  productPrice: { fontSize: 13, color: 'royalblue', fontWeight: 'bold' },
  discountedPrice: { color: '#e53935' },
  discountBadge: { position: 'absolute', bottom: 5, left: 5, backgroundColor: '#e53935', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, zIndex: 1 },
  discountBadgeText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  detailLink: { marginVertical: 5 },
  detailLinkText: { fontSize: 11, color: 'grey', textDecorationLine: 'underline' },
  counterRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  countBtn: { width: 25, height: 25, backgroundColor: '#eee', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  countText: { fontWeight: 'bold' },
  qtyText: { marginHorizontal: 10 },
  addToCartBtn: { backgroundColor: 'black', padding: 8, borderRadius: 10, marginTop: 5 },
  cartBtnText: { color: 'white', textAlign: 'center', fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalImage: { width: '100%', height: 200, borderRadius: 15, marginBottom: 10 },
  modalProductName: { fontSize: 18, fontWeight: 'bold' },
  modalProductPrice: { fontSize: 16, color: 'royalblue', fontWeight: 'bold' },
  modalPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  modalOriginalPrice: { fontSize: 14, color: '#999', textDecorationLine: 'line-through' },
  modalDiscountTag: { alignSelf: 'flex-start', backgroundColor: '#e53935', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  modalDiscountTagText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  modalDescTitle: { fontWeight: 'bold', marginTop: 10 },
  modalDescText: { color: '#666', marginBottom: 10 },
  viewRatingBtn: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10, alignItems: 'center' },
  viewRatingText: { color: 'royalblue', fontWeight: 'bold' },
  modalCloseBtn: { backgroundColor: 'black', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  modalCloseBtnText: { color: 'white' },
  bottomButtonContainer: { position: 'absolute', bottom: 0, width: '100%', padding: 15, backgroundColor: 'white' },
  bigCartBtn: { backgroundColor: 'royalblue', padding: 15, borderRadius: 15, alignItems: 'center' },
  bigCartText: { color: 'white', fontWeight: 'bold' },
});

export default Marketplace;