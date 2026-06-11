import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();
export const TimerContext = createContext(); 

export const UserProvider = ({ children }) => {
  // --- User States ---
  const [User, setUser] = useState();
  const [stationdata, setstationdata] = useState();
  const [servicedata, setservicedata] = useState();
  const [bayservice, setbayservice] = useState([]);
  const [baydata, setbaydata] = useState();
  const [productdata, setproductdata] = useState();
  const [bookingData, setBookingData] = useState();
  const [bookingSummary, setBookingSummary] = useState({
    station: null,
    services: [],
    startTime: null,
    endTime: null,
    isVip: false,
    totalBill: 0,
    totalDuration: 0,
    slot: null
  });
  const [destinationcoordinate, setdestinationcoordinate] = useState({ destinationlatitude: null, destinationlongitude: null });
  const [usercoordinate, setusercoordinate] = useState({ userlatitude: null, userlongitude: null });

  // --- Customer States ---
  const [cartid, setcartid] = useState();
  const [orderproduct, setorderproduct] = useState([]);
  const [totalbill, settotalbill] = useState();
  const [stationid, setstationid] = useState();
  const [productid, setproductid] = useState();
  const [orderid, setorderid] = useState();
  const [productidforreview, setproductidforreview] = useState();
  const [selectedbayid, setselectedbayid] = useState();

  const updateUser = (data) => setUser(prev => ({ ...prev, ...data }));
  const clearUser = () => setUser(null);

  // --- 2. Global Timer Logic ---
  const [globalTimers, setGlobalTimers] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalTimers(prevTimers => {
        if (Object.keys(prevTimers).length === 0) return prevTimers;

        const updated = { ...prevTimers };
        let hasChanged = false;

        Object.keys(updated).forEach(id => {
          if (updated[id] > 0) {
            updated[id] -= 1;
            hasChanged = true;
          } else {
            delete updated[id];
            hasChanged = true;
          }
        });

        return hasChanged ? updated : prevTimers;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startGlobalTimer = (id, mins) => {
    setGlobalTimers(prev => ({ ...prev, [id]: mins * 60 }));
  };

  const stopGlobalTimer = (id) => {
    setGlobalTimers(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

 
  return (
    <UserContext.Provider value={{ 
      User, setUser, updateUser, clearUser, bookingData, setBookingData, 
      usercoordinate, setusercoordinate, stationdata, setstationdata, 
      servicedata, setservicedata, baydata, setbaydata, bayservice, 
      setbayservice, productdata, setproductdata, destinationcoordinate, 
      setdestinationcoordinate, cartid, setcartid, orderproduct, 
      setorderproduct, totalbill, settotalbill, stationid, setstationid, 
      productid, setproductid, orderid, setorderid, productidforreview, 
      setproductidforreview, selectedbayid, setselectedbayid, 
      bookingSummary, setBookingSummary 
    }}>
      
      <TimerContext.Provider value={{ globalTimers, startGlobalTimer, stopGlobalTimer, formatTime }}>
        {children}
      </TimerContext.Provider>
    </UserContext.Provider>
  );
};