import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Text, FlatList, SafeAreaView, StatusBar, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

const Manageorder = () => {
    const { User } = useContext(UserContext);
    const [stations, setStations] = useState([]);
    const [selectedStationId, setSelectedStationId] = useState(null);
    const [loading, setloading] = useState(false);
    const [orders, setOrders] = useState([]);
    
    const [statusFilter, setStatusFilter] = useState('Pending'); 
    const [showDropdown, setShowDropdown] = useState(false);
    const statusOptions = ['Pending', 'Accepted', 'Rejected'];

    // 🌟 Server Base URL generate kiya (e.g., http://192.168.1.100:port)
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
                setStations(result.data);
                if (result.data.length > 0) {
                    const firstId = result.data[0].stationId;
                    setSelectedStationId(firstId);
                    fetchStationOrders(firstId); 
                }
            }
        } catch (error) {
            Alert.alert("Error", "Stations loading failed.");
        } finally {
            setloading(false);
        }
    };

    const fetchStationOrders = async (stationId) => {
        try {
            setloading(true);
            const response = await fetch(`${BASE_URL}/Station/GetOrdersByStation/${stationId}`);
            const result = await response.json();
            if (result.status === "success") {
                setOrders(result.data);
            } else if (result.status === "empty") {
                setOrders([]); 
            }
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setloading(false);
        }
    };

    const handleStationPress = (id) => {
        setSelectedStationId(id);
        fetchStationOrders(id);
    };
   
    const updateStatusOnBackend = async (type, itemId) => {
        try {
            setloading(true);
            const url = `${BASE_URL}/Station/updateitemstatus?orderItemId=${itemId}&newStatus=${type}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();

            if (response.ok && result.status === "success") {
                Alert.alert(
                    "Order Updated", 
                    `Item status changed to ${type}.`,
                    [{ text: "OK", onPress: () => fetchStationOrders(selectedStationId) }] 
                );
            } else {
                Alert.alert("Process Failed", result.message || "Could not update status.");
            }
        } catch (error) {
            Alert.alert("Network Error", "Unable to connect to server.");
        } finally {
            setloading(false);
        }
    };

    // --- DIRECT FILTER LOGIC ---
    const filteredData = orders.filter(item => item.status === statusFilter);

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

    const renderItem = ({ item }) => {
        // 🌟 Casing check aur Product Image ka accurate url builder
        const imgName = item.imagepath || item.Imagepath;
        
        let finalImageUri = null;
        if (imgName) {
            // Agar database mein pehle se 'product_images' folder ka naam likha hua aa raha hai
            if (imgName.includes('product_images')) {
                const cleanPath = imgName.startsWith('/') ? imgName : `/${imgName}`;
                finalImageUri = `${serverUrl}${cleanPath}`;
            } else {
                // Agar DB mein sirf filename hai (e.g. "engine_oil.jpg"), toh path khud attach karein
                const cleanName = imgName.startsWith('/') ? imgName.substring(1) : imgName;
                finalImageUri = `${serverUrl}/product_images/${cleanName}`;
            }
        }

        return (
            <View style={styles.card}>
                <View style={styles.topRow}>
                    <View style={[styles.newBadge, { 
                        backgroundColor: item.status === 'Accepted' ? '#4CAF50' : 
                                         item.status === 'Rejected' ? '#F44336' : '#2196F3' 
                    }]}>
                        <Text style={styles.newBadgeText}>{item.status}</Text>
                    </View>
                    <Text style={styles.totalBillText}>{item.total} PKR</Text>
                </View>

                <View style={styles.productRow}>
                    {/* 🌟 Dynamic Image rendering with safe path checking */}
                    {finalImageUri ? (
                        <Image 
                            source={{ uri: finalImageUri }} 
                            style={styles.productImg} 
                            onError={(e) => console.log("Product Image Failed to Load from:", finalImageUri)}
                        />
                    ) : (
                        <View style={[styles.productImg, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }]}>
                            <Text style={{ fontSize: 24 }}>📦</Text>
                        </View>
                    )}
                    
                    <View style={styles.productContent}>
                        <Text style={styles.productName}>{item.productName}</Text>
                        <Text style={styles.priceInfo}>{item.price} PKR x {item.qty}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailSection}>
                    <View style={styles.infoLine}><Text style={styles.labelIcon}>👤</Text><Text style={styles.valueText}>{item.customerName}</Text></View>
                    <View style={styles.infoLine}><Text style={styles.labelIcon}>📞</Text><Text style={styles.valueText}>{item.contactNumber}</Text></View>
                    <View style={styles.infoLine}><Text style={styles.labelIcon}>🏡</Text><Text style={styles.valueText} numberOfLines={2}>{item.address}</Text></View>
                </View>

                {item.status === 'Pending' && (
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => updateStatusOnBackend('Rejected', item.orderItemId)}>
                            <Text style={styles.btnText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => updateStatusOnBackend('Accepted', item.orderItemId)}>
                            <Text style={styles.btnText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Manage Station Orders</Text>
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

            <View style={styles.filterContainer}>
                <Text style={styles.filterLabel}>Select Order Status:</Text>
                <TouchableOpacity 
                    style={styles.dropdownHeader} 
                    onPress={() => setShowDropdown(!showDropdown)}
                >
                    <Text style={styles.dropdownHeaderText}>{statusFilter}</Text>
                    <Text style={{fontSize: 12, color: '#666'}}>{showDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showDropdown && (
                    <View style={styles.dropdownList}>
                        {statusOptions.map((opt) => (
                            <TouchableOpacity 
                                key={opt} 
                                style={styles.dropdownItem}
                                onPress={() => { setStatusFilter(opt); setShowDropdown(false); }}
                            >
                                <Text style={[styles.itemText, statusFilter === opt && { color: 'royalblue', fontWeight: 'bold' }]}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {loading && orders.length === 0 ? (
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color="deepskyblue" />
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={{alignItems: 'center', marginTop: 40}}>
                            <Text style={styles.emptyText}>No {statusFilter} orders found.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { paddingTop: 20, paddingBottom: 10, backgroundColor: 'white', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'black' },
    stationListWrapper: { paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
    chip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 10, borderWidth: 1, borderColor: '#eee' },
    selectedChip: { backgroundColor: '#000', borderColor: '#000' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#777' },
    whiteText: { color: 'white' },
    filterContainer: { paddingHorizontal: 15, paddingVertical: 10, zIndex: 2000 },
    filterLabel: { fontSize: 12, color: '#666', marginBottom: 5, marginLeft: 5 },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#eee' },
    dropdownHeaderText: { fontWeight: 'bold', color: '#333' },
    dropdownList: { position: 'absolute', top: 75, left: 15, right: 15, backgroundColor: 'white', borderRadius: 10, elevation: 5, zIndex: 3000, borderWidth: 1, borderColor: '#eee' },
    dropdownItem: { padding: 15, borderBottomWidth: 0.5, borderColor: '#eee' },
    itemText: { fontSize: 14 },
    listContainer: { padding: 15, paddingBottom: 80 },
    card: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 20, elevation: 3 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    newBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
    newBadgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
    totalBillText: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
    productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    productImg: { width: 65, height: 65, borderRadius: 12, backgroundColor: '#f0f0f0' },
    productContent: { marginLeft: 15, flex: 1 },
    productName: { fontSize: 16, fontWeight: 'bold', color: 'black' },
    priceInfo: { fontSize: 13, color: 'grey', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
    detailSection: { marginBottom: 15 },
    infoLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    labelIcon: { marginRight: 10, fontSize: 16 },
    valueText: { fontSize: 14, color: '#444', flex: 1 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    btn: { flex: 0.48, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    rejectBtn: { backgroundColor: '#FF5252' },
    acceptBtn: { backgroundColor: '#4CAF50' },
    btnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { textAlign: 'center', color: 'gray', fontSize: 15 }
});

export default Manageorder;