/* global flatpickr */
/**
* 初始化預約表單邏輯
* @param {string[]} disableDates 不可選取的日期清單
*/
function initReservationForm(disableDates) {
    const startSelect = document.getElementById('startTime');
    const endTimeHidden = document.getElementById('endTime');
    const titleSelect = document.getElementById('title');
    const reservationDateInput = document.getElementById('reservationDate');

    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(today.getMonth() + 3);
    const maxDate = threeMonthsLater.toISOString().split('T')[0];

    /**
     * 統一向後端請求可用時段
     */
    function updateAvailableSlots() {
        const dateStr = reservationDateInput.value;
        const selectedOption = titleSelect.options[titleSelect.selectedIndex];

        if (!dateStr || !selectedOption?.dataset?.duration) {
            return;
        }

        const duration = selectedOption.dataset.duration;

        fetch(`/reservation/slots?date=${dateStr}&duration=${duration}`)
            .then(response => response.json())
            .then(slots => {
                startSelect.innerHTML = '<option value="" disabled selected>請選擇時段...</option>';
                if (slots && slots.length > 0) {
                    /** @var { {time:string, available:boolean} } slot */
                    for (const slot of slots) {
                        const option = document.createElement('option');
                        option.value = slot.time;
                        option.textContent = slot.available ? slot.time : `${slot.time} (時段不足或已被預約)`;
                        if (!slot.available) {
                            option.disabled = true;
                        }
                        startSelect.appendChild(option);
                    }
                    startSelect.disabled = false;
                    startSelect.classList.remove('bg-light');
                } else {
                    startSelect.innerHTML = '<option value="" disabled selected>該日無可用時段</option>';
                    startSelect.disabled = true;
                    startSelect.classList.add('bg-light');
                }
                calculateEndTime();
            })
            .catch(error => {
                console.error('Error fetching slots:', error);
                startSelect.innerHTML = '<option value="" disabled selected>載入失敗</option>';
            });
    }

    /**
     * 自動計算結束時間
     */
    function calculateEndTime() {
        const selectedOption = titleSelect.options[titleSelect.selectedIndex];
        const startTime = startSelect.value;

        if (selectedOption?.dataset?.duration && startTime) {
            const duration = Number.parseInt(selectedOption.dataset.duration, 10);
            const [hours, minutes] = startTime.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes + duration, 0);
            const endHours = String(date.getHours()).padStart(2, '0');
            const endMinutes = String(date.getMinutes()).padStart(2, '0');
            endTimeHidden.value = `${endHours}:${endMinutes}`;
        } else {
            endTimeHidden.value = "";
        }
    }

    // 初始化 Flatpickr
    flatpickr("#reservationDate", {
        locale: "zh_tw",
        dateFormat: "Y-m-d",
        minDate: minDate,
        maxDate: maxDate,
        disable: disableDates,
        disableMobile: "true",
        "onChange": (_, dateStr) => {
            if (dateStr) {
                updateAvailableSlots();
            } else {
                startSelect.disabled = true;
                startSelect.innerHTML = '<option value="" disabled selected>請先選擇日期..</option>';
                startSelect.classList.add('bg-light');
                endTimeHidden.value = "";
            }
        }
    });

    // 監聽事件
    titleSelect.addEventListener('change', updateAvailableSlots);
    startSelect.addEventListener('change', calculateEndTime);
}