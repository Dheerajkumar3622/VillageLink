import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'EN' | 'HI' | 'BR';

export const TRANSLATIONS = {
  EN: {
    // Common
    "common.back": "Back",
    "common.confirm": "Confirm",
    "common.cancel": "Cancel",
    "common.submit": "Submit",
    "common.loading": "Loading...",
    "common.wallet": "Wallet",
    "common.balance": "Balance",
    "common.home": "Home",
    "common.notifications": "Notifications",
    "common.settings": "Settings",
    "common.logout": "Logout",
    "common.verify": "Verify",
    
    // Auth
    "auth.welcome": "Welcome to VillageLink",
    "auth.partnerLogin": "Partner Portal Login",
    "auth.phonePlaceholder": "Enter mobile number",
    "auth.sendOtp": "Send OTP",
    "auth.verifyOtp": "Verify OTP & Login",
    "auth.verifying": "Verifying...",
    "auth.verificationPending": "Verification Pending",
    "auth.pendingMessage": "Your details are currently being reviewed by our verification team. Usually takes 24-48 hours.",
    "auth.signOut": "Sign Out",
    
    // Passenger
    "passenger.whereTo": "Where are you going?",
    "passenger.pickup": "Boarding Stop",
    "passenger.dropoff": "Destination Stop",
    "passenger.searchVehicles": "Search Vehicles",
    "passenger.seats": "Seats",
    "passenger.bookNow": "Book Ticket",
    "passenger.radarTitle": "Autopilot Live Route Radar",
    "passenger.proximityRadar": "Proximity Radar",
    "passenger.preArrivalBid": "Pre-arrival Bidding Console",
    "passenger.bidNow": "Reserve Seat & Bid",
    "passenger.voicePrompt": "Press mic to speak in Hindi or Bhojpuri (e.g., 'Basantpur se Sasaram ek seat')",
    
    // Driver
    "driver.dashboard": "Driver Console",
    "driver.startTrip": "Start Trip",
    "driver.endTrip": "End Trip",
    "driver.waitlist": "Passenger Waitlist",
    "driver.stopList": "Boarding Stops",
    "driver.scanPassenger": "Scan Passenger Code",
    "driver.chatPilot": "Interactive Driver Chat",
    "driver.proximityAlert": "Collision Proximity Radar",
    "driver.earnings": "Earnings",
    
    // Mandi
    "mandi.title": "Gram Mandi Board",
    "mandi.cropGrading": "AI Crop Grading System",
    "mandi.snapCrop": "Snap Crop Photo",
    "mandi.moisture": "Estimated Moisture",
    "mandi.qualityGrade": "Quality Grade",
    "mandi.marketPrice": "Recommended Market Price",
    "mandi.listCrop": "List Produce on Mandi",
    "mandi.gradeA": "Grade A - Premium Quality",
    "mandi.gradeB": "Grade B - Standard Quality",
    "mandi.gradeC": "Grade C - Low Quality",
    
    // Vyapar
    "vyapar.shop": "Vyapar Saathi Shop",
    "vyapar.items": "Inventory Items",
    "vyapar.addStock": "Add Stock",
    "vyapar.sell": "Sell Item",
    "vyapar.messMenu": "Mess Manager Menu"
  },
  HI: {
    // Common
    "common.back": "पीछे जाएं",
    "common.confirm": "पुष्टि करें",
    "common.cancel": "रद्द करें",
    "common.submit": "जमा करें",
    "common.loading": "लोड हो रहा है...",
    "common.wallet": "बटुए",
    "common.balance": "शेष राशि",
    "common.home": "मुख्य पृष्ठ",
    "common.notifications": "सूचनाएं",
    "common.settings": "सेटिंग्स",
    "common.logout": "लॉगआउट",
    "common.verify": "सत्यापित करें",
    
    // Auth
    "auth.welcome": "विलेजलिंक में आपका स्वागत है",
    "auth.partnerLogin": "पार्टनर पोर्टल लॉगिन",
    "auth.phonePlaceholder": "मोबाइल नंबर दर्ज करें",
    "auth.sendOtp": "ओटीपी भेजें",
    "auth.verifyOtp": "ओटीपी सत्यापित करें",
    "auth.verifying": "सत्यापन हो रहा है...",
    "auth.verificationPending": "सत्यापन लंबित है",
    "auth.pendingMessage": "आपके विवरण की समीक्षा हमारी टीम द्वारा की जा रही है। आमतौर पर 24-48 घंटे लगते हैं।",
    "auth.signOut": "साइन आउट",
    
    // Passenger
    "passenger.whereTo": "आप कहाँ जाना चाहते हैं?",
    "passenger.pickup": "चढ़ने का स्टॉप",
    "passenger.dropoff": "उतरने का स्टॉप",
    "passenger.searchVehicles": "वाहनों की खोज करें",
    "passenger.seats": "सीटें",
    "passenger.bookNow": "टिकट बुक करें",
    "passenger.radarTitle": "ऑटोपायलट लाइव रूट रडार",
    "passenger.proximityRadar": "निकटता रडार",
    "passenger.preArrivalBid": "प्री-अराइवल बोली कंसोल",
    "passenger.bidNow": "सीट आरक्षित करें और बोली लगाएं",
    "passenger.voicePrompt": "हिंदी या भोजपुरी में बोलने के लिए माइक दबाएं (जैसे, 'बसंतपुर से सासाराम एक सीट')",
    
    // Driver
    "driver.dashboard": "ड्राइवर कंसोल",
    "driver.startTrip": "यात्रा शुरू करें",
    "driver.endTrip": "यात्रा समाप्त करें",
    "driver.waitlist": "यात्री प्रतीक्षा सूची",
    "driver.stopList": "बोर्डिंग स्टॉप सूची",
    "driver.scanPassenger": "यात्री कोड स्कैन करें",
    "driver.chatPilot": "ड्राइवर चैट सिमुलेटर",
    "driver.proximityAlert": "टक्कर निकटता रडार",
    "driver.earnings": "कमाई",
    
    // Mandi
    "mandi.title": "ग्राम मंडी बोर्ड",
    "mandi.cropGrading": "एॉई फसल ग्रेडिंग प्रणाली",
    "mandi.snapCrop": "फसल की फोटो खींचे",
    "mandi.moisture": "अनुमानित नमी",
    "mandi.qualityGrade": "गुणवत्ता ग्रेड",
    "mandi.marketPrice": "अनुशंसित बाजार मूल्य",
    "mandi.listCrop": "मंडी पर फसल सूचीबद्ध करें",
    "mandi.gradeA": "ग्रेड ए - उत्तम गुणवत्ता",
    "mandi.gradeB": "ग्रेड बी - सामान्य गुणवत्ता",
    "mandi.gradeC": "ग्रेड सी - कम गुणवत्ता",
    
    // Vyapar
    "vyapar.shop": "व्यापार साथी दुकान",
    "vyapar.items": "सामग्री सूची",
    "vyapar.addStock": "स्टॉक जोड़ें",
    "vyapar.sell": "सामान बेचें",
    "vyapar.messMenu": "मेस प्रबंधक मेनू"
  },
  BR: {
    // Common
    "common.back": "पाछे चलीं",
    "common.confirm": "पक्का करीं",
    "common.cancel": "रद्द करीं",
    "common.submit": "जमा करीं",
    "common.loading": "लोड हो रहल बा...",
    "common.wallet": "बटुआ",
    "common.balance": "बचल पइसा",
    "common.home": "मुख्य पन्ना",
    "common.notifications": "खबर",
    "common.settings": "सेटिंग",
    "common.logout": "लॉगआउट",
    "common.verify": "जांच करीं",
    
    // Auth
    "auth.welcome": "विलेजलिंक में रउआ सब के स्वागत बा",
    "auth.partnerLogin": "पार्टनर पोर्टल लॉगिन",
    "auth.phonePlaceholder": "मोबाइल नंबर डालीं",
    "auth.sendOtp": "ओटीपी भेजीं",
    "auth.verifyOtp": "ओटीपी जांच के लॉगिन करीं",
    "auth.verifying": "जांच हो रहल बा...",
    "auth.verificationPending": "सत्यापन रुकल बा",
    "auth.pendingMessage": "रउआ जानकारी के जांच हमनी के टीम कर रहल बिया। आमतौर पर 24-48 घंटा लागेला।",
    "auth.signOut": "साइन आउट",
    
    // Passenger
    "passenger.whereTo": "रउआ कहाँ जाए के चाहत बानी?",
    "passenger.pickup": "चढ़े के जगह",
    "passenger.dropoff": "उतरे के जगह",
    "passenger.searchVehicles": "गाड़ी खोजीं",
    "passenger.seats": "सीट संख्या",
    "passenger.bookNow": "टिकट बुक करीं",
    "passenger.radarTitle": "ऑटोपायलट लाइव रडार",
    "passenger.proximityRadar": "दूरी रडार",
    "passenger.preArrivalBid": "गाड़ी आवे से पहिले बोली लगाइं",
    "passenger.bidNow": "सीट रोक के बोली लगाइं",
    "passenger.voicePrompt": "भोजपुरी चाहे हिंदी में बोले खातिर माइक दबाईं (जैसे, 'बसंतपुर से सासाराम एक गो सीट')",
    
    // Driver
    "driver.dashboard": "ड्राइवर कंसोल",
    "driver.startTrip": "यात्रा शुरू करीं",
    "driver.endTrip": "यात्रा खतम करीं",
    "driver.waitlist": "सवारी के लिस्ट",
    "driver.stopList": "गाड़ी रुके के जगह",
    "driver.scanPassenger": "सवारी के कोड स्कैन करीं",
    "driver.chatPilot": "ड्राइवर चैट सिमुलेटर",
    "driver.proximityAlert": "टक्कर रडार",
    "driver.earnings": "कमाई धमाई",
    
    // Mandi
    "mandi.title": "ग्राम मंडी बोर्ड",
    "mandi.cropGrading": "एआई फसल जांच प्रणाली",
    "mandi.snapCrop": "फसल के फोटो खींचीं",
    "mandi.moisture": "नमी के मात्रा",
    "mandi.qualityGrade": "क्वालिटी ग्रेड",
    "mandi.marketPrice": "बाजार भाव के सलाह",
    "mandi.listCrop": "मंडी में माल चढ़ाईं",
    "mandi.gradeA": "ग्रेड ए - सबसे बढ़िया माल",
    "mandi.gradeB": "ग्रेड बी - ठीक-टाक माल",
    "mandi.gradeC": "ग्रेड सी - कमजोर माल",
    
    // Vyapar
    "vyapar.shop": "व्यापार साथी दुकान",
    "vyapar.items": "सामान के लिस्ट",
    "vyapar.addStock": "नया माल जोड़ीं",
    "vyapar.sell": "सामान बेचीं",
    "vyapar.messMenu": "मेस मैनेजर मेनू"
  }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('vl_lang');
    return (saved as Language) || 'EN';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('vl_lang', lang);
  };

  const t = (key: string): string => {
    let translation: any = TRANSLATIONS[language] || TRANSLATIONS['EN'];
    
    if (translation && translation[key]) {
      return translation[key];
    }
    
    let englishTranslation: any = TRANSLATIONS['EN'];
    if (englishTranslation && englishTranslation[key]) {
      return englishTranslation[key];
    }

    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
