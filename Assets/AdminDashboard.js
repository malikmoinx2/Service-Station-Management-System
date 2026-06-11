import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, SafeAreaView, StatusBar, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './Constants';
import { UserContext } from './UserContext';

const C = {
  bg: '#0F1117', card: '#1A1D27', border: '#2A2D3E',
  accent: '#6C63FF', accentL: '#8B85FF',
  green: '#00D4AA', orange: '#FF8C42', red: '#FF5B5B',
  yellow: '#FFD166', blue: '#4FACFE',
  text: '#FFFFFF', sub: '#A0A3BD', muted: '#5C5F7A',
};

const sColor = s => {
  switch ((s || '').toLowerCase()) {
    case 'done': case 'accepted': return C.green;
    case 'confirmed': return C.blue;
    case 'pending': return C.yellow;
    case 'cancelled': return C.red;
    default: return C.sub;
  }
};

// Case-insensitive safe helper to query keys from objects returned by API
const v = (obj, key, fallback = null) => {
  if (!obj) return fallback;
  const lowerKey = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lowerKey) {
      return obj[k] ?? fallback;
    }
  }
  return fallback;
};

const Badge = ({ label, color }) => (
  <View style={[st.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
    <Text style={[st.badgeT, { color }]}>{label}</Text>
  </View>
);

const Row = ({ label, value, color }) => (
  <View style={st.row}>
    <Text style={st.rowL}>{label}</Text>
    <Text style={[st.rowV, color ? { color } : null]}>{value ?? '—'}</Text>
  </View>
);

const Divider = () => <View style={st.divider} />;

const SectionHeader = ({ title, sub }) => (
  <View style={st.secHdr}>
    <Text style={st.secTitle}>{title}</Text>
    {sub ? <Text style={st.secSub}>{sub}</Text> : null}
  </View>
);

const StatCard = ({ label, value, color, icon }) => (
  <View style={[st.statCard, { borderLeftColor: color }]}>
    <Text style={st.statIcon}>{icon}</Text>
    <Text style={[st.statVal, { color }]}>{value ?? 0}</Text>
    <Text style={st.statLbl}>{label}</Text>
  </View>
);

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminDashboard({ navigation }) {
  const { User, setUser } = useContext(UserContext);
  const [asyncUser, setAsyncUser] = useState(null);

  const [activeRole, setActiveRole] = useState('StationOwner');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Modals state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailData, setDetailData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailType, setDetailType] = useState(''); // 'services' | 'bays' | 'products' | 'oils' | 'filters'

  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Load real user details from AsyncStorage on mount
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw) {
          setAsyncUser(JSON.parse(raw));
        }
      } catch (err) {
        console.log("AsyncStorage read error:", err);
      }
    };
    loadUserFromStorage();
  }, []);

  // Compute active real user properties
  const displayName = User?.name || asyncUser?.name || 'System Admin';
  const displayEmail = User?.email || asyncUser?.email || 'admin@serviceacar.com';
  const displayContact = User?.contact || asyncUser?.contact || '—';
  const firstLetter = displayName[0]?.toUpperCase() || 'A';

  const fetchData = useCallback(async (role, isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/Admin/dashboard?role=${role}`);
      const json = await res.json();
      if (json.status === 'success') setData(json);
      else Alert.alert('Error', json.message || 'Failed to load');
    } catch {
      Alert.alert('Connection Error', 'Could not reach server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setData(null);
    setActiveTab('summary');
    fetchData(activeRole);
  }, [activeRole]);

  // Fetch Section Details dynamically on click
  const handleOpenSection = async (stationId, stationName, type) => {
    if (!stationId) {
      Alert.alert('Error', 'Invalid Station ID passed: ' + stationId);
      return;
    }

    setDetailType(type);
    setDetailTitle(`${stationName} - ${type.toUpperCase()}`);
    setDetailModalVisible(true);
    setDetailLoading(true);
    setDetailData([]);

    try {
      const url = `${BASE_URL}/Admin/station-section?stationId=${stationId}&section=${type}`;
      const res = await fetch(url);
      const json = await res.json();
      
      if (json.status === 'success') {
        const fetchedItems = json.data || [];
        setDetailData(fetchedItems);
      } else {
        Alert.alert('API Error', json.message || 'Failed to load details');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Could not fetch details. Please check your backend connection.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLogout = () => {
    setProfileModalVisible(false);
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            setUser(null);
            navigation.replace('Login');
          } catch (err) {
            navigation.replace('Login');
          }
        }, 
        style: "destructive" 
      }
    ]);
  };

  // ── Owner Card ─────────────────────────────────────────────────────────────
  const OwnerCard = ({ item: o }) => (
    <View style={st.card}>
      <View style={st.cardHead}>
        <View style={st.avatar}><Text style={st.avatarT}>{(v(o, 'ownerName') || 'O')[0].toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.cardName}>{v(o, 'ownerName')}</Text>
          <Text style={st.cardSub}>{v(o, 'email')}</Text>
          {v(o, 'contact') ? <Text style={st.cardSub}>📞 {v(o, 'contact')}</Text> : null}
        </View>
        <View style={st.greenPill}><Text style={st.greenPillT}>Rs {Number(v(o, 'totalRevenue', 0)).toLocaleString()}</Text></View>
      </View>
      <Divider />
      <Row label="Stations" value={v(o, 'stationCount')} />
      <Row label="Services" value={v(o, 'serviceCount')} />
      <Row label="Bays" value={v(o, 'bayCount')} />
      <Row label="Products" value={v(o, 'productCount')} />
      <Divider />
      <Row label="Total Bookings" value={v(o, 'totalBookings')} />
      <Row label="Done" value={v(o, 'doneBookings')} color={C.green} />
      <Row label="Confirmed" value={v(o, 'confirmedBookings')} color={C.blue} />
      <Row label="Pending" value={v(o, 'pendingBookings')} color={C.yellow} />
      <Row label="Cancelled" value={v(o, 'cancelledBookings')} color={C.red} />
    </View>
  );

  // ── Station Card ───────────────────────────────────────────────────────────
  const StationCard = ({ item: s }) => {
    const sId = v(s, 'stationId') || v(s, 'stationid');
    const sName = v(s, 'stationName') || v(s, 'stationname');
    const ownerName = v(s, 'ownerName');
    const address = v(s, 'address');
    const status = v(s, 'status');
    const contact = v(s, 'stationContact') || v(s, 'contact');
    const email = v(s, 'stationEmail') || v(s, 'email');
    const openingTime = v(s, 'openingTime') || v(s, 'opening_time');
    const closingTime = v(s, 'closingTime') || v(s, 'closing_time');

    const serviceRevenue = Number(v(s, 'serviceRevenue', 0));
    const productRevenue = Number(v(s, 'productRevenue', 0));
    const totalRevenue = serviceRevenue + productRevenue;

    return (
      <View style={st.card}>
        <View style={st.cardHead}>
          <View style={[st.avatar, { backgroundColor: C.orange + '33' }]}><Text style={{ fontSize: 22 }}>⛽</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={st.cardName}>{sName}</Text>
            <Text style={st.cardSub}>👤 {ownerName}</Text>
            <Text style={st.cardSub}>📍 {address}</Text>
          </View>
          <Badge label={status ? 'Active' : 'Inactive'} color={status ? C.green : C.red} />
        </View>
        
        <Divider />
        
        {contact ? <Row label="Contact" value={contact} /> : null}
        {email ? <Row label="Email" value={email} /> : null}
        <Row label="Opening Time" value={openingTime} />
        <Row label="Closing Time" value={closingTime} />

        <Divider />

        <Text style={st.gridTitle}>Manage Station Sections</Text>
        <View style={st.grid}>
          <TouchableOpacity style={st.gridItem} onPress={() => handleOpenSection(sId, sName, 'services')}>
            <Text style={st.gridIcon}>🔧</Text>
            <Text style={st.gridVal}>{v(s, 'serviceCount', 0)}</Text>
            <Text style={st.gridLbl}>Services</Text>
          </TouchableOpacity>

          <TouchableOpacity style={st.gridItem} onPress={() => handleOpenSection(sId, sName, 'bays')}>
            <Text style={st.gridIcon}>🏗️</Text>
            <Text style={st.gridVal}>{v(s, 'bayCount', 0)}</Text>
            <Text style={st.gridLbl}>Bays</Text>
          </TouchableOpacity>

          <TouchableOpacity style={st.gridItem} onPress={() => handleOpenSection(sId, sName, 'products')}>
            <Text style={st.gridIcon}>📦</Text>
            <Text style={st.gridVal}>{v(s, 'productCount', 0)}</Text>
            <Text style={st.gridLbl}>Products</Text>
          </TouchableOpacity>

          <TouchableOpacity style={st.gridItem} onPress={() => handleOpenSection(sId, sName, 'oils')}>
            <Text style={st.gridIcon}>🛢️</Text>
            <Text style={st.gridVal}>{v(s, 'oilCount', 0)}</Text>
            <Text style={st.gridLbl}>Oils</Text>
          </TouchableOpacity>

          <TouchableOpacity style={st.gridItem} onPress={() => handleOpenSection(sId, sName, 'filters')}>
            <Text style={st.gridIcon}>🌪️</Text>
            <Text style={st.gridVal}>{v(s, 'filterCount', 0)}</Text>
            <Text style={st.gridLbl}>Filters</Text>
          </TouchableOpacity>
        </View>

        <Divider />

        <Row label="Total Bookings" value={v(s, 'totalBookings')} />
        <Row label="Done" value={v(s, 'doneBookings')} color={C.green} />
        <Row label="Confirmed" value={v(s, 'confirmedBookings')} color={C.blue} />
        <Row label="Pending" value={v(s, 'pendingBookings')} color={C.yellow} />
        <Row label="Cancelled" value={v(s, 'cancelledBookings')} color={C.red} />

        <Divider />

        <Row label="Service Revenue" value={`Rs ${serviceRevenue.toLocaleString()}`} color={C.green} />
        <Row label="Product Revenue" value={`Rs ${productRevenue.toLocaleString()}`} color={C.blue} />
        <Row label="Total Revenue" value={`Rs ${totalRevenue.toLocaleString()}`} color={C.accent} />
        <Row label="Average Rating" value={`⭐ ${Number(v(s, 'averageRating', 0)).toFixed(1)}`} color={C.yellow} />
        <Row label="Total Reviews" value={v(s, 'totalReviews')} />
      </View>
    );
  };

  // ── Customer Card ───────────────────────────────────────────────────────────
  const CustomerCard = ({ item: c }) => (
    <View style={st.card}>
      <View style={st.cardHead}>
        <View style={[st.avatar, { backgroundColor: C.blue + '33' }]}><Text style={[st.avatarT, { color: C.blue }]}>{(v(c, 'customerName') || 'C')[0].toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.cardName}>{v(c, 'customerName')}</Text>
          <Text style={st.cardSub}>{v(c, 'email')}</Text>
          {v(c, 'contact') ? <Text style={st.cardSub}>📞 {v(c, 'contact')}</Text> : null}
        </View>
        <View style={st.greenPill}><Text style={st.greenPillT}>Rs {Number(v(c, 'totalSpentBookings', 0)).toLocaleString()}</Text></View>
      </View>
      <Divider />
      <Row label="Vehicles" value={v(c, 'vehicleCount')} />
      <Divider />
      <Row label="Total Bookings" value={v(c, 'totalBookings')} />
      <Row label="Done" value={v(c, 'doneBookings')} color={C.green} />
      <Row label="Confirmed" value={v(c, 'confirmedBookings')} color={C.blue} />
      <Row label="Pending" value={v(c, 'pendingBookings')} color={C.yellow} />
      <Row label="Cancelled" value={v(c, 'cancelledBookings')} color={C.red} />
      <Row label="Spent on Bookings" value={`Rs ${Number(v(c, 'totalSpentBookings', 0)).toLocaleString()}`} color={C.green} />
      <Divider />
      <Row label="Total Orders" value={v(c, 'totalOrders')} />
      <Row label="Spent on Orders" value={`Rs ${Number(v(c, 'totalSpentOrders', 0)).toLocaleString()}`} color={C.blue} />
      <Divider />
      <Row label="Booking Reviews" value={v(c, 'bookingReviews')} color={C.yellow} />
      <Row label="Service Reviews" value={v(c, 'serviceReviews')} color={C.orange} />
      <Row label="Product Reviews" value={v(c, 'productReviews')} color={C.accent} />
    </View>
  );

  // ── Booking Card ────────────────────────────────────────────────────────────
  const BookingCard = ({ item: b }) => (
    <View style={st.card}>
      <View style={st.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={st.cardName}>{v(b, 'customerName')}</Text>
          <Text style={st.cardSub}>ID #{v(b, 'bookingId')} · Customer #{v(b, 'customerId')}</Text>
        </View>
        <Badge label={v(b, 'status')} color={sColor(v(b, 'status'))} />
      </View>
      <Divider />
      <Row label="Station" value={`${v(b, 'stationName')} (#${v(b, 'stationId')})`} />
      <Row label="Bay" value={v(b, 'bayName')} />
      <Row label="Date" value={v(b, 'bookingDate')} />
      <Row label="Time" value={`${v(b, 'startTime')} → ${v(b, 'endTime')}`} />
      <Row label="Car Model" value={v(b, 'carModel')} />
      <Row label="Car Number" value={v(b, 'carNumber')} />
      <Row label="Total Amount" value={`Rs ${Number(v(b, 'totalAmount', 0)).toLocaleString()}`} color={C.green} />
      <Row label="Created At" value={v(b, 'createdAt')} color={C.muted} />
    </View>
  );

  // ── Order Card ──────────────────────────────────────────────────────────────
  const OrderCard = ({ item: o }) => (
    <View style={st.card}>
      <View style={st.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={st.cardName}>{v(o, 'customerName')}</Text>
          <Text style={st.cardSub}>Order #{v(o, 'orderId')} · Customer #{v(o, 'customerId')}</Text>
        </View>
        <Badge label={v(o, 'status')} color={sColor(v(o, 'status'))} />
      </View>
      <Divider />
      <Row label="Contact" value={v(o, 'contactNumber')} />
      <Row label="Shipping Address" value={v(o, 'shippingAddress')} />
      <Row label="Payment Method" value={v(o, 'paymentMethod')} />
      <Row label="Total Amount" value={`Rs ${Number(v(o, 'totalAmount', 0)).toLocaleString()}`} color={C.green} />
      <Row label="Order Date" value={v(o, 'orderDate')} color={C.muted} />
    </View>
  );

  // ── Owner Summary ────────────────────────────────────────────────────────
  const renderOwnerSummary = () => {
    const s = data?.summary;
    if (!s) return null;
    return (
      <>
        <SectionHeader title="Platform Overview" sub="Station Owner Metrics" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.hRow}>
          <StatCard label="Owners" value={v(s, 'totalOwners')} color={C.accent} icon="👤" />
          <StatCard label="Stations" value={v(s, 'totalStations')} color={C.orange} icon="⛽" />
          <StatCard label="Services" value={v(s, 'totalServices')} color={C.blue} icon="🔧" />
          <StatCard label="Bays" value={v(s, 'totalBays')} color={C.yellow} icon="🏗️" />
          <StatCard label="Products" value={v(s, 'totalProducts')} color={C.green} icon="📦" />
        </ScrollView>

        <SectionHeader title="Booking Stats" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.hRow}>
          <StatCard label="Total" value={v(s, 'totalBookings')} color={C.text} icon="📋" />
          <StatCard label="Done" value={v(s, 'doneBookings')} color={C.green} icon="✅" />
          <StatCard label="Confirmed" value={v(s, 'confirmedBookings')} color={C.blue} icon="🔵" />
          <StatCard label="Pending" value={v(s, 'pendingBookings')} color={C.yellow} icon="⏳" />
          <StatCard label="Cancelled" value={v(s, 'cancelledBookings')} color={C.red} icon="❌" />
        </ScrollView>

        <SectionHeader title="Revenue" />
        <View style={st.revBox}>
          <View style={st.revItem}>
            <Text style={st.revLbl}>Service Revenue</Text>
            <Text style={[st.revVal, { color: C.green }]}>Rs {Number(v(s, 'totalRevenue', 0)).toLocaleString()}</Text>
          </View>
          <View style={st.revDiv} />
          <View style={st.revItem}>
            <Text style={st.revLbl}>Product Revenue</Text>
            <Text style={[st.revVal, { color: C.blue }]}>Rs {Number(v(s, 'totalProductRevenue', 0)).toLocaleString()}</Text>
          </View>
          <View style={st.revDiv} />
          <View style={st.revItem}>
            <Text style={st.revLbl}>Total</Text>
            <Text style={[st.revVal, { color: C.accent }]}>Rs {Number(Number(v(s, 'totalRevenue', 0)) + Number(v(s, 'totalProductRevenue', 0))).toLocaleString()}</Text>
          </View>
        </View>

        <SectionHeader title="Order Items" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.hRow}>
          <StatCard label="Total Items" value={v(s, 'totalOrderItems')} color={C.orange} icon="🛒" />
          <StatCard label="Product Revenue" value={`Rs ${Number(v(s, 'totalProductRevenue', 0)).toLocaleString()}`} color={C.blue} icon="💰" />
        </ScrollView>
      </>
    );
  };

  // ── Customer Summary ─────────────────────────────────────────────────────
  const renderCustomerSummary = () => {
    const s = data?.summary;
    if (!s) return null;
    return (
      <>
        <SectionHeader title="Platform Overview" sub="Customer Metrics" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.hRow}>
          <StatCard label="Customers" value={v(s, 'totalCustomers')} color={C.accent} icon="👥" />
          <StatCard label="Vehicles" value={v(s, 'totalVehicles')} color={C.blue} icon="🚗" />
          <StatCard label="Bookings" value={v(s, 'totalBookings')} color={C.orange} icon="📋" />
          <StatCard label="Orders" value={v(s, 'totalOrders')} color={C.green} icon="🛒" />
        </ScrollView>

        <SectionHeader title="Booking Breakdown" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.hRow}>
          <StatCard label="Done" value={v(s, 'doneBookings')} color={C.green} icon="✅" />
          <StatCard label="Confirmed" value={v(s, 'confirmedBookings')} color={C.blue} icon="🔵" />
          <StatCard label="Pending" value={v(s, 'pendingBookings')} color={C.yellow} icon="⏳" />
          <StatCard label="Cancelled" value={v(s, 'cancelledBookings')} color={C.red} icon="❌" />
        </ScrollView>

        <SectionHeader title="Total Spending" />
        <View style={st.revBox}>
          <View style={st.revItem}>
            <Text style={st.revLbl}>On Services</Text>
            <Text style={[st.revVal, { color: C.green }]}>Rs {Number(v(s, 'totalSpentOnServices', 0)).toLocaleString()}</Text>
          </View>
          <View style={st.revDiv} />
          <View style={st.revItem}>
            <Text style={st.revLbl}>On Products</Text>
            <Text style={[st.revVal, { color: C.blue }]}>Rs {Number(v(s, 'totalSpentOnProducts', 0)).toLocaleString()}</Text>
          </View>
          <View style={st.revDiv} />
          <View style={st.revItem}>
            <Text style={st.revLbl}>Total</Text>
            <Text style={[st.revVal, { color: C.accent }]}>Rs {Number(Number(v(s, 'totalSpentOnServices', 0)) + Number(v(s, 'totalSpentOnProducts', 0))).toLocaleString()}</Text>
          </View>
        </View>

        <SectionHeader title="Reviews Given" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.hRow}>
          <StatCard label="Booking" value={v(s, 'totalBookingReviews')} color={C.yellow} icon="⭐" />
          <StatCard label="Service" value={v(s, 'totalServiceReviews')} color={C.orange} icon="🔧" />
          <StatCard label="Product" value={v(s, 'totalProductReviews')} color={C.accent} icon="📦" />
        </ScrollView>
      </>
    );
  };

  // ── Render Content ───────────────────────────────────────────────────────
  const renderContent = () => {
    if (loading) return (
      <View style={st.centered}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={st.loadingT}>Loading Dashboard...</Text>
      </View>
    );
    if (!data) return null;

    if (activeRole === 'StationOwner') {
      if (activeTab === 'summary') return renderOwnerSummary();
      if (activeTab === 'owners') return (
        <>
          <SectionHeader title="All Station Owners" sub={`${(data.owners || []).length} owners`} />
          {(data.owners || []).map((o, i) => <OwnerCard key={i} item={o} />)}
        </>
      );
      if (activeTab === 'stations') return (
        <>
          <SectionHeader title="All Stations" sub={`${(data.stations || []).length} stations`} />
          {(data.stations || []).map((s, i) => <StationCard key={i} item={s} />)}
        </>
      );
    }

    if (activeRole === 'Customer') {
      if (activeTab === 'summary') return renderCustomerSummary();
      if (activeTab === 'customers') return (
        <>
          <SectionHeader title="All Customers" sub={`${(data.customers || []).length} customers`} />
          {(data.customers || []).map((c, i) => <CustomerCard key={i} item={c} />)}
        </>
      );
      if (activeTab === 'bookings') return (
        <>
          <SectionHeader title="Recent Bookings" sub={`${(data.recentBookings || []).length} bookings`} />
          {(data.recentBookings || []).map((b, i) => <BookingCard key={i} item={b} />)}
        </>
      );
      if (activeTab === 'orders') return (
        <>
          <SectionHeader title="Recent Orders" sub={`${(data.recentOrders || []).length} orders`} />
          {(data.recentOrders || []).map((o, i) => <OrderCard key={i} item={o} />)}
        </>
      );
    }
    return null;
  };

  // Render detail items based on type (case-insensitive safe)
  const renderDetailItem = (item, index) => {
    if (detailType === 'services') {
      return (
        <View key={index} style={st.modalItemCard}>
          <Text style={st.modalItemTitle}>{v(item, 'serviceName') || 'Unnamed Service'}</Text>
          <Text style={st.modalItemDesc}>{v(item, 'description') || 'No description provided.'}</Text>
          <Divider />
          <Row label="Duration" value={`${v(item, 'duration')} min`} />
          <Row label="Bay Connections" value={v(item, 'bayCount')} />
          <Row label="Normal Price (Small / Large)" value={`Rs ${v(item, 'normalPriceSmall')} / Rs ${v(item, 'normalPriceLarge')}`} color={C.green} />
          <Row label="VIP Price (Small / Large)" value={`Rs ${v(item, 'vipPriceSmall')} / Rs ${v(item, 'vipPriceLarge')}`} color={C.yellow} />
        </View>
      );
    }

    if (detailType === 'bays') {
      const isOnline = v(item, 'status');
      return (
        <View key={index} style={st.modalItemCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={st.modalItemTitle}>{v(item, 'bayName') || 'Unnamed Bay'}</Text>
            <Badge label={isOnline ? 'Online' : 'Offline'} color={isOnline ? C.green : C.red} />
          </View>
          <Text style={st.modalItemDesc}>{v(item, 'description') || 'No description.'}</Text>
          <Divider />
          <Row label="Lifter Type" value={v(item, 'bayType')} />
          <Row label="Mapped Services" value={v(item, 'serviceCount')} />
        </View>
      );
    }

    if (detailType === 'products') {
      const qty = Number(v(item, 'quantity', 0));
      return (
        <View key={index} style={st.modalItemCard}>
          <Text style={st.modalItemTitle}>{v(item, 'productName') || 'Unnamed Product'}</Text>
          <Text style={st.modalItemDesc}>{v(item, 'productDescription') || 'No description.'}</Text>
          <Divider />
          <Row label="Stock Available" value={`${qty} units`} color={qty < 5 ? C.red : C.text} />
          <Row label="Price" value={`Rs ${Number(v(item, 'price', 0)).toLocaleString()}`} color={C.green} />
          <Row label="Total Units Sold" value={v(item, 'totalSold')} />
          <Row label="Generated Revenue" value={`Rs ${Number(v(item, 'totalRevenue', 0)).toLocaleString()}`} color={C.blue} />
        </View>
      );
    }

    if (detailType === 'oils') {
      return (
        <View key={index} style={st.modalItemCard}>
          <Text style={st.modalItemTitle}>{v(item, 'oilName') || 'Unnamed Oil'}</Text>
          <Text style={st.modalItemDesc}>Brand: {v(item, 'brand')} · Viscosity: {v(item, 'viscosity')}</Text>
          <Divider />
          <Row label="Engine Type" value={v(item, 'engineType')} />
          <Row label="Capacity" value={v(item, 'capacity')} />
          <Row label="Price" value={`Rs ${Number(v(item, 'price', 0)).toLocaleString()}`} color={C.green} />
        </View>
      );
    }

    if (detailType === 'filters') {
      return (
        <View key={index} style={st.modalItemCard}>
          <Text style={st.modalItemTitle}>{v(item, 'filterName') || 'Unnamed Filter'}</Text>
          <Text style={st.modalItemDesc}>Brand: {v(item, 'brand')} · Part Number: {v(item, 'partNumber') || 'N/A'}</Text>
          <Divider />
          <Row label="Compatible Model" value={v(item, 'vehicleModel')} />
          <Row label="Price" value={`Rs ${Number(v(item, 'price', 0)).toLocaleString()}`} color={C.green} />
        </View>
      );
    }

    return null;
  };

  // Generates dynamic real-time summaries for the bottom of the modal scroll list
  const renderDetailSummary = () => {
    if (!detailData || detailData.length === 0) return null;

    if (detailType === 'services') {
      const total = detailData.length;
      let totalDuration = 0;
      let minPrice = Infinity;
      let maxPrice = -Infinity;

      detailData.forEach(item => {
        const dur = Number(v(item, 'duration') || 0);
        totalDuration += dur;

        const ps = Number(v(item, 'normalPriceSmall') || 0);
        const pl = Number(v(item, 'normalPriceLarge') || 0);
        if (ps > 0 && ps < minPrice) minPrice = ps;
        if (pl > 0 && pl > maxPrice) maxPrice = pl;
      });

      const avgDur = total > 0 ? Math.round(totalDuration / total) : 0;

      return (
        <View style={st.sumBox}>
          <Text style={st.sumTitle}>🔧 Services Summary</Text>
          <Divider />
          <Row label="Total Available Services" value={`${total} items`} color={C.accentL} />
          <Row label="Average Service Duration" value={`${avgDur} mins`} />
          <Row label="Normal Price Range" value={`Rs ${minPrice === Infinity ? 0 : minPrice} — Rs ${maxPrice === -Infinity ? 0 : maxPrice}`} color={C.green} />
        </View>
      );
    }

    if (detailType === 'bays') {
      const total = detailData.length;
      let online = 0;
      detailData.forEach(item => {
        if (v(item, 'status')) online++;
      });
      const offline = total - online;

      return (
        <View style={st.sumBox}>
          <Text style={st.sumTitle}>🏗️ Bays Status Summary</Text>
          <Divider />
          <Row label="Total Allocated Bays" value={`${total} bays`} color={C.accentL} />
          <Row label="Online & Active" value={`${online} bays`} color={C.green} />
          <Row label="Offline / Maintenance" value={`${offline} bays`} color={offline > 0 ? C.red : C.sub} />
        </View>
      );
    }

    if (detailType === 'products') {
      const total = detailData.length;
      let totalStockVal = 0;
      let totalRev = 0;
      let totalSoldUnits = 0;

      detailData.forEach(item => {
        const price = Number(v(item, 'price') || 0);
        const qty = Number(v(item, 'quantity') || 0);
        const rev = Number(v(item, 'totalRevenue') || 0);
        const sold = Number(v(item, 'totalSold') || 0);

        totalStockVal += (price * qty);
        totalRev += rev;
        totalSoldUnits += sold;
      });

      return (
        <View style={st.sumBox}>
          <Text style={st.sumTitle}>📦 Inventory & Sales Summary</Text>
          <Divider />
          <Row label="Total Unique Products" value={`${total} products`} color={C.accentL} />
          <Row label="Total Stock On-Hand" value={`Rs ${totalStockVal.toLocaleString()}`} color={C.yellow} />
          <Row label="Total Units Sold" value={`${totalSoldUnits} units`} />
          <Row label="Aggregate Product Revenue" value={`Rs ${totalRev.toLocaleString()}`} color={C.green} />
        </View>
      );
    }

    if (detailType === 'oils') {
      const total = detailData.length;
      let totalPrice = 0;
      const brands = new Set();

      detailData.forEach(item => {
        totalPrice += Number(v(item, 'price') || 0);
        const bName = v(item, 'brand');
        if (bName) brands.add(bName.trim().toLowerCase());
      });

      const avgPrice = total > 0 ? Math.round(totalPrice / total) : 0;

      return (
        <View style={st.sumBox}>
          <Text style={st.sumTitle}>🛢️ Oils Allocation Summary</Text>
          <Divider />
          <Row label="Total Oil Variants" value={`${total} items`} color={C.accentL} />
          <Row label="Unique Brands Available" value={`${brands.size} brands`} />
          <Row label="Average Oil Price" value={`Rs ${avgPrice.toLocaleString()}`} color={C.green} />
        </View>
      );
    }

    if (detailType === 'filters') {
      const total = detailData.length;
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      const brands = new Set();

      detailData.forEach(item => {
        const pr = Number(v(item, 'price') || 0);
        if (pr > 0 && pr < minPrice) minPrice = pr;
        if (pr > 0 && pr > maxPrice) maxPrice = pr;

        const br = v(item, 'brand');
        if (br) brands.add(br.trim().toLowerCase());
      });

      return (
        <View style={st.sumBox}>
          <Text style={st.sumTitle}>🌪️ Filters Portfolio Summary</Text>
          <Divider />
          <Row label="Total Filter Types" value={`${total} items`} color={C.accentL} />
          <Row label="Supported Brands" value={`${brands.size} brands`} />
          <Row label="Price Range" value={`Rs ${minPrice === Infinity ? 0 : minPrice} — Rs ${maxPrice === -Infinity ? 0 : maxPrice}`} color={C.green} />
        </View>
      );
    }

    return null;
  };

  const ownerTabs = [
    { key: 'summary', label: '📊 Summary' },
    { key: 'owners', label: '👤 Owners' },
    { key: 'stations', label: '⛽ Stations' },
  ];
  const customerTabs = [
    { key: 'summary', label: '📊 Summary' },
    { key: 'customers', label: '👥 Customers' },
    { key: 'bookings', label: '📋 Bookings' },
    { key: 'orders', label: '🛒 Orders' },
  ];
  const tabs = activeRole === 'StationOwner' ? ownerTabs : customerTabs;

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={st.header}>
        <View>
          <Text style={st.headerTitle}>Admin Panel</Text>
          <Text style={st.headerSub}>Service-A-Car Dashboard</Text>
        </View>
        <TouchableOpacity style={st.crownBox} onPress={() => setProfileModalVisible(true)}>
          <Text style={{ fontSize: 22 }}>👑</Text>
        </TouchableOpacity>
      </View>

      {/* Role Toggle */}
      <View style={st.roleToggle}>
        <TouchableOpacity
          style={[st.roleBtn, activeRole === 'StationOwner' && st.roleBtnActive]}
          onPress={() => setActiveRole('StationOwner')}>
          <Text style={[st.roleBtnT, activeRole === 'StationOwner' && st.roleBtnTActive]}>⛽ Station Owners</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.roleBtn, activeRole === 'Customer' && { ...st.roleBtnActive, backgroundColor: C.blue }]}
          onPress={() => setActiveRole('Customer')}>
          <Text style={[st.roleBtnT, activeRole === 'Customer' && st.roleBtnTActive]}>👥 Customers</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabBar} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={[st.tab, activeTab === t.key && st.tabActive]} onPress={() => setActiveTab(t.key)}>
            <Text style={[st.tabT, activeTab === t.key && st.tabTActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Content */}
      <ScrollView
        style={st.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(activeRole, true)} tintColor={C.accent} />}>
        {renderContent()}
      </ScrollView>

      {/* SECTION DETAIL MODAL */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={st.modalContainer}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle} numberOfLines={1}>{detailTitle}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={st.closeBtn}>
                <Text style={st.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={st.modalCentered}>
                <ActivityIndicator size="large" color={C.accent} />
                <Text style={st.loadingT}>Loading Details...</Text>
              </View>
            ) : (
              <ScrollView style={st.modalScroll} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={true}>
                {detailData.length === 0 ? (
                  <View style={st.modalCentered}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>🏜️</Text>
                    <Text style={{ color: C.sub, fontSize: 15 }}>No data found in this category.</Text>
                  </View>
                ) : (
                  <>
                    {/* Rendered List */}
                    {detailData.map((item, idx) => renderDetailItem(item, idx))}

                    {/* Gorgeous Summary Section at bottom */}
                    {renderDetailSummary()}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* PROFILE & LOGOUT MODAL */}
      <Modal
        visible={profileModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={[st.modalContainer, { height: '40%', width: '85%' }]}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Admin Profile</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)} style={st.closeBtn}>
                <Text style={st.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={st.profileContent}>
              <View style={[st.avatar, { width: 70, height: 70, borderRadius: 35, marginBottom: 15 }]}>
                <Text style={[st.avatarT, { fontSize: 30 }]}>{firstLetter}</Text>
              </View>
              <Text style={[st.cardName, { fontSize: 20 }]}>{displayName}</Text>
              <Text style={[st.cardSub, { fontSize: 14 }]}>{displayEmail}</Text>
              <Text style={[st.cardSub, { fontSize: 12, marginBottom: 25 }]}>📞 {displayContact}</Text>

              <TouchableOpacity style={st.logoutBtn} onPress={handleLogout}>
                <Text style={st.logoutBtnText}>Logout from Platform</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 13, color: C.sub, marginTop: 2 },
  crownBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  roleToggle: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 4 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  roleBtnActive: { backgroundColor: C.accent },
  roleBtnT: { color: C.sub, fontWeight: '600', fontSize: 13 },
  roleBtnTActive: { color: '#fff' },
  tabBar: { maxHeight: 50, marginBottom: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: C.accent + '33', borderColor: C.accent },
  tabT: { color: C.sub, fontSize: 13, fontWeight: '600' },
  tabTActive: { color: C.accentL },
  content: { flex: 1, paddingHorizontal: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingT: { color: C.sub, marginTop: 12, fontSize: 14 },

  secHdr: { marginTop: 20, marginBottom: 10 },
  secTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  secSub: { color: C.sub, fontSize: 12, marginTop: 2 },

  hRow: { marginBottom: 8 },
  statCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginRight: 10, minWidth: 110, alignItems: 'center', borderLeftWidth: 3, borderWidth: 1, borderColor: C.border },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { color: C.sub, fontSize: 11, marginTop: 2, textAlign: 'center' },

  revBox: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, flexDirection: 'row', marginBottom: 8, overflow: 'hidden' },
  revItem: { flex: 1, padding: 14, alignItems: 'center' },
  revDiv: { width: 1, backgroundColor: C.border },
  revLbl: { color: C.sub, fontSize: 10, marginBottom: 6 },
  revVal: { fontSize: 13, fontWeight: '800' },

  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent + '33', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarT: { fontSize: 18, fontWeight: '700', color: C.accent },
  cardName: { color: C.text, fontWeight: '700', fontSize: 14 },
  cardSub: { color: C.sub, fontSize: 12, marginTop: 2 },
  greenPill: { backgroundColor: C.green + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.green + '44' },
  greenPillT: { color: C.green, fontWeight: '700', fontSize: 12 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowL: { color: C.sub, fontSize: 13, flex: 1 },
  rowV: { color: C.text, fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 6 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeT: { fontSize: 11, fontWeight: '700' },

  // Grid for Station sections
  gridTitle: { color: C.accentL, fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 5 },
  gridItem: { width: '31%', backgroundColor: C.bg, borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: C.border },
  gridIcon: { fontSize: 18, marginBottom: 4 },
  gridVal: { color: C.text, fontSize: 14, fontWeight: '700' },
  gridLbl: { color: C.sub, fontSize: 10, marginTop: 2 },

  // Modals Styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', height: '70%', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, overflow: 'hidden', flexDirection: 'column' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 10 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: '800', flex: 1, marginRight: 10 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: C.text, fontSize: 14, fontWeight: 'bold' },
  modalCentered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  modalScroll: { flex: 1, marginTop: 8 },
  modalItemCard: { backgroundColor: C.bg, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  modalItemTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  modalItemDesc: { color: C.sub, fontSize: 12, lineHeight: 16 },

  profileContent: { alignItems: 'center', paddingVertical: 20 },
  logoutBtn: { backgroundColor: C.red, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10, marginTop: 15 },
  logoutBtnText: { color: C.text, fontWeight: '700', fontSize: 14 },

  // Summary Box inside Modals
  sumBox: {
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.accent + '33',
    borderLeftWidth: 4,
    borderLeftColor: C.accent,
  },
  sumTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
