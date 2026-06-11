import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
 const Stack = createNativeStackNavigator();
// Import screens
import Splash from './Assets/Splash';
import Login from './Assets/Login';
import Signup from './Assets/Signup';
import Dashboard from './Assets/Dashboard';
import Addstation from './Assets/Addstation';
import Addstationlocation from './Assets/Addstationlocation';
import successfullyregister from './Assets/successfullyregister'; 
import Mystations from './Assets/Mystations'; 
import Addservices from './Assets/Addservices'; 
import Myservices from './Assets/Myservices'; 
import ManageBooking from './Assets/ManageBooking'; 
import Addproducts from './Assets/Addproducts';
import Myproducts from './Assets/Myproducts';
import userprofile from './Assets/userprofile';
import Manageorder from './Assets/Manageorder';
import UpdateStation from './Assets/updatestation';
import Stationreview from './Assets/Stationreview';
import Addbays from './Assets/Addbays';
import Mybays from './Assets/Mybays';
import updateservice from './Assets/updateservice';
import updatebays from './Assets/updatebays';
import Changepassword from './Assets/Changepassword';
import Addoilandfilter from './Assets/Addoilandfilter';
import updateproduct from './Assets/updateproduct';
import updateoilandfilter from './Assets/updateoilandfilter';
import myoilandfilter from './Assets/myoilandfilter';
import feedbacks from './Assets/feedbacks';
import history from './Assets/history';

{/* ***********************************************customer side************************************************************ */}
import Customerhome from './Assets/CustomerHome';
import Searchbooking from './Assets/Searchbooking';
import Viewnearbystation from './Assets/Viewnearbystation';
// import Availableservices from './Assets/(notiuse)Availableservices';
import Addbookingdetail from './Assets/addbookingdetail';
// import confirmbookingdetail from './Assets/(Notuse)confirmbookingdetail';
import Marketplace from './Assets/Marketplace';
import Viewcart from './Assets/Viewcart';
import notification from './Assets/notification';
import Orderdetail from './Assets/Orderdetail';
import showproductreview from './Assets/showproductreview';
import productrating from './Assets/productrating';
import stationrating from './Assets/stationrating';
import directionmap from './Assets/directionmap';
import offers from './Assets/offers';
import forgetpassword from './Assets/forgetpassword';
import displaybookingreview from './Assets/displaybookingreviews';
import Orderstatus from './Assets/Orderstatus';
import ManageVehicle from './Assets/ManageVehicle';
import ShowServiceReview from './Assets/ShowServiceReview';
import Mybooking from './Assets/Mybooking';
import Searchbookings from './Assets/searchbookings';
import viewnearbystations from './Assets/viewnearbystations';
import addbookingdetails from './Assets/addbookingdetails';
import specificstationbooking from './Assets/specficstationbooking';
import TabScreen from './Assets/TabScreen'; 
import { UserProvider } from './Assets/UserContext'; 
import addbookingdetail from './Assets/addbookingdetail';
import directionmaps from './Assets/directionmaps';
import AdminDashboard from './Assets/AdminDashboard';

export default function App() {
  return (
   
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash">            
          <Stack.Screen
            name="Splash"                                      // yeh jis name sy define hai navigation ky andr is ka naam likhty
            component={Splash}                                //screen file name hai jo screen ka name huga wo
            options={{
              headerShown: false,
              gestureEnabled: true, 
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Login"
            component={Login}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />

           <Stack.Screen
            name="TabScreen"
            component={TabScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Signup"
            component={Signup}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Dashboard"
            component={Dashboard}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Addstation"
            component={Addstation}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Addstationlocation"
            component={Addstationlocation}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="successfullyregister"
            component={successfullyregister}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="Mystations"
            component={Mystations}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Addservices"
            component={Addservices}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Myservices"
            component={Myservices}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="ManageBooking"
            component={ManageBooking}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Addproducts"
            component={Addproducts}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="Myproducts"
            component={Myproducts}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="userprofile"
            component={userprofile}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="Manageorder"
            component={Manageorder}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="Stationreview"
            component={Stationreview}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="UpdateStation"
            component={UpdateStation}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
             <Stack.Screen
            name="Addbays"
            component={Addbays}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="Mybays"
            component={Mybays}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="Changepassword"
            component={Changepassword}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="updateservice"
            component={updateservice}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="updatebays"
            component={updatebays}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Addoilandfilter"
            component={Addoilandfilter}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="updateproduct"
            component={updateproduct}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="myoilandfilter"
            component={myoilandfilter}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="feedbacks"
            component={feedbacks}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="updateoilandfilter"
            component={updateoilandfilter}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="displaybookingreview"
            component={displaybookingreview}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="history"
            component={history}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          {/* ***********************************************customer side************************************************************ */}
          <Stack.Screen
            name="Customerhome"
            component={Customerhome}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Searchbooking"
            component={Searchbooking}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="Viewnearbystation"
            component={Viewnearbystation}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           {/* <Stack.Screen
            name="Availableservices"
            component={Availableservices}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          /> */}
           <Stack.Screen
            name="Addbookingdetail"
            component={Addbookingdetail}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           {/* <Stack.Screen
            name="confirmbookingdetail"
            component={confirmbookingdetail}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          /> */}
           
           <Stack.Screen
            name="Marketplace"
            component={Marketplace}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="Viewcart"
            component={Viewcart}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="Orderdetail"
            component={Orderdetail}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Orderstatus"
            component={Orderstatus}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="notification"
            component={notification}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="directionmap"
            component={directionmap}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="forgetpassword"
            component={forgetpassword}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="productrating"
            component={productrating}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="stationrating"
            component={stationrating}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />

           <Stack.Screen
            name="showproductreview"
            component={showproductreview}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />

           <Stack.Screen
            name="Mybooking"
            component={Mybooking}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />

          <Stack.Screen
            name="specificstationbooking"
            component={specificstationbooking}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />

          <Stack.Screen
            name="ManageVehicle"
            component={ManageVehicle}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />

          <Stack.Screen
            name="ShowServiceReview"
            component={ShowServiceReview}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="offers"
            component={offers}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="searchbookings"
            component={Searchbookings}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="viewnearbystations"
            component={viewnearbystations}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="addbookingdetails"
            component={addbookingdetails}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="addbookingdetail"
            component={addbookingdetail}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
           <Stack.Screen
            name="directionmaps"
            component={directionmaps}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboard}
            options={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </UserProvider>
  );
}
