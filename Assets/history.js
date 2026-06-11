import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Dimensions, Alert, ScrollView
} from 'react-native';
const { width } = Dimensions.get('window');
import { BASE_URL } from "./Constants";
import { UserContext } from "./UserContext";

const History = ({ navigation }) => {
  const { User } = useContext(UserContext);

  // States
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [selectedDays, setSelectedDays] = useState(7);
  const [analytics, setAnalytics] = useState(null);

  // Filter Options (Chips)
  const dayFilters = [
    { label: '3 Days', value: 3 },
    { label: '7 Days', value: 7 },
    { label: '15 Days', value: 15 },
    { label: '30 Days', value: 30 },
  ];

  useEffect(() => { fetchStations(); }, []);

  useEffect(() => {
    if (selectedStationId) { fetchAnalytics(); }
  }, [selectedStationId, selectedDays]);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/Station/getstationlist/${User?.id}`);
      const result = await response.json();
      if (result.status === "success" && result.data.length > 0) {
        setStations(result.data);
        setSelectedStationId(result.data[0].stationId);
      }
    } catch (error) {
      Alert.alert("Error", "Stations fetch failed.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${BASE_URL}/Station/GetAnalyticss/${selectedStationId}?days=${selectedDays}`);
      const data = await response.json();
      console.log(data);
      setAnalytics(data);
    } catch (error) {
      console.log("Analytics Error:", error);
    }
  };

  // ── RENDER STATION CHIP ──
  const renderStationChip = ({ item }) => {
    const isSelected = item.stationId === selectedStationId;
    return (
      <TouchableOpacity
        style={[styles.chip, isSelected && styles.selectedChip]}
        onPress={() => setSelectedStationId(item.stationId)}
      >
        <Text style={[styles.chipText, isSelected && styles.whiteText]}>
          {item.stationName}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── RENDER DAY FILTER CHIP ──
  const renderDayChip = (item) => {
    const isSelected = item.value === selectedDays;
    return (
      <TouchableOpacity
        key={item.value}
        style={[styles.dayChip, isSelected && styles.selectedDayChip]}
        onPress={() => setSelectedDays(item.value)}
      >
        <Text style={[styles.dayChipText, isSelected && styles.whiteText]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Helpers to avoid crashes
  const maxBayBookings = analytics?.topPerformingBays?.length > 0 
    ? Math.max(...analytics.topPerformingBays.map(b => b.bookingsCount), 1) 
    : 1;

  const maxTrendRevenue = analytics?.dailyTrends?.length > 0
    ? Math.max(...analytics.dailyTrends.map(t => t.revenue), 1)
    : 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Station Analytics</Text>
      </View>

      {/* Station List Chips */}
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

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Days Filter */}
        <Text style={styles.sectionLabel}>Select Time Range</Text>
        <View style={styles.daysRow}>
          {dayFilters.map(item => renderDayChip(item))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="black" style={{ marginTop: 100 }} />
        ) : (
          <>
            {/* Revenue Overview Card */}
            <View style={styles.mainCard}>
              <View style={styles.ratingHeaderRow}>
                <Text style={styles.cardHeaderLabel}>OVERALL EARNINGS</Text>
                {analytics?.summary?.AverageRating !== undefined && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>★ {analytics.summary.AverageRating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.totalAmount}>
                Rs. {analytics?.summary?.TotalNetEarnings?.toLocaleString() || '0'}
              </Text>
              <View style={styles.divider} />
              
              <View style={styles.revenueSplit}>
                <View style={styles.splitBox}>
                  <Text style={styles.splitLabel}>Services</Text>
                  <Text style={styles.splitValue}>Rs. {analytics?.summary?.RevenueFromServices?.toLocaleString() || '0'}</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.splitBox}>
                  <Text style={styles.splitLabel}>Products</Text>
                  <Text style={styles.splitValue}>Rs. {analytics?.summary?.RevenueFromProducts?.toLocaleString() || '0'}</Text>
                </View>
              </View>
            </View>

            {/* Bookings Overview Section */}
            <View style={styles.mainCard}>
              <Text style={styles.cardHeaderLabel}>BOOKINGS OVERVIEW</Text>
              
              <View style={styles.row}>
                <View style={[styles.halfCard, { borderLeftColor: 'deepskyblue', borderLeftWidth: 4, borderWidth: 1, borderColor: '#eee' }]}>
                  <Text style={styles.smallLabel}>Total Bookings</Text>
                  <Text style={styles.smallValue}>{analytics?.summary?.TotalBookings || '0'}</Text>
                </View>
                <View style={[styles.halfCard, { borderLeftColor: '#4CAF50', borderLeftWidth: 4, borderWidth: 1, borderColor: '#eee' }]}>
                  <Text style={styles.smallLabel}>Completion Rate</Text>
                  <Text style={styles.smallValue}>{analytics?.summary?.CompletionRatePercentage || '0'}%</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Text style={[styles.statusValue, { color: '#4CAF50' }]}>{analytics?.summary?.CompletedBookings || '0'}</Text>
                  <Text style={styles.statusLabel}>Completed</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.statusItem}>
                  <Text style={[styles.statusValue, { color: '#FF9800' }]}>{analytics?.summary?.PendingBookings || '0'}</Text>
                  <Text style={styles.statusLabel}>Pending</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.statusItem}>
                  <Text style={[styles.statusValue, { color: '#F44336' }]}>{analytics?.summary?.CancelledBookings || '0'}</Text>
                  <Text style={styles.statusLabel}>Cancelled</Text>
                </View>
              </View>
            </View>

            {/* NEWLY ADDED: Service Performance & Ratings Card */}
            <View style={styles.mainCard}>
              <Text style={styles.cardHeaderLabel}>SERVICE RATINGS & PERFORMANCE</Text>
              {analytics?.serviceRatings && analytics.serviceRatings.length > 0 ? (
                analytics.serviceRatings.map((item, index) => (
                  <View key={index} style={styles.serviceRatingRow}>
                    <View style={styles.serviceRatingLeft}>
                      <Text style={styles.serviceNameText}>{item.serviceName}</Text>
                      <Text style={styles.serviceSubText}>Based on {item.totalReviews} reviews</Text>
                    </View>
                    <View style={styles.serviceRatingRight}>
                      <Text style={styles.serviceStarText}>★ {item.avgRating ? item.avgRating.toFixed(1) : '0.0'}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No service ratings recorded yet</Text>
              )}
            </View>

            {/* Operational Efficiency (Bay Performance) */}
            <View style={styles.mainCard}>
              <Text style={styles.cardHeaderLabel}>BAY PERFORMANCE (COMPLETED TASKS)</Text>
              {analytics?.topPerformingBays && analytics.topPerformingBays.length > 0 ? (
                analytics.topPerformingBays.map((bay, index) => (
                  <View key={index} style={styles.inventoryItem}>
                    <View style={styles.inventoryInfo}>
                      <Text style={styles.inventoryName}>{bay.bayName}</Text>
                      <Text style={styles.inventoryCount}>{bay.bookingsCount} Done</Text>
                    </View>
                    <View style={styles.barBg}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            width: `${(bay.bookingsCount / maxBayBookings) * 100}%`, 
                            backgroundColor: '#4CAF50' 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No performance data found</Text>
              )}
            </View>

            {/* Products & Inventory Analytics */}
            <View style={styles.mainCard}>
              <Text style={styles.cardHeaderLabel}>PRODUCTS & INVENTORY</Text>
              
              <View style={styles.row}>
                <View style={[styles.halfCard, { borderLeftColor: '#FF9800', borderLeftWidth: 4, borderWidth: 1, borderColor: '#eee', width: '100%' }]}>
                  <Text style={styles.smallLabel}>Direct Product Orders Placed</Text>
                  <Text style={styles.smallValue}>{analytics?.summary?.TotalProductsOrdered || '0'}</Text>
                </View>
              </View>
              
              <View style={styles.inventoryItem}>
                <View style={styles.inventoryInfo}>
                  <Text style={styles.inventoryName}>Engine Oils Sold</Text>
                  <Text style={styles.inventoryCount}>{analytics?.summary?.OilsSold || '0'}</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${Math.min(((analytics?.summary?.OilsSold || 0) / Math.max((analytics?.summary?.TotalBookings || 1), 1)) * 100, 100)}%`, backgroundColor: '#FF8A65' }]} />
                </View>
              </View>

              <View style={styles.inventoryItem}>
                <View style={styles.inventoryInfo}>
                  <Text style={styles.inventoryName}>Filters Sold</Text>
                  <Text style={styles.inventoryCount}>{analytics?.summary?.FiltersSold || '0'}</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${Math.min(((analytics?.summary?.FiltersSold || 0) / Math.max((analytics?.summary?.TotalBookings || 1), 1)) * 100, 100)}%`, backgroundColor: 'deepskyblue' }]} />
                </View>
              </View>
            </View>

            {/* Daily Earnings Trend Breakup */}
            <View style={styles.mainCard}>
              <Text style={styles.cardHeaderLabel}>DAILY EARNINGS BREAKDOWN</Text>
              {analytics?.dailyTrends && analytics.dailyTrends.length > 0 ? (
                analytics.dailyTrends.map((trend, index) => (
                  <View key={index} style={styles.trendRow}>
                    <View style={styles.trendLeft}>
                      <Text style={styles.trendDate}>{trend.date}</Text>
                      <Text style={styles.trendSub}>{trend.bookings} Bookings</Text>
                    </View>
                    <View style={styles.trendRight}>
                      <Text style={styles.trendRevenue}>Rs. {trend.revenue?.toLocaleString()}</Text>
                      <View style={styles.trendBarContainer}>
                        <View style={[styles.trendBarFill, { width: `${(trend.revenue / maxTrendRevenue) * 100}%` }]} />
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No trend data available</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  header: { padding: 20, backgroundColor: 'white', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },

  // Station Chips
  stationListWrapper: { paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  chip: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 25, backgroundColor: '#f5f5f5', marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  selectedChip: { backgroundColor: '#000', borderColor: '#000' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#777' },
  whiteText: { color: 'white' },

  scrollContainer: { padding: 20 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#999', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // Day Filter Chips
  daysRow: { flexDirection: 'row', marginBottom: 20 },
  dayChip: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#eee' },
  selectedDayChip: { backgroundColor: 'deepskyblue', borderColor: 'deepskyblue' },
  dayChipText: { fontSize: 12, fontWeight: '600', color: '#666' },

  // Main Card Design
  mainCard: { backgroundColor: 'white', borderRadius: 18, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, marginBottom: 15 },
  cardHeaderLabel: { fontSize: 10, fontWeight: 'bold', color: '#AAA', marginBottom: 5, uppercase: true, letterSpacing: 0.5 },
  totalAmount: { fontSize: 30, fontWeight: 'bold', color: '#000' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 15 },
  revenueSplit: { flexDirection: 'row' },
  splitBox: { flex: 1, alignItems: 'center' },
  splitLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  splitValue: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  verticalDivider: { width: 1, backgroundColor: '#eee' },

  // Row for smaller cards
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  halfCard: { backgroundColor: 'white', width: '48%', padding: 15, borderRadius: 15 },
  smallLabel: { fontSize: 11, color: '#999' },
  smallValue: { fontSize: 22, fontWeight: 'bold', color: '#000', marginTop: 5 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 10 },
  statusItem: { flex: 1, alignItems: 'center' },
  statusValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  statusLabel: { fontSize: 11, color: '#999' },

  // Inventory & Performance Design
  inventoryItem: { marginBottom: 15 },
  inventoryInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  inventoryName: { fontSize: 13, color: '#555', fontWeight: '500' },
  inventoryCount: { fontSize: 13, fontWeight: 'bold', color: '#000' },
  barBg: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  noDataText: { fontSize: 13, color: '#bbb', textAlign: 'center', marginVertical: 10 },

  // New Rating Styles
  ratingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingBadge: { backgroundColor: '#FFC107', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ratingText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // New Trend Row Styles
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  trendLeft: { flex: 1 },
  trendDate: { fontSize: 13, fontWeight: '600', color: '#222' },
  trendSub: { fontSize: 11, color: '#999', marginTop: 2 },
  trendRight: { flex: 1, alignItems: 'flex-end' },
  trendRevenue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  trendBarContainer: { width: '70%', height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  trendBarFill: { height: '100%', backgroundColor: 'deepskyblue', borderRadius: 2 },

  // Styles for Service Ratings
  serviceRatingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  serviceRatingLeft: { flex: 1 },
  serviceNameText: { fontSize: 14, fontWeight: '600', color: '#222' },
  serviceSubText: { fontSize: 11, color: '#999', marginTop: 2 },
  serviceRatingRight: { backgroundColor: '#FFF9E6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#FFE082' },
  serviceStarText: { color: '#FFB300', fontSize: 13, fontWeight: 'bold' }
});

export default History;