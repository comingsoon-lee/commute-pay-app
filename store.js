// 데이터 저장 및 비즈니스 로직 관리 모듈 (Firebase 연동)

import { firebaseConfig } from './config.js';

if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

const DEFAULT_SETTINGS = {
  teacherName: '김OO 선생님',
  hourlyRate: 13000,
  defaultMorningStart: '07:00',
  defaultMorningEnd: '09:00',
  defaultAfternoonStart: '17:30',
  defaultAfternoonEnd: '19:30',
  paydayType: 'last_workday',
  bankName: '신한은행',
  accountNumber: '',
  publicDataApiKey: '',
  theme: 'dark'
};

export const store = {
  data: {
    settings: { ...DEFAULT_SETTINGS },
    records: {}
  },
  
  // Auth logic
  login() {
    auth.signInWithPopup(provider).catch(err => alert(err.message));
  },
  
  logout() {
    auth.signOut();
  },
  
  onAuthStateChanged(callback) {
    auth.onAuthStateChanged(user => {
      if (user) {
        this.startSync(() => {
          callback(user);
        });
      } else {
        this.stopSync();
        callback(null);
      }
    });
  },

  unsubSettings: null,
  unsubRecords: null,

  startSync(onReady) {
    this.stopSync();
    let settingsLoaded = false;
    let recordsLoaded = false;
    
    const checkReady = () => {
      if (settingsLoaded && recordsLoaded && onReady) {
        onReady();
        onReady = null; 
      }
      if (settingsLoaded && recordsLoaded) {
        window.dispatchEvent(new Event('storeUpdated'));
      }
    };

    this.unsubSettings = db.collection('appData').doc('settings').onSnapshot(doc => {
      if (doc.exists) {
        this.data.settings = { ...DEFAULT_SETTINGS, ...doc.data() };
        // auto heal hourlyRate
        const rate = Number(this.data.settings.hourlyRate);
        if (isNaN(rate) || rate <= 0) {
          this.data.settings.hourlyRate = DEFAULT_SETTINGS.hourlyRate;
        }
      } else {
        this.data.settings = { ...DEFAULT_SETTINGS };
      }
      settingsLoaded = true;
      checkReady();
    }, err => {
      console.error("Settings sync error", err);
      if (err.code === 'permission-denied') {
        alert("데이터베이스 접근 권한이 없습니다. 파이어베이스 콘솔에서 '보안 규칙(Rules)'을 설정해주세요.");
      }
      settingsLoaded = true;
      checkReady();
    });

    this.unsubRecords = db.collection('records').onSnapshot(snapshot => {
      this.data.records = {};
      snapshot.forEach(doc => {
        this.data.records[doc.id] = doc.data();
      });
      recordsLoaded = true;
      checkReady();
    }, err => {
      console.error("Records sync error", err);
      if (err.code === 'permission-denied') {
        alert("데이터베이스 접근 권한이 없습니다. 관리자에게 문의하세요.");
        this.logout();
      }
      recordsLoaded = true;
      checkReady();
    });
  },

  stopSync() {
    if (this.unsubSettings) this.unsubSettings();
    if (this.unsubRecords) this.unsubRecords();
    this.data.records = {};
  },

  getSettings() {
    return this.data.settings;
  },

  saveSettings(settings) {
    const updated = { ...this.data.settings, ...settings };
    db.collection('appData').doc('settings').set(updated, { merge: true });
    return updated;
  },

  getAllRecords() {
    return this.data.records;
  },

  getRecordsForMonth(year, month) {
    const records = this.getAllRecords();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const result = {};
    for (const [dateStr, record] of Object.entries(records)) {
      if (dateStr.startsWith(prefix)) {
        result[dateStr] = record;
      }
    }
    return result;
  },

  getRecord(dateStr) {
    return this.getAllRecords()[dateStr] || null;
  },

  saveRecord(dateStr, recordData) {
    db.collection('records').doc(dateStr).set(recordData);
  },

  deleteRecord(dateStr) {
    db.collection('records').doc(dateStr).delete();
  },

  isHoliday(dateStr) {
    const record = this.getRecord(dateStr);
    return record && record.isHoliday ? true : false;
  },

  getHolidayName(dateStr) {
    const record = this.getRecord(dateStr);
    return record && record.holidayName ? record.holidayName : '';
  },

  calculateHours(startTimeStr, endTimeStr) {
    if (!startTimeStr || !endTimeStr) return 0;
    
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);
    
    let totalMins = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMins < 0) totalMins += 24 * 60; // 다음날로 넘어가는 경우
    
    // 분 단위를 10진수 시간 단위로 변환 (예: 30분 -> 0.5시간)
    return Math.round((totalMins / 60) * 100) / 100;
  },

  calculateDailyWage(record, hourlyRate, settings) {
    if (!record || !record.morning || !record.afternoon) {
      return { totalHours: 0, wage: 0 };
    }

    const activeSettings = settings || this.getSettings();
    const rate = Number(record.appliedHourlyRate) || Number(hourlyRate) || Number(activeSettings.hourlyRate) || 13000;
    
    let morningHours = 0;
    let afternoonHours = 0;

    if (record.morning.status === 'worked') {
      const startTime = record.morning.startTime || activeSettings.defaultMorningStart || '07:00';
      const endTime = record.morning.endTime || activeSettings.defaultMorningEnd || '09:00';
      morningHours = this.calculateHours(startTime, endTime);
      record.morning.hours = morningHours;
    } else {
      record.morning.hours = 0;
    }

    if (record.afternoon.status === 'worked') {
      const startTime = record.afternoon.startTime || activeSettings.defaultAfternoonStart || '17:30';
      const endTime = record.afternoon.endTime || activeSettings.defaultAfternoonEnd || '19:30';
      afternoonHours = this.calculateHours(startTime, endTime);
      record.afternoon.hours = afternoonHours;
    } else {
      record.afternoon.hours = 0;
    }

    const totalHours = morningHours + afternoonHours;
    const wage = Math.round(totalHours * rate);

    return {
      totalHours,
      wage
    };
  },

  exportData() {
    const data = {
      settings: this.getSettings(),
      records: this.getAllRecords()
    };
    return JSON.stringify(data, null, 2);
  },

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      if (data.records) {
        for(const [dateStr, record] of Object.entries(data.records)) {
          this.saveRecord(dateStr, record);
        }
      }
      return true;
    } catch (e) {
      console.error('데이터 복구 실패:', e);
      return false;
    }
  }
};
