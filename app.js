import { store } from './store.js';

// --- 전역 상태 ---
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // 1-indexed
let activeTab = 'calendar';
let selectedDateStr = null;

// --- DOM 요소 참조 ---
const DOM = {
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon'),

  // 내비게이션 탭
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),

  // 캘린더 탭
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
  monthDisplay: document.getElementById('monthDisplay'),
  calendarGrid: document.getElementById('calendarGrid'),
  summaryTotalWage: document.getElementById('summaryTotalWage'),
  summaryTotalTime: document.getElementById('summaryTotalTime'),
  summaryOffCount: document.getElementById('summaryOffCount'),

  // 다이얼로그 모달
  recordDialog: document.getElementById('recordDialog'),
  dialogDateTitle: document.getElementById('dialogDateTitle'),
  recordForm: document.getElementById('recordForm'),
  closeDialogBtn: document.getElementById('closeDialogBtn'),
  deleteRecordBtn: document.getElementById('deleteRecordBtn'),
  dialogWagePreview: document.getElementById('dialogWagePreview'),

  morningStatusSelector: document.getElementById('morningStatusSelector'),
  morningTimePicker: document.getElementById('morningTimePicker'),
  morningStartTime: document.getElementById('morningStartTime'),
  morningEndTime: document.getElementById('morningEndTime'),

  afternoonStatusSelector: document.getElementById('afternoonStatusSelector'),
  afternoonTimePicker: document.getElementById('afternoonTimePicker'),
  afternoonStartTime: document.getElementById('afternoonStartTime'),
  afternoonEndTime: document.getElementById('afternoonEndTime'),

  dailyNote: document.getElementById('dailyNote'),
  quickApplyBtns: document.querySelectorAll('.quick-apply-btn'),

  isHolidayCheckbox: document.getElementById('isHolidayCheckbox'),
  holidayNameContainer: document.getElementById('holidayNameContainer'),
  holidayNameInput: document.getElementById('holidayNameInput'),

  // 정산 설정 탭
  settingsForm: document.getElementById('settingsForm'),
  teacherName: document.getElementById('teacherName'),
  hourlyRate: document.getElementById('hourlyRate'),
  defaultMorningStart: document.getElementById('defaultMorningStart'),
  defaultMorningEnd: document.getElementById('defaultMorningEnd'),
  defaultAfternoonStart: document.getElementById('defaultAfternoonStart'),
  defaultAfternoonEnd: document.getElementById('defaultAfternoonEnd'),
  bankName: document.getElementById('bankName'),
  accountNumber: document.getElementById('accountNumber'),

  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  importFileInput: document.getElementById('importFileInput'),

  // 급여 정산 탭
  transferBox: document.getElementById('transferBox'),
  reportTitle: document.getElementById('reportTitle'),
  reportSubtitle: document.getElementById('reportSubtitle'),
  reportTotalWage: document.getElementById('reportTotalWage'),
  reportSummaryDetails: document.getElementById('reportSummaryDetails'),
  reportAccountInfo: document.getElementById('reportAccountInfo'),
  copyAcctBtn: document.getElementById('copyAcctBtn'),
  reportTableBody: document.getElementById('reportTableBody'),
  printReportBtn: document.getElementById('printReportBtn'),
  sendWageBtn: document.getElementById('sendWageBtn'),
  prevReportMonth: document.getElementById('prevReportMonth'),
  nextReportMonth: document.getElementById('nextReportMonth'),
  reportMonthDisplay: document.getElementById('reportMonthDisplay'),

  // 공통
  toast: document.getElementById('toast')
};

// --- 초기화 ---
let isAppInitialized = false;

function init() {
  const settings = store.getSettings();

  // 테마 초기 설정 (DB 저장하지 않음)
  setTheme(settings.theme || 'dark', false);

  // 캘린더 초기 렌더링
  renderCalendar();

  // 설정 폼 기본값 즉각 바인딩
  loadSettingsToForm();

  if (!isAppInitialized) {
    // 이벤트 바인딩 (1회만)
    bindEvents();

    // 서비스 워커 등록 (PWA 기능 지원)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('서비스 워커 등록 완료:', reg.scope))
        .catch(err => console.log('서비스 워커 등록 실패:', err));
    }
    isAppInitialized = true;
  }
}

// --- 테마 스위칭 ---
function setTheme(theme, save = true) {
  if (document.body.getAttribute('data-theme') !== theme) {
    document.body.setAttribute('data-theme', theme);
  }

  if (save) {
    const settings = store.getSettings();
    if (settings.theme !== theme) {
      store.saveSettings({ ...settings, theme });
    }
  }

  if (theme === 'light') {
    DOM.themeIcon.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;
  } else {
    DOM.themeIcon.innerHTML = `
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
    `;
  }
}

// --- 토스트 알림 ---
function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.add('show');
  setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 2000);
}

// --- 탭 전환 ---
function switchTab(tabId) {
  activeTab = tabId;
  DOM.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  DOM.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });

  if (tabId === 'calendar') {
    renderCalendar();
  } else if (tabId === 'report') {
    renderReport();
  } else if (tabId === 'settings') {
    loadSettingsToForm();
  }
}

// --- 캘린더 렌더링 엔진 ---
function renderCalendar() {
  DOM.monthDisplay.textContent = `${currentYear}년 ${String(currentMonth).padStart(2, '0')}월`;

  // 이번 달의 첫째 날과 마지막 날 계산
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 일요일: 0, 월요일: 1...
  const lastDate = new Date(currentYear, currentMonth, 0).getDate();
  const prevMonthLastDate = new Date(currentYear, currentMonth - 1, 0).getDate();

  DOM.calendarGrid.innerHTML = '';

  // 요일 헤더 추가
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  daysOfWeek.forEach(day => {
    const label = document.createElement('div');
    label.className = 'calendar-day-label';
    label.textContent = day;
    DOM.calendarGrid.appendChild(label);
  });

  // 이전 달의 잔여 날짜 셀 추가 (비활성화 상태)
  for (let i = firstDayIndex; i > 0; i--) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell other-month';
    const dayNum = prevMonthLastDate - i + 1;
    cell.innerHTML = `<span class="day-number">${dayNum}</span>`;
    DOM.calendarGrid.appendChild(cell);
  }

  const records = store.getRecordsForMonth(currentYear, currentMonth);
  const settings = store.getSettings();

  // 통계 계산용 변수
  let totalWage = 0;
  let totalHours = 0;
  let totalWorkDays = 0;
  let vacationCount = 0;
  let parentDirectCount = 0;

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  // 이번 달 날짜 셀 생성
  for (let day = 1; day <= lastDate; day++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = records[dateStr];
    const isHoliday = store.isHoliday(dateStr);
    const holidayName = store.getHolidayName(dateStr);

    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (dateStr === todayStr) {
      cell.classList.add('today');
    }
    if (isHoliday) {
      cell.classList.add('holiday-cell');
    }

    let cellContent = '';

    // 1. 헤더 (날짜 및 공휴일)
    let headerContent = `<span class="day-number">${day}</span>`;
    if (isHoliday) {
      headerContent = `
        <span class="day-number" style="color: #ef4444;">${day}</span>
        <span class="holiday-name" title="${holidayName}">${holidayName}</span>
      `;
    }
    cellContent += `<div class="cell-header">${headerContent}</div>`;

    // 2. 바디 (메모 + 급여) - 배치 순서: 메모가 상단, 급여가 중간
    let bodyContent = '';
    if (record) {
      // 일당 및 통계 합산
      const { totalHours: dayHours, wage: dayWage } = store.calculateDailyWage(record, settings.hourlyRate, settings);
      totalWage += dayWage;
      totalHours += dayHours;

      if (dayHours > 0) {
        totalWorkDays++;
      }

      // 상태 통계 누적
      if (record.morning.status === 'teacher_vacation') vacationCount++;
      if (record.afternoon.status === 'teacher_vacation') vacationCount++;
      if (record.morning.status === 'parent_direct') parentDirectCount++;
      if (record.afternoon.status === 'parent_direct') parentDirectCount++;

      // [메모 상단 배치]
      if (record.note) {
        bodyContent += `<span class="day-note-badge" title="${record.note}">📝 ${record.note}</span>`;
      }

      // [급여 중간 배치]
      if (dayWage > 0) {
        bodyContent += `<span class="day-wage-badge">${dayWage.toLocaleString()}원</span>`;
      }
    }
    cellContent += `<div class="cell-body">${bodyContent}</div>`;

    // 3. 푸터 (근무 형태 동그라미 항상 맨 아래)
    let footerContent = '';
    if (record) {
      footerContent = `
        <div class="commute-dots">
          <div class="dot ${record.morning.status}" title="등원: ${getStatusLabel(record.morning.status)}"></div>
          <div class="dot ${record.afternoon.status}" title="하원: ${getStatusLabel(record.afternoon.status)}"></div>
        </div>
      `;
    } else {
      const dayOfWeek = new Date(currentYear, currentMonth - 1, day).getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      if (isHoliday) {
        footerContent = `
          <div class="commute-dots">
            <div class="dot holiday_off" title="공휴일 휴무"></div>
            <div class="dot holiday_off" title="공휴일 휴무"></div>
          </div>
        `;
      } else if (!isWeekend) {
        footerContent = `
          <div class="commute-dots">
            <div class="dot" title="기록 없음"></div>
            <div class="dot" title="기록 없음"></div>
          </div>
        `;
      } else {
        // 주말에는 도트를 아예 안 보여주므로 보이지 않는 투명 도트 컨테이너를 채워 높이를 맞춤
        footerContent = `
          <div class="commute-dots" style="visibility: hidden;">
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        `;
      }
    }
    cellContent += `<div class="cell-footer">${footerContent}</div>`;

    cell.innerHTML = cellContent;
    cell.addEventListener('click', () => openRecordDialog(dateStr));
    DOM.calendarGrid.appendChild(cell);
  }

  // 다음 달의 잔여 날짜 셀 추가해 캘린더 그리드 높이 균일화
  const totalCells = DOM.calendarGrid.children.length - 7; // 요일 라벨 제외
  const nextMonthCellsNeeded = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= nextMonthCellsNeeded; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell other-month';
    cell.innerHTML = `<span class="day-number">${i}</span>`;
    DOM.calendarGrid.appendChild(cell);
  }

  // 상단 현황판 대시보드 갱신
  DOM.summaryTotalWage.textContent = `${totalWage.toLocaleString()}원`;
  DOM.summaryTotalTime.textContent = `${totalWorkDays}일 / ${totalHours.toFixed(1)}시간`;
  DOM.summaryOffCount.textContent = `휴가 ${vacationCount}회 / 직접 ${parentDirectCount}회`;
}

function getStatusLabel(status) {
  switch (status) {
    case 'worked': return '근무';
    case 'parent_direct': return '부모 직접';
    case 'teacher_vacation': return '휴가';
    case 'holiday_off': return '공휴일 휴무';
    default: return '기록 없음';
  }
}

// --- 다이얼로그 모달 처리 ---
function openRecordDialog(dateStr) {
  selectedDateStr = dateStr;

  const record = store.getRecord(dateStr);
  const settings = store.getSettings();
  const isHoliday = store.isHoliday(dateStr);
  const holidayName = store.getHolidayName(dateStr);

  if (isHoliday) {
    DOM.dialogDateTitle.textContent = `${dateStr} 근무 상세 (${holidayName})`;
  } else {
    DOM.dialogDateTitle.textContent = `${dateStr} 근무 상세`;
  }

  if (record) {
    // 기존 데이터 로딩
    setFormStatus('morning', record.morning.status);
    DOM.morningStartTime.value = record.morning.startTime || settings.defaultMorningStart;
    DOM.morningEndTime.value = record.morning.endTime || settings.defaultMorningEnd;

    setFormStatus('afternoon', record.afternoon.status);
    DOM.afternoonStartTime.value = record.afternoon.startTime || settings.defaultAfternoonStart;
    DOM.afternoonEndTime.value = record.afternoon.endTime || settings.defaultAfternoonEnd;

    DOM.dailyNote.value = record.note || '';
    DOM.isHolidayCheckbox.checked = !!record.isHoliday;
    DOM.holidayNameInput.value = record.holidayName || '';
    DOM.holidayNameContainer.style.display = record.isHoliday ? 'block' : 'none';

    DOM.deleteRecordBtn.style.display = 'block';
  } else {
    // 기본 데이터 세팅
    setFormStatus('morning', 'worked');
    DOM.morningStartTime.value = settings.defaultMorningStart;
    DOM.morningEndTime.value = settings.defaultMorningEnd;

    setFormStatus('afternoon', 'worked');
    DOM.afternoonStartTime.value = settings.defaultAfternoonStart;
    DOM.afternoonEndTime.value = settings.defaultAfternoonEnd;

    DOM.dailyNote.value = '';
    DOM.isHolidayCheckbox.checked = false;
    DOM.holidayNameInput.value = '';
    DOM.holidayNameContainer.style.display = 'none';

    DOM.deleteRecordBtn.style.display = 'none';
  }

  updateDialogWagePreview();
  DOM.recordDialog.showModal();
}

function setFormStatus(type, status) {
  const container = type === 'morning' ? DOM.morningStatusSelector : DOM.afternoonStatusSelector;
  const picker = type === 'morning' ? DOM.morningTimePicker : DOM.afternoonTimePicker;

  container.querySelectorAll('.status-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });

  // 정상 근무일 때만 시간 선택기 활성화
  picker.classList.toggle('disabled', status !== 'worked');
}

function updateDialogWagePreview() {
  const record = getRecordFromForm();
  const settings = store.getSettings();
  const { wage } = store.calculateDailyWage(record, settings.hourlyRate, settings);
  DOM.dialogWagePreview.textContent = `${wage.toLocaleString()}원`;
}

function getRecordFromForm() {
  const morningStatus = DOM.morningStatusSelector.querySelector('.status-btn.active').dataset.status;
  const afternoonStatus = DOM.afternoonStatusSelector.querySelector('.status-btn.active').dataset.status;

  return {
    morning: {
      status: morningStatus,
      startTime: DOM.morningStartTime.value,
      endTime: DOM.morningEndTime.value
    },
    afternoon: {
      status: afternoonStatus,
      startTime: DOM.afternoonStartTime.value,
      endTime: DOM.afternoonEndTime.value
    },
    note: DOM.dailyNote.value,
    isHoliday: DOM.isHolidayCheckbox.checked,
    holidayName: DOM.holidayNameInput.value
  };
}

// --- 설정 폼 바인딩 ---
function loadSettingsToForm() {
  const settings = store.getSettings();
  DOM.teacherName.value = settings.teacherName;
  DOM.hourlyRate.value = settings.hourlyRate;
  DOM.defaultMorningStart.value = settings.defaultMorningStart;
  DOM.defaultMorningEnd.value = settings.defaultMorningEnd;
  DOM.defaultAfternoonStart.value = settings.defaultAfternoonStart;
  DOM.defaultAfternoonEnd.value = settings.defaultAfternoonEnd;
  DOM.bankName.value = settings.bankName;
  DOM.accountNumber.value = settings.accountNumber;
}

// --- 급여 정산서 렌더링 (명세서 탭) ---
function renderReport() {
  const settings = store.getSettings();
  DOM.reportMonthDisplay.textContent = `${currentYear}년 ${String(currentMonth).padStart(2, '0')}월`;
  DOM.reportTitle.textContent = `${currentMonth}월 급여 명세서`;
  DOM.reportSubtitle.textContent = `선생님: ${settings.teacherName}`;

  if (settings.bankName && settings.accountNumber) {
    DOM.reportAccountInfo.textContent = `${settings.teacherName} ${settings.bankName} ${settings.accountNumber}`;
    DOM.transferBox.style.display = 'flex';
  } else {
    DOM.transferBox.style.display = 'none';
  }

  const records = store.getRecordsForMonth(currentYear, currentMonth);

  let totalWage = 0;
  let totalHours = 0;

  DOM.reportTableBody.innerHTML = '';

  // 날짜 정렬 후 테이블 렌더링
  const sortedDates = Object.keys(records).sort();

  if (sortedDates.length === 0) {
    DOM.reportTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding: 30px; color: var(--text-muted);">
          기록된 근무 내역이 없습니다.<br>근무 기록 탭에서 근무를 등록해 주세요.
        </td>
      </tr>
    `;
  } else {
    sortedDates.forEach(dateStr => {
      const record = records[dateStr];
      const { totalHours: dayHours, wage: dayWage } = store.calculateDailyWage(record, settings.hourlyRate, settings);

      totalWage += dayWage;
      totalHours += dayHours;

      const dayNum = dateStr.split('-')[2];
      const dayOfWeekNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dayOfWeek = dayOfWeekNames[new Date(currentYear, currentMonth - 1, Number(dayNum)).getDay()];
      const isWeekend = (dayOfWeek === '토' || dayOfWeek === '일');

      // 구분 표시 텍스트 조립
      const getStatusText = (status, hours) => {
        if (status === 'worked') return `근무(${hours}h)`;
        if (status === 'parent_direct') return `부모`;
        if (status === 'teacher_vacation') return `휴가`;
        if (status === 'holiday_off') return `휴일`;
        return `-`;
      };

      const morningText = getStatusText(record.morning.status, record.morning.hours);
      const afternoonText = getStatusText(record.afternoon.status, record.afternoon.hours);
      const statusDesc = `등원:${morningText} / 하원:${afternoonText}`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dayNum}일<span style="font-size:0.75rem; color:${isWeekend ? '#ef4444' : 'var(--text-muted)'}; margin-left:2px;">(${dayOfWeek})</span></td>
        <td style="line-height: 1.25;">
          <span style="font-size:0.75rem; letter-spacing:-0.5px;">${statusDesc}</span>
          ${record.note ? `<div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px; line-height:1.1;">↳ ${record.note}</div>` : ''}
        </td>
        <td style="text-align: center;">${dayHours > 0 ? dayHours : '-'}</td>
        <td class="text-right">${dayWage > 0 ? dayWage.toLocaleString() : '-'}</td>
      `;
      DOM.reportTableBody.appendChild(tr);
    });
  }

  DOM.reportTotalWage.textContent = `${totalWage.toLocaleString()}원`;
  DOM.reportSummaryDetails.textContent = `총 근무 ${totalHours.toFixed(1)}시간 (시급 ${Number(settings.hourlyRate).toLocaleString()}원 적용)`;
}

// --- 이벤트 리스너 바인딩 ---
function bindEvents() {
  // 테마 토글
  DOM.themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  });

  // 탭 변경
  DOM.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 이전달/다음달 이동
  DOM.prevMonth.onclick = () => {
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    renderCalendar();
  };

  DOM.nextMonth.onclick = () => {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    renderCalendar();
  };

  // 정산서 탭 이전달/다음달 이동
  DOM.prevReportMonth.onclick = () => {
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    renderReport();
  };

  DOM.nextReportMonth.onclick = () => {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    renderReport();
  };

  // 하루 일괄 지정 퀵 버튼 이벤트
  DOM.quickApplyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;
      setFormStatus('morning', status);
      setFormStatus('afternoon', status);
      updateDialogWagePreview();

      // 공휴일 이외의 상태 선택 시 공휴일 체크 해제
      if (status !== 'holiday_off') {
        DOM.isHolidayCheckbox.checked = false;
        DOM.holidayNameContainer.style.display = 'none';
      }
    });
  });

  // 모달 닫기
  DOM.closeDialogBtn.addEventListener('click', () => DOM.recordDialog.close());

  // 모달 오전/오후 상태 변경 이벤트
  DOM.morningStatusSelector.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setFormStatus('morning', btn.dataset.status);
      updateDialogWagePreview();

      if (btn.dataset.status !== 'holiday_off') {
        DOM.isHolidayCheckbox.checked = false;
        DOM.holidayNameContainer.style.display = 'none';
      }
    });
  });

  DOM.afternoonStatusSelector.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setFormStatus('afternoon', btn.dataset.status);
      updateDialogWagePreview();

      if (btn.dataset.status !== 'holiday_off') {
        DOM.isHolidayCheckbox.checked = false;
        DOM.holidayNameContainer.style.display = 'none';
      }
    });
  });

  // 공휴일 체크박스 이벤트
  DOM.isHolidayCheckbox.addEventListener('change', (e) => {
    DOM.holidayNameContainer.style.display = e.target.checked ? 'block' : 'none';
    if (e.target.checked) {
      // 편의를 위해 공휴일 체크 시 오전/오후 모두 공휴일 휴무로 자동 설정 (사용자가 변경 가능)
      setFormStatus('morning', 'holiday_off');
      setFormStatus('afternoon', 'holiday_off');
      updateDialogWagePreview();
    }
  });

  // 모달 시간 변경 실시간 금액 갱신
  [DOM.morningStartTime, DOM.morningEndTime, DOM.afternoonStartTime, DOM.afternoonEndTime].forEach(input => {
    input.addEventListener('change', updateDialogWagePreview);
  });

  // 근무 기록 저장
  DOM.recordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const record = getRecordFromForm();
    const settings = store.getSettings();

    // 계산 계산된 값을 포함하여 최종 저장
    const { totalHours, wage } = store.calculateDailyWage(record, settings.hourlyRate, settings);
    record.dailyTotalHours = totalHours;
    record.dailyWage = wage;
    record.appliedHourlyRate = settings.hourlyRate; // 당시 적용 시급 이력 보존

    store.saveRecord(selectedDateStr, record);
    DOM.recordDialog.close();
    renderCalendar();
    showToast('저장되었습니다.');
  });

  // 근무 기록 삭제
  DOM.deleteRecordBtn.addEventListener('click', () => {
    if (confirm('해당 날짜의 기록을 삭제하시겠습니까?')) {
      store.deleteRecord(selectedDateStr);
      DOM.recordDialog.close();
      renderCalendar();
      showToast('삭제되었습니다.');
    }
  });

  // 설정 폼 저장
  DOM.settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rate = Number(DOM.hourlyRate.value);

    if (isNaN(rate) || rate <= 0) {
      alert('올바른 시급을 입력해 주세요. (예: 13000)');
      return;
    }

    const data = {
      teacherName: DOM.teacherName.value,
      hourlyRate: rate,
      defaultMorningStart: DOM.defaultMorningStart.value,
      defaultMorningEnd: DOM.defaultMorningEnd.value,
      defaultAfternoonStart: DOM.defaultAfternoonStart.value,
      defaultAfternoonEnd: DOM.defaultAfternoonEnd.value,
      bankName: DOM.bankName.value,
      accountNumber: DOM.accountNumber.value
    };

    store.saveSettings(data);
    showToast('기본 설정이 저장되었습니다.');
  });

  // 계좌 정보 복사
  DOM.copyAcctBtn.addEventListener('click', () => {
    const settings = store.getSettings();
    const records = store.getRecordsForMonth(currentYear, currentMonth);
    let totalWage = 0;

    Object.keys(records).forEach(dateStr => {
      const record = records[dateStr];
      const { wage } = store.calculateDailyWage(record, settings.hourlyRate, settings);
      totalWage += wage;
    });

    // 은행 앱이 클립보드에서 자동 이체 팝업을 띄울 수 있도록 선생님 이름, 은행, 계좌번호 나열
    const textToCopy = `${settings.teacherName} ${settings.bankName} ${settings.accountNumber}\n금액: ${totalWage.toLocaleString()}원`;

    copyTextToClipboard(textToCopy)
      .then(() => showToast('송금 정보가 복사되었습니다.'))
      .catch(err => alert('복사에 실패했습니다: ' + err));
  });

  DOM.printReportBtn.addEventListener('click', () => {
    showToast('PDF 생성을 시작합니다. 잠시만 기다려주세요...');

    // PDF 가독성을 위해 임시로 라이트 모드 적용
    const originalTheme = document.body.getAttribute('data-theme');
    setTheme('light', false);

    // 테이블 가로 잘림 방지를 위해 임시로 스크롤(overflow) 해제
    const tableContainer = document.querySelector('.report-table-container');
    const oldOverflow = tableContainer ? tableContainer.style.overflowX : '';
    if (tableContainer) tableContainer.style.overflowX = 'visible';

    // CSS 변경사항이 화면에 반영될 수 있도록 딜레이 증가
    setTimeout(() => {
      if (window.html2pdf) {
        const element = document.getElementById('invoice-print-area');
        const settings = store.getSettings();
        const fileName = `${settings.teacherName || '선생님'}_급여명세서_${currentYear}년_${currentMonth}월.pdf`;

        const opt = {
          margin: [10, 1, 10, 1], // 상, 좌, 하, 우 여백 (mm)
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: 800, // 데스크탑 해상도 기준 캡처
            scrollY: 0
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: 'css', avoid: 'tr' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
          showToast('PDF 다운로드가 완료되었습니다.');
        }).catch(err => {
          showToast('PDF 생성 중 오류가 발생했습니다.');
          console.error(err);
        }).finally(() => {
          // 프린트용 스타일 복구 및 원래 테마로 복귀
          if (tableContainer) tableContainer.style.overflowX = oldOverflow;
          setTheme(originalTheme, false);
        });
      } else {
        window.print();
        if (tableContainer) tableContainer.style.overflowX = oldOverflow;
        setTheme(originalTheme, false);
      }
    }, 300);
  });

  // 급여 송금하기 (토스/카카오페이 URL 연동 안내)
  DOM.sendWageBtn.addEventListener('click', () => {
    const settings = store.getSettings();
    const records = store.getRecordsForMonth(currentYear, currentMonth);
    let totalWage = 0;

    Object.keys(records).forEach(dateStr => {
      const record = records[dateStr];
      const { wage } = store.calculateDailyWage(record, settings.hourlyRate, settings);
      totalWage += wage;
    });

    if (totalWage <= 0) {
      alert('송금할 금액이 없습니다.');
      return;
    }

    // 모바일 기기 감지
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // 토스 송금 링크 URL 스키마 지원
      // 토스 스키마 규격: supertoss://send?bank=${은행}&account=${계좌번호}&amount=${금액}
      const bankMap = {
        '신한은행': '신한', '국민은행': '국민', '우리은행': '우리', '하나은행': '하나',
        '농협은행': '농협', '기업은행': '기업', '카카오뱅크': '카카오뱅크', '토스뱅크': '토스뱅크'
      };
      const shortBank = bankMap[settings.bankName] || settings.bankName;
      const tossUrl = `supertoss://send?bank=${encodeURIComponent(shortBank)}&account=${encodeURIComponent(settings.accountNumber)}&amount=${totalWage}`;

      const confirmSend = confirm(`토스 앱으로 이동하여 ${totalWage.toLocaleString()}원을 송금하시겠습니까?\n\n송금정보: ${settings.bankName} ${settings.accountNumber}`);
      if (confirmSend) {
        window.location.href = tossUrl;
      }
    } else {
      // 데스크톱인 경우 송금 정보 복사로 유도
      DOM.copyAcctBtn.click();
      alert(`송금 정보가 클립보드에 복사되었습니다.\n\n계좌: ${settings.bankName} ${settings.accountNumber}\n금액: ${totalWage.toLocaleString()}원\n\n은행 앱에서 복사한 정보를 붙여넣어 송금해 주세요.`);
    }
  });

  // 백업 내보내기
  DOM.exportBtn.addEventListener('click', () => {
    const dataStr = store.exportData();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `commute_pay_backup_${currentYear}_${currentMonth}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('데이터 백업 파일이 다운로드되었습니다.');
  });

  // 백업 불러오기 트리거
  DOM.importBtn.addEventListener('click', () => {
    DOM.importFileInput.click();
  });

  DOM.importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = store.importData(event.target.result);
      if (result) {
        showToast('데이터가 성공적으로 복원되었습니다.');
        renderCalendar();
        if (activeTab === 'settings') loadSettingsToForm();
      } else {
        alert('데이터 복원에 실패했습니다. 올바른 JSON 백업 파일인지 확인해 주세요.');
      }
    };
    reader.readAsText(file);
  });
}

// 클립보드 복사 헬퍼 함수 (Secure Context가 아닌 모바일 HTTP 환경 대응 폴백 포함)
function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        resolve();
      } else {
        reject(new Error("복사 명령이 거부되었습니다."));
      }
    } catch (err) {
      reject(err);
    }
  });
}

// 앱 실행 및 Auth 초기화
document.addEventListener('DOMContentLoaded', () => {
  const loginOverlay = document.getElementById('loginOverlay');
  const appContainer = document.getElementById('appContainer');
  const googleLoginBtn = document.getElementById('googleLoginBtn');

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      store.login();
    });
  }

  store.onAuthStateChanged((user) => {
    if (user) {
      if (loginOverlay) loginOverlay.style.display = 'none';
      if (appContainer) appContainer.style.display = 'block';
    } else {
      if (loginOverlay) loginOverlay.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
    }
  });

  window.addEventListener('storeUpdated', () => {
    if (!window._appInitialized) {
      init();
      window._appInitialized = true;
    } else {
      renderCalendar();
      if (activeTab === 'report') renderReport();
      if (activeTab === 'settings') loadSettingsToForm();
    }
  });
});
