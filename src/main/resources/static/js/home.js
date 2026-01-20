/**
 * 初始化首頁的 Toast 通知
 * @param {string} successMsg 成功訊息
 * @param {string} errorMsg 錯誤訊息
 */
function initHomeToasts(successMsg, errorMsg) {
    document.addEventListener('DOMContentLoaded', function () {
        const showToast = (id) => {
            const el = document.getElementById(id);
            if (el) {
                const toast = new bootstrap.Toast(el);
                toast.show();
            }
        };

        // 根據訊息是否存在來決定是否顯示
        if (successMsg && successMsg.trim() !== "") {
            showToast('successToast');
        }
        if (errorMsg && errorMsg.trim() !== "") {
            showToast('errorToast');
        }
    });
}